"use strict";
/**
 * Whisper API Integration for Voice Transcription
 * Uses OpenAI's Whisper model for speech-to-text
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
exports.transcribeAudioBlob = transcribeAudioBlob;
exports.parseSessionIntent = parseSessionIntent;
async function transcribeAudio(audioBuffer, fileName = 'recording.webm') {
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    return transcribeAudioBlob(blob, fileName);
}
async function transcribeAudioBlob(blob, fileName = 'recording.webm') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }
    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'en'); // Default to English
    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Whisper API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
        return {
            text: data.text || '',
            language: data.language,
            duration: data.duration,
        };
    }
    catch (error) {
        console.error('Transcription error:', error);
        throw error;
    }
}
/**
 * Parse transcription to extract session information
 * Sends to Claude for intent parsing
 */
async function parseSessionIntent(transcribedText) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        // Fallback: simple keyword extraction
        return parseSimpleIntent(transcribedText);
    }
    const prompt = `You are a voice assistant parsing study session logs from spoken input. Extract the following information:

SPOKEN INPUT:
"${transcribedText}"

Extract:
1. **Topic**: What subject/topic did they study? (e.g., "Calculus", "Physics Chapter 5")
2. **Duration**: How long did they study? (in minutes, estimate if vague like "about an hour")
3. **Notes**: Any key points, achievements, or observations mentioned

Respond in JSON format:
{
  "topic": "string or null",
  "durationMinutes": number or null,
  "notes": "string or null",
  "confidence": number (0-100),
  "rawText": "original transcription"
}

If information is unclear, set field to null and lower confidence.`;
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 500,
                temperature: 0.3,
                messages: [
                    {
                        role: 'user',
                        content: [{ type: 'text', text: prompt }],
                    },
                ],
            }),
        });
        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }
        const data = await response.json();
        const content = data?.content?.[0]?.text;
        try {
            const parsed = JSON.parse(content);
            return {
                topic: parsed.topic,
                durationMinutes: parsed.durationMinutes,
                notes: parsed.notes,
                confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
                rawText: transcribedText,
            };
        }
        catch {
            // If JSON parsing fails, use simple parser
            return parseSimpleIntent(transcribedText);
        }
    }
    catch (error) {
        console.error('Intent parsing error:', error);
        // Fallback to simple parser
        return parseSimpleIntent(transcribedText);
    }
}
/**
 * Simple fallback parser when AI is unavailable
 * Uses keyword matching and regex
 */
function parseSimpleIntent(text) {
    const lowerText = text.toLowerCase();
    // Try to extract duration
    let durationMinutes;
    const hourMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
    const minuteMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:minute|min|m)/i);
    if (hourMatch) {
        durationMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
    }
    else if (minuteMatch) {
        durationMinutes = Math.round(parseFloat(minuteMatch[1]));
    }
    // Try to extract topic (capitalize first word after common phrases)
    let topic;
    const topicPatterns = [
        /stud(?:ied|ying|y)\s+(.+?)(?:\.|,|for|from|$)/i,
        /on\s+(.+?)(?:\.|,|for|$)/i,
        /chapter\s+(\d+)/i,
    ];
    for (const pattern of topicPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            topic = match[1].trim().substring(0, 50); // Limit length
            break;
        }
    }
    // Simple notes extraction (anything after "note" or "remember")
    let notes;
    const noteMatch = text.match(/(?:note|remember|important)[:\s]+(.+?)(?:\.|$)/i);
    if (noteMatch && noteMatch[1]) {
        notes = noteMatch[1].trim();
    }
    // Calculate confidence based on clarity
    let confidence = 50;
    if (topic && durationMinutes)
        confidence += 30;
    else if (topic || durationMinutes)
        confidence += 15;
    if (notes)
        confidence += 10;
    if (text.length > 20)
        confidence += 10;
    return {
        topic,
        durationMinutes,
        notes,
        confidence: Math.min(100, confidence),
        rawText: text,
    };
}
