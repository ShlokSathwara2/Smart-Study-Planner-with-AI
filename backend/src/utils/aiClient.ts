import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * General AI call - returns text response
 * @param prompt - The prompt to send
 * @param model - Model to use (default: gemini-1.5-flash)
 */
export async function askAI(prompt: string, model: string = "gemini-1.5-flash"): Promise<string> {
  const aiModel = genAI.getGenerativeModel({ model });
  const response = await aiModel.generateContent(prompt);
  return response.response.text();
}

/**
 * AI call with guaranteed JSON output
 * @param prompt - The prompt to send
 * @param model - Model to use (default: gemini-1.5-flash)
 */
export async function askAIForJSON(prompt: string, model: string = "gemini-1.5-flash"): Promise<any> {
  const aiModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  const response = await aiModel.generateContent(prompt);
  return JSON.parse(response.response.text());
}

/**
 * Generate text embeddings (768-dimensional vector)
 * @param text - Text to embed
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}
