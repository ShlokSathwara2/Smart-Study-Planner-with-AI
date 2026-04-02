import { pipeline } from '@xenova/transformers';

let extractorPipeline: any = null;

// Initialize standard Xenova/all-MiniLM-L6-v2 directly in memory
async function getPipeline() {
  if (!extractorPipeline) {
    // using feature-extraction
    extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, 
    });
  }
  return extractorPipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getPipeline();
    // Return array of floats
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error("Text embedding generation failed", error);
    // fallback if model fails to load
    return new Array(384).fill(0);
  }
}

// Compute standard cosine similarity between two numeric arrays
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
