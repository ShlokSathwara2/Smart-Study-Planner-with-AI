import { GoogleGenerativeAI } from "@google/generative-ai";

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const OLLAMA_API_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434') + '/v1/chat/completions';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

let genAI: GoogleGenerativeAI | null = null;
function getGemini() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

async function callGroq(system: string, prompt: string, options: LLMOptions): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const body: any = {
      model: options.model || GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.5,
    };
    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.warn(`Groq API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('Groq call failed:', err);
    return null;
  }
}

async function callOllama(system: string, prompt: string, options: LLMOptions): Promise<string | null> {
  try {
    const body: any = {
      model: options.model || OLLAMA_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.5,
      stream: false,
    };
    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.warn(`Ollama API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || data?.message?.content || null;
  } catch (err) {
    console.warn('Ollama call failed:', err);
    return null;
  }
}

async function callGemini(system: string, prompt: string, options: LLMOptions): Promise<string | null> {
  const gemini = getGemini();
  if (!gemini) return null;
  try {
    const model = gemini.getGenerativeModel({
      model: options.model || GEMINI_MODEL,
      generationConfig: options.jsonMode ? { responseMimeType: 'application/json' } : undefined,
    });
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
    const response = await model.generateContent(fullPrompt);
    return response.response.text();
  } catch (err) {
    console.warn('Gemini call failed:', err);
    return null;
  }
}

export async function callLLM(
  system: string,
  prompt: string,
  options: LLMOptions = {}
): Promise<string> {
  let content: string | null = null;
  content = await callGroq(system, prompt, options);
  if (content) return content;
  content = await callOllama(system, prompt, options);
  if (content) return content;
  content = await callGemini(system, prompt, options);
  if (content) return content;
  throw new Error('No AI provider available. Set GROQ_API_KEY or start Ollama or set GEMINI_API_KEY.');
}

export async function callLLMWithFallback(
  system: string,
  prompt: string,
  options: LLMOptions = {},
  fallback: () => any
): Promise<string> {
  try {
    return await callLLM(system, prompt, options);
  } catch {
    return fallback();
  }
}

export async function askAI(prompt: string, model?: string): Promise<string> {
  return callLLM('', prompt, { model, temperature: 0.7 });
}

export async function askAIForJSON(prompt: string, model?: string): Promise<any> {
  const text = await callLLM('You are a helpful assistant. Always respond with valid JSON.', prompt, {
    model,
    jsonMode: true,
    temperature: 0.3,
  });
  return JSON.parse(text);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const gemini = getGemini();
  if (gemini) {
    try {
      const embeddingModel = gemini.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      console.warn('Gemini embedding failed:', err);
    }
  }
  throw new Error('No embedding provider. Set GEMINI_API_KEY for embeddings.');
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  fileName: string = 'recording.webm'
): Promise<{ text: string; language?: string; duration?: number }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured (required for audio transcription)');
  }
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en');
  try {
    const response = await fetch(GROQ_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq transcription error: ${response.status} - ${errorData.error?.message || 'Unknown'}`);
    }
    const data = await response.json();
    return {
      text: data.text || '',
      language: data.language,
      duration: data.duration,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

export async function parseSessionIntent(transcribedText: string): Promise<{
  topic?: string;
  durationMinutes?: number;
  notes?: string;
  confidence: number;
  rawText: string;
}> {
  const system = 'You are a voice assistant parsing study session logs from spoken input. Extract topic, duration, and notes. Respond in JSON format.';
  const prompt = `SPOKEN INPUT: "${transcribedText}"

Extract:
1. Topic: What subject/topic did they study?
2. Duration: How long did they study? (in minutes)
3. Notes: Any key points mentioned

Respond in JSON:
{
  "topic": "string or null",
  "durationMinutes": number or null,
  "notes": "string or null",
  "confidence": number (0-100)
}`;

  try {
    const content = await callLLM(system, prompt, { maxTokens: 500, temperature: 0.3, jsonMode: true });
    const parsed = JSON.parse(content);
    return {
      topic: parsed.topic || undefined,
      durationMinutes: parsed.durationMinutes || undefined,
      notes: parsed.notes || undefined,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      rawText: transcribedText,
    };
  } catch {
    return parseSimpleIntent(transcribedText);
  }
}

function parseSimpleIntent(text: string): {
  topic?: string; durationMinutes?: number; notes?: string; confidence: number; rawText: string;
} {
  const lowerText = text.toLowerCase();
  let durationMinutes: number | undefined;
  const hourMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
  const minuteMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:minute|min|m)/i);
  if (hourMatch) durationMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
  else if (minuteMatch) durationMinutes = Math.round(parseFloat(minuteMatch[1]));
  let topic: string | undefined;
  const topicPatterns = [
    /stud(?:ied|ying|y)\s+(.+?)(?:\.|,|for|from|$)/i,
    /on\s+(.+?)(?:\.|,|for|$)/i,
    /chapter\s+(\d+)/i,
  ];
  for (const pattern of topicPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) { topic = match[1].trim().substring(0, 50); break; }
  }
  let notes: string | undefined;
  const noteMatch = text.match(/(?:note|remember|important)[:\s]+(.+?)(?:\.|$)/i);
  if (noteMatch && noteMatch[1]) notes = noteMatch[1].trim();
  let confidence = 50;
  if (topic && durationMinutes) confidence += 30;
  else if (topic || durationMinutes) confidence += 15;
  if (notes) confidence += 10;
  if (text.length > 20) confidence += 10;
  return { topic, durationMinutes, notes, confidence: Math.min(100, confidence), rawText: text };
}
