"use server";

/**
 * Vector Store Service
 *
 * Abstraction layer for vector store operations.
 * Currently uses a simple in-memory vector store with JSON persistence.
 * Designed to easily switch to ChromaDB when you have Docker installed.
 *
 * To switch to ChromaDB later:
 * 1. Run: docker run -p 8000:8000 chromadb/chroma
 * 2. Replace this implementation with ChromaDB client
 * 3. Update CHROMA_URL in .env
 */

import * as fs from "fs";
import * as path from "path";

// Resolve path relative to the project root
const VECTOR_STORE_PATH = process.env.VECTOR_STORE_PATH
  ? path.resolve(process.cwd(), process.env.VECTOR_STORE_PATH)
  : path.resolve(process.cwd(), "./data/vector_store.json");

interface VectorRecord {
  content: string;
  embedding: number[];
  metadata: any;
}

let vectorStore: VectorRecord[] = [];

/**
 * Initialize vector store from saved data or create new one
 */
export async function getVectorStore(): Promise<VectorRecord[]> {
  if (vectorStore.length > 0) {
    return vectorStore;
  }

  // Try to load from disk
  if (fs.existsSync(VECTOR_STORE_PATH)) {
    const data = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, "utf-8"));
    vectorStore = data.vectors || [];
    return vectorStore;
  }

  return vectorStore;
}

/**
 * Create or recreate the vector store
 */
export async function createVectorStore(): Promise<void> {
  vectorStore = [];
}

/**
 * Add documents to the vector store with pre-computed embeddings
 */
export async function addDocuments(
  documents: string[],
  embeddings: number[][],
  metadatas: Array<{
    page: number;
    chunkIndex: number;
    length: number;
    [key: string]: any;
  }>,
  onProgress?: (added: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < documents.length; i++) {
    vectorStore.push({
      content: documents[i],
      embedding: embeddings[i],
      metadata: metadatas[i],
    });

    if (onProgress && (i + 1) % 100 === 0) {
      onProgress(i + 1, documents.length);
    }
  }

  if (onProgress) {
    onProgress(documents.length, documents.length);
  }
}

/**
 * Query the vector store with a pre-computed embedding
 */
export async function queryVectorStore(
  queryEmbedding: number[],
  topK: number = 5
): Promise<{
  documents: string[];
  scores: number[];
  metadatas: any[];
}> {
  if (vectorStore.length === 0) {
    return { documents: [], scores: [], metadatas: [] };
  }

  // Calculate cosine similarity for each vector
  const similarities = vectorStore.map((vec, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, vec.embedding),
    content: vec.content,
    metadata: vec.metadata,
  }));

  // Sort by similarity (descending) and take top K
  similarities.sort((a: any, b: any) => b.similarity - a.similarity);
  const topResults = similarities.slice(0, topK);

  return {
    documents: topResults.map((r: any) => r.content),
    scores: topResults.map((r: any) => r.similarity),
    metadatas: topResults.map((r: any) => r.metadata),
  };
}

/**
 * Save vector store to disk
 */
export async function saveVectorStore(): Promise<void> {
  const data = {
    vectors: vectorStore,
    saved: new Date().toISOString(),
    count: vectorStore.length,
  };

  // Ensure directory exists
  const dir = path.dirname(VECTOR_STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(data, null, 2));
}

/**
 * Get vector store stats
 */
export async function getVectorStoreStats(): Promise<{
  exists: boolean;
  count?: number;
  filePath?: string;
}> {
  if (fs.existsSync(VECTOR_STORE_PATH)) {
    const data = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, "utf-8"));
    return {
      exists: true,
      count: data.count || data.vectors?.length || 0,
      filePath: VECTOR_STORE_PATH,
    };
  }

  if (vectorStore.length > 0) {
    return {
      exists: true,
      count: vectorStore.length,
    };
  }

  return { exists: false };
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
