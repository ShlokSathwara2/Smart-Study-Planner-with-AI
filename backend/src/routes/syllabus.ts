import { Router } from 'express';
import multer from 'multer';
const pdfParse = require('pdf-parse');
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import * as mammoth from 'mammoth';
import { SyllabusModel } from '../models/Syllabus';
import { batchEmbedTopics } from '../utils/vectorService';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; isScanned: boolean }> {
  const data = await pdfParse(buffer as any);
  const text = (data.text || '').trim();
  const isScanned = text.length < 200; // heuristic: very low text suggests scanned
  return { text, isScanned };
}

async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).grayscale().normalize().sharpen().toBuffer();
}

async function ocrImage(buffer: Buffer): Promise<string> {
  const worker = await createWorker('eng+hin+tam');
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || '').trim();
}

async function analyzeWithClaude(rawText: string, grade: string, rawBookText?: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: simple heuristic without external API
    return {
      topics: [],
      chapters: [],
      units: [],
      difficulty: 'medium',
      estimatedHours: 0,
    };
  }

  const systemPrompt = `You analyze academic syllabi and return a concise JSON structure.
The user is in grade/level: ${grade}. Please adapt the estimatedHours and difficulty based on their level.
Always extract 'chapters' containing the chapter title and 'pages' (number of pages).
If a reference book is provided, use its concepts to refine topics.
Respond with JSON only matching this schema:
{
  "topics": ["concept 1", "concept 2"],
  "chapters": [{"title": "Chapter 1 Name", "pages": 20}],
  "units": ["Unit 1 Name"],
  "difficulty": "easy" | "medium" | "hard",
  "estimatedHours": number
}`;

  let userContent = `Here is the syllabus or study plan.\n\n${rawText.slice(0, 20000)}`;
  if (rawBookText) {
    userContent += `\n\nAdditionally, here is an excerpt from the reference book:\n${rawBookText.slice(0, 30000)}`;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userContent }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text ?? '';

  try {
    return JSON.parse(content);
  } catch {
    return {
      topics: [],
      chapters: [],
      units: [],
      difficulty: 'medium',
      estimatedHours: 0,
    };
  }
}

router.post(
  '/upload',
  upload.fields([{ name: 'syllabus', maxCount: 1 }, { name: 'referenceBook', maxCount: 1 }]),
  async (req, res): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const file = files?.['syllabus']?.[0];
      const referenceBook = files?.['referenceBook']?.[0];
      
      const userId = (req.body.userId as string) || 'anonymous';
      const grade = (req.body.grade as string) || 'Unknown';
      const manualSyllabusRaw = req.body.manualSyllabus as string;

      let rawText = '';
      let mime = 'text/plain';
      let originalFilename = 'manual_entry.txt';

      if (manualSyllabusRaw) {
        // Manual entry mode
        const parsedChapters = JSON.parse(manualSyllabusRaw);
        rawText = parsedChapters.map((c: any) => `Chapter: ${c.title} (Pages: ${c.pages})`).join('\n');
      } else if (file) {
        // File upload mode
        mime = file.mimetype;
        originalFilename = file.originalname;
        const buffer = file.buffer;

        if (mime === 'application/pdf') {
          const { text, isScanned } = await extractTextFromPdf(buffer);
          if (!isScanned && text) {
            rawText = text;
          } else {
            const preprocessed = await preprocessImage(buffer);
            rawText = await ocrImage(preprocessed);
          }
        } else if (
          mime.startsWith('image/') ||
          ['image/png', 'image/jpeg', 'image/jpg'].includes(mime)
        ) {
          const preprocessed = await preprocessImage(buffer);
          rawText = await ocrImage(preprocessed);
        } else if (
          mime ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          mime === 'application/msword'
        ) {
          rawText = await extractDocx(buffer);
        } else {
          res.status(400).json({ error: `Unsupported file type: ${mime}` });
          return;
        }
      } else {
        res.status(400).json({ error: 'No syllabus data provided' });
        return;
      }

      rawText = rawText.trim();
      if (!rawText) {
        res.status(422).json({ error: 'Unable to extract any text from syllabus' });
        return;
      }

      // Extract reference book text if present (take first 50k chars for context)
      let rawBookText = '';
      if (referenceBook && referenceBook.mimetype === 'application/pdf') {
        try {
          const bookData = await extractTextFromPdf(referenceBook.buffer);
          rawBookText = bookData.text.slice(0, 50000);
        } catch (err) {
          console.warn('Failed to parse reference book PDF', err);
        }
      }

      const analysis = await analyzeWithClaude(rawText, grade, rawBookText);

      const syllabus = await SyllabusModel.create({
        userId,
        sourceFilename: originalFilename,
        mimeType: mime,
        rawText,
        rawBookText: rawBookText || undefined,
        grade,
        analysis,
      });

      // Background task: Embed all topics in vector database (non-blocking)
      if (analysis.topics && analysis.topics.length > 0) {
        batchEmbedTopics(syllabus._id.toString(), analysis.topics).catch(err => {
          console.warn(`⚠️  Background embedding failed for syllabus ${syllabus._id}:`, err);
        });
      }

      res.json({
        ok: true,
        syllabus,
      });
    } catch (err) {
      console.error('Syllabus upload error', err);
      res.status(500).json({ error: 'Failed to process syllabus' });
    }
  },
);

export default router;

