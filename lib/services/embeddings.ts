"use server";

/**
 * Embeddings Service
 *
 * Wraps @xenova/transformers for consistent embedding generation
 * Uses local model - no API costs!
 */

import { pipeline } from "@xenova/transformers";

let embedderInstance: any = null;

/**
 * Get or create embedder instance (singleton pattern)
 */
export async function getEmbedder(
  modelName: string = "Xenova/all-MiniLM-L6-v2"
) {
  if (!embedderInstance) {
    console.log(`Loading embedding model: ${modelName}...`);
    embedderInstance = await pipeline("feature-extraction", modelName);
    console.log("✅ Embedding model loaded");
  }
  return embedderInstance;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  modelName?: string
): Promise<number[]> {
  const embedder = await getEmbedder(modelName);
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data) as number[];
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(
  texts: string[],
  modelName?: string
): Promise<number[][]> {
  const embedder = await getEmbedder(modelName);

  const embeddings: number[][] = [];

  for (const text of texts) {
    const output = await embedder(text, { pooling: "mean", normalize: true });
    embeddings.push(Array.from(output.data) as number[]);
  }

  return embeddings;
}

/**
 * Generate embeddings in batches with progress tracking
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 10,
  onProgress?: (processed: number, total: number) => void,
  modelName?: string
): Promise<number[][]> {
  const embedder = await getEmbedder(modelName);
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const batchEmbeddings = await Promise.all(
      batch.map(async (text) => {
        const output = await embedder(text, {
          pooling: "mean",
          normalize: true,
        });
        return Array.from(output.data) as number[];
      })
    );

    embeddings.push(...batchEmbeddings);

    if (onProgress) {
      const processed = Math.min(i + batchSize, texts.length);
      onProgress(processed, texts.length);
    }
  }

  return embeddings;
}

/**
 * Get embedding dimensions for the model
 */
export async function getEmbeddingDimensions(
  modelName?: string
): Promise<number> {
  const embedder = await getEmbedder(modelName);
  const testOutput = await embedder("test", {
    pooling: "mean",
    normalize: true,
  });
  return (Array.from(testOutput.data) as number[]).length;
}
