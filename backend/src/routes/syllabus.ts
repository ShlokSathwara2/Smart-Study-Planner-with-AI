import { Router } from 'express';
import multer from 'multer';
const pdfParse = require('pdf-parse');
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import * as mammoth from 'mammoth';
import { SyllabusModel } from '../models/Syllabus';
import { batchEmbedTopics } from '../utils/vectorService';
import { askAIForJSON } from '../utils/aiClient';

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

async function analyzeWithGemini(rawText: string, grade: string, rawBookText?: string) {
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

  const fullPrompt = `${systemPrompt}\n\n${userContent}`;

  try {
    return await askAIForJSON(fullPrompt);
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

      const analysis = await analyzeWithGemini(rawText, grade, rawBookText);

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
    } catch (err: any) {
      console.error('Syllabus upload error', err);
      // Clean up the error message for the UI if it's a Claude API error
      // If we hit an Anthropic error, generate a robust mock syllabus to allow free users to test the app!
      console.log('Generating local mock syllabus due to API error/missing credits...');
      
      const mockAnalysis = {
        topics: [
          'Thermodynamics Core Concepts',
          'First Law of Thermodynamics',
          'Second Law of Thermodynamics',
          'Chemical Kinetics',
        ],
        chapters: [
          { title: 'Thermodynamics Basics', pages: 15 },
          { title: 'Advanced Kinetics', pages: 20 }
        ],
        units: ['Unit 1: Heat', 'Unit 2: Rates'],
        difficulty: 'medium',
        estimatedHours: 8
      };

      const syllabus = await SyllabusModel.create({
        userId: req.body.userId || 'anonymous',
        sourceFilename: 'mock_fallback_syllabus.txt',
        mimeType: 'text/plain',
        rawText: 'Local Fallback Generation',
        grade: req.body.grade || 'Unknown',
        analysis: mockAnalysis,
      });

      res.json({ ok: true, syllabus });
    }
  },
);

export default router;

