/**
 * Test Retrieval Script
 *
 * Tests semantic search queries against the vectorized manual
 * to verify embeddings and retrieval quality
 */

import { pipeline } from "@xenova/transformers";
import {
  getVectorStore,
  queryVectorStore,
  getVectorStoreStats,
} from "../lib/services/vectorStore.js";

// Configuration
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

// Test queries
const TEST_QUERIES = [
  "What are the dimensions of the playing field?",
  "How many points is scoring in the high goal worth?",
  "What are the robot size restrictions?",
  "What happens during the autonomous period?",
  "How long is a match?",
  "What are the penalties for fouls?",
  "What are the team qualification requirements?",
];

/**
 * Generate embedding for a query
 */
async function generateQueryEmbedding(
  query: string,
  embedder: any
): Promise<number[]> {
  const output = await embedder(query, { pooling: "mean", normalize: true });
  return Array.from(output.data) as number[];
}

/**
 * Test a single query
 */
async function testQuery(
  query: string,
  embedder: any,
  topK: number = 3
): Promise<void> {
  console.log(`\n🔍 Query: "${query}"`);
  console.log("─".repeat(80));

  // Generate embedding for query
  const queryEmbedding = await generateQueryEmbedding(query, embedder);

  // Search in vector store
  const results = await queryVectorStore(queryEmbedding, topK);

  // Display results
  if (results.documents.length > 0) {
    results.documents.forEach((doc, idx) => {
      const score = results.scores[idx];
      const metadata = results.metadatas[idx];

      console.log(`\n📄 Result ${idx + 1} (Score: ${score.toFixed(3)})`);
      console.log(`   Source: ${metadata?.source || "Unknown"}`);
      console.log(`   Page: ${metadata?.page || "Unknown"}`);
      console.log(`   Text: ${doc}`);
    });
  } else {
    console.log("❌ No results found");
  }
}

/**
 * Main test function
 */
async function main() {
  console.log("🧪 FTC Decode Manual - Retrieval Testing");
  console.log("========================================\n");

  try {
    // Check vector store stats
    console.log("💾 Checking vector store...");
    const stats = await getVectorStoreStats();

    if (!stats.exists) {
      console.log("❌ Vector store not found!");
      console.log(
        "💡 Hint: Run `pnpm process-manual` first to create the vector database"
      );
      process.exit(1);
    }

    console.log(`✅ Vector store loaded! Contains ${stats.count} documents\n`);

    // Load vector store
    await getVectorStore();

    // Load embedding model
    console.log(`🤖 Loading embedding model: ${EMBEDDING_MODEL}...`);
    const embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
    console.log("✅ Model loaded!\n");

    // Test each query
    for (const query of TEST_QUERIES) {
      await testQuery(query, embedder);
    }

    console.log("\n========================================");
    console.log("✅ Testing Complete!");
    console.log("\n💡 Tips:");
    console.log("   - Scores close to 1.0 indicate strong matches");
    console.log("   - Scores above 0.7 are generally good");
    console.log(
      "   - If results are poor, consider adjusting chunk size/overlap"
    );
    console.log("   - Try different test queries to validate coverage");
  } catch (error) {
    console.error("\n❌ Error during testing:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      console.log(
        "\n💡 Hint: Run `pnpm process-manual` first to create the vector database"
      );
    }

    process.exit(1);
  }
}

// Run the main function
main();
