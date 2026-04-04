"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const pdfParse = require('pdf-parse');
const sharp_1 = __importDefault(require("sharp"));
const tesseract_js_1 = require("tesseract.js");
const mammoth = __importStar(require("mammoth"));
const Syllabus_1 = require("../models/Syllabus");
const vectorService_1 = require("../utils/vectorService");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});
async function extractTextFromPdf(buffer) {
    const data = await pdfParse(buffer);
    const text = (data.text || '').trim();
    const isScanned = text.length < 200; // heuristic: very low text suggests scanned
    return { text, isScanned };
}
async function preprocessImage(buffer) {
    return (0, sharp_1.default)(buffer).grayscale().normalize().sharpen().toBuffer();
}
async function ocrImage(buffer) {
    const worker = await (0, tesseract_js_1.createWorker)('eng+hin+tam');
    try {
        const { data: { text }, } = await worker.recognize(buffer);
        return text;
    }
    finally {
        await worker.terminate();
    }
}
async function extractDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
}
async function analyzeWithClaude(rawText, grade, rawBookText) {
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
    }
    catch {
        return {
            topics: [],
            chapters: [],
            units: [],
            difficulty: 'medium',
            estimatedHours: 0,
        };
    }
}
router.post('/upload', upload.fields([{ name: 'syllabus', maxCount: 1 }, { name: 'referenceBook', maxCount: 1 }]), async (req, res) => {
    try {
        const files = req.files;
        const file = files?.['syllabus']?.[0];
        const referenceBook = files?.['referenceBook']?.[0];
        const userId = req.body.userId || 'anonymous';
        const grade = req.body.grade || 'Unknown';
        const manualSyllabusRaw = req.body.manualSyllabus;
        let rawText = '';
        let mime = 'text/plain';
        let originalFilename = 'manual_entry.txt';
        if (manualSyllabusRaw) {
            // Manual entry mode
            const parsedChapters = JSON.parse(manualSyllabusRaw);
            rawText = parsedChapters.map((c) => `Chapter: ${c.title} (Pages: ${c.pages})`).join('\n');
        }
        else if (file) {
            // File upload mode
            mime = file.mimetype;
            originalFilename = file.originalname;
            const buffer = file.buffer;
            if (mime === 'application/pdf') {
                const { text, isScanned } = await extractTextFromPdf(buffer);
                if (!isScanned && text) {
                    rawText = text;
                }
                else {
                    const preprocessed = await preprocessImage(buffer);
                    rawText = await ocrImage(preprocessed);
                }
            }
            else if (mime.startsWith('image/') ||
                ['image/png', 'image/jpeg', 'image/jpg'].includes(mime)) {
                const preprocessed = await preprocessImage(buffer);
                rawText = await ocrImage(preprocessed);
            }
            else if (mime ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mime === 'application/msword') {
                rawText = await extractDocx(buffer);
            }
            else {
                res.status(400).json({ error: `Unsupported file type: ${mime}` });
                return;
            }
        }
        else {
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
            }
            catch (err) {
                console.warn('Failed to parse reference book PDF', err);
            }
        }
        const analysis = await analyzeWithClaude(rawText, grade, rawBookText);
        const syllabus = await Syllabus_1.SyllabusModel.create({
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
            (0, vectorService_1.batchEmbedTopics)(syllabus._id.toString(), analysis.topics).catch(err => {
                console.warn(`⚠️  Background embedding failed for syllabus ${syllabus._id}:`, err);
            });
        }
        res.json({
            ok: true,
            syllabus,
        });
    }
    catch (err) {
        console.error('Syllabus upload error', err);
        res.status(500).json({ error: 'Failed to process syllabus' });
    }
});
exports.default = router;
