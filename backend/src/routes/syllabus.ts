import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import * as mammoth from 'mammoth';
import { SyllabusModel } from '../models/Syllabus';

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

async function analyzeWithClaude(rawText: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: simple heuristic without external API
    return {
      topics: [],
      units: [],
      difficulty: 'medium',
      estimatedHours: 0,
    };
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
      max_tokens: 800,
      temperature: 0,
      system:
        'You analyze academic syllabi and return a concise JSON structure with topics, units, difficulty (easy|medium|hard), and estimatedHours (number). Respond with JSON only.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Here is a syllabus or study plan. Extract structured information.\n\n${rawText.slice(
                0,
                20000,
              )}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text ?? data?.content?.[0]?.[0]?.text;

  try {
    return JSON.parse(content);
  } catch {
    return {
      topics: [],
      units: [],
      difficulty: 'medium',
      estimatedHours: 0,
    };
  }
}

router.post(
  '/upload',
  upload.single('syllabus'),
  async (req, res): Promise<void> => {
    try {
      const file = req.file;
      const userId = (req.body.userId as string) || 'anonymous';

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      let rawText = '';
      const mime = file.mimetype;
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

      rawText = rawText.trim();
      if (!rawText) {
        res.status(422).json({ error: 'Unable to extract any text from file' });
        return;
      }

      const analysis = await analyzeWithClaude(rawText);

      const syllabus = await SyllabusModel.create({
        userId,
        sourceFilename: file.originalname,
        mimeType: mime,
        rawText,
        analysis,
      });

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

