import { transcribeAudio as providerTranscribe, parseSessionIntent as providerParseIntent } from './aiProvider';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  fileName: string = 'recording.webm'
): Promise<TranscriptionResult> {
  return providerTranscribe(audioBuffer, fileName);
}

export async function transcribeAudioBlob(
  blob: Blob,
  fileName: string = 'recording.webm'
): Promise<TranscriptionResult> {
  const arrayBuffer = await blob.arrayBuffer();
  return providerTranscribe(arrayBuffer, fileName);
}

export async function parseSessionIntent(transcribedText: string): Promise<{
  topic?: string;
  durationMinutes?: number;
  notes?: string;
  confidence: number;
  rawText: string;
}> {
  return providerParseIntent(transcribedText);
}
