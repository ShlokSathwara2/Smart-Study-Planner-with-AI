import { Router } from 'express';
import { SyllabusModel } from '../models/Syllabus';
import { callLLM } from '../utils/aiProvider';

const router = Router();

router.post('/analyze', async (req, res): Promise<void> => {
  try {
    const { topicTitle, syllabusId, userId = 'anonymous', grade = 'Unknown' } = req.body;

    if (!topicTitle || !syllabusId) {
      res.status(400).json({ error: 'topicTitle and syllabusId are required' });
      return;
    }

    // Try to find context from the syllabus document
    const syllabus = await SyllabusModel.findOne({ _id: syllabusId });
    
    // Determine context for Claude
    let contextString = '';
    if (syllabus) {
      contextString = `The student is studying from a syllabus with these topics: ${
        syllabus.analysis.topics?.map((t: any) => t.title || t).join(', ') || 'Unknown'
      }.\n\n`;
      if (syllabus.rawBookText) {
        contextString += `Some reference text from their book:\n${syllabus.rawBookText.slice(0, 10000)}\n\n`;
      }
    }

    try {
      const system = `You are an expert AI tutor. A student (Level: ${grade}) is struggling with the topic: "${topicTitle}". Identify 1-3 foundational or preliminary concepts they MUST understand before grasping this topic. Return them as a flat JSON array of strings.`;
      const prompt = `${contextString}Identify the foundational prerequisites for: ${topicTitle}`;
      const content = await callLLM(system, prompt, { maxTokens: 500, temperature: 0.1, jsonMode: true });

      const parsed = JSON.parse(content);
      const foundations = Array.isArray(parsed) ? parsed : [];

      res.json({ ok: true, foundations });
    } catch {
      res.json({
        ok: true,
        foundations: [
          `Introduction to ${topicTitle}`,
          `Core Principles of ${topicTitle}`
        ]
      });
    }
  } catch (err) {
    console.error('Gap Detector analysis error', err);
    res.status(500).json({ error: 'Failed to run knowledge gap detection' });
  }
});

export default router;
