/**
 * RAG (Retrieval Augmented Generation) Service
 *
 * Combines semantic search with LLM generation to answer questions
 * based on the FTC Decode manual
 */

import { getEmbedder, generateEmbedding } from "./embeddings";
import { getVectorStore, queryVectorStore } from "./vectorStore";
import {
  generateChatCompletion,
  generateStreamingChatCompletion,
  estimateTokens,
} from "./claude";

// Configuration
const TOP_K_RESULTS = parseInt(process.env.RAG_TOP_K || "5", 10);
const MIN_SIMILARITY_SCORE = parseFloat(process.env.RAG_MIN_SCORE || "0.3");
const MAX_CONTEXT_TOKENS = parseInt(
  process.env.RAG_MAX_CONTEXT_TOKENS || "3000",
  10
);

interface RetrievedChunk {
  text: string;
  score: number;
  metadata: {
    page?: number;
    source?: string;
    chunkIndex?: number;
  };
}

interface RAGResponse {
  answer: string;
  sources: Array<{
    source: string;
    page: number;
    score: number;
  }>;
  contextsUsed: number;
  tokensEstimate: number;
}

/**
 * Build system prompt for the LLM
 */
function buildSystemPrompt(): string {
  return `You are an expert assistant for the FIRST Tech Challenge (FTC) Decode Competition. Your role is to help teams understand the game manual by answering questions accurately and concisely.

Guidelines:
- Answer based ONLY on the provided context from the official manual
- Be precise and cite specific rules when relevant (e.g., "According to rule R103...")
- If the context doesn't contain enough information, say so clearly
- Use clear, concise language that teams can understand quickly
- For technical details, be specific (measurements, point values, time limits, etc.)
- If multiple manual versions are referenced, note any differences

Formatting:
- **ALWAYS use Markdown formatting** for better readability
- Use **bold** for important terms, rules, and values
- Use bullet points (- or *) for lists
- Use numbered lists (1., 2., 3.) for sequential steps
- Use > blockquotes for direct rule citations
- Use \`code\` formatting for technical terms or measurements
- Use ### headers for major sections in longer answers
- Use tables when comparing multiple items

Example formatting:
"According to **Rule R103**, robots must not exceed:
- **18 inches** width
- **18 inches** depth  
- **18 inches** height at start

> R103: Robot size is limited to 18" × 18" × 18" at the start of the match.

**Important**: Size is measured at the start configuration only."

Remember: Teams rely on accurate information for competition, so precision is critical.`;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(question: string, contexts: RetrievedChunk[]): string {
  const contextText = contexts
    .map((ctx, idx) => {
      const source = ctx.metadata.source || "Unknown";
      const page = ctx.metadata.page || "?";
      return `[Context ${
        idx + 1
      } - ${source}, Page ${page}, Relevance: ${ctx.score.toFixed(2)}]\n${
        ctx.text
      }`;
    })
    .join("\n\n---\n\n");

  return `Context from the FTC Decode Manual:

${contextText}

---

Question: ${question}

Please provide a clear, accurate answer based on the context above. If you reference specific information, mention which context or page it came from.`;
}

/**
 * Filter and rank retrieved chunks
 */
function filterAndRankChunks(
  chunks: RetrievedChunk[],
  maxTokens: number
): RetrievedChunk[] {
  // Filter by minimum similarity score
  const filtered = chunks.filter(
    (chunk) => chunk.score >= MIN_SIMILARITY_SCORE
  );

  if (filtered.length === 0) {
    return [];
  }

  // Sort by score (highest first)
  const sorted = filtered.sort((a, b) => b.score - a.score);

  // Take chunks until we hit token limit
  const selected: RetrievedChunk[] = [];
  let totalTokens = 0;

  for (const chunk of sorted) {
    const chunkTokens = estimateTokens(chunk.text);
    if (totalTokens + chunkTokens <= maxTokens) {
      selected.push(chunk);
      totalTokens += chunkTokens;
    } else {
      break;
    }
  }

  return selected;
}

/**
 * Extract source citations from chunks
 */
function extractSources(chunks: RetrievedChunk[]): RAGResponse["sources"] {
  const sourceMap = new Map<string, { page: number; score: number }>();

  for (const chunk of chunks) {
    const source = chunk.metadata.source || "Unknown";
    const page = chunk.metadata.page || 0;
    const existing = sourceMap.get(`${source}:${page}`);

    if (!existing || chunk.score > existing.score) {
      sourceMap.set(`${source}:${page}`, {
        page,
        score: chunk.score,
      });
    }
  }

  return Array.from(sourceMap.entries())
    .map(([key, value]) => ({
      source: key.split(":")[0],
      page: value.page,
      score: value.score,
    }))
    .sort((a, b) => b.score - a.score);
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Answer a question using RAG
 */
export async function answerQuestion(
  question: string,
  conversationHistory: ConversationMessage[] = []
): Promise<RAGResponse> {
  console.log(
    `\n🔍 RAG Query: "${question}" (history: ${conversationHistory.length} messages)`
  );

  // Step 1: Ensure embedder and vector store are loaded
  console.log("📚 Loading embedder and vector store...");
  await getEmbedder();
  await getVectorStore();

  // Step 2: Generate query embedding
  console.log("🔢 Generating query embedding...");
  const queryEmbedding = await generateEmbedding(question);

  // Step 3: Retrieve relevant chunks
  console.log(`🔎 Searching for top ${TOP_K_RESULTS} relevant chunks...`);
  const results = await queryVectorStore(queryEmbedding, TOP_K_RESULTS);

  if (results.documents.length === 0) {
    console.log(`⚠️  No documents returned from vector store`);

    // Return a helpful message instead of throwing an error
    return {
      answer:
        "I apologize, but I couldn't find any relevant information about that topic in the FTC DECODE Competition Manual. This could mean:\n\n- The topic might not be covered in the manual\n- It might be phrased differently in the official documentation\n- It could be in a section I don't have access to\n\n**Suggestions:**\n- Try rephrasing your question with different keywords\n- Check if you're asking about a specific rule number (e.g., \"What is rule R103?\")\n- Browse the official FIRST Tech Challenge manual directly for topics outside competition rules\n\nIf you believe this information should be in the manual, please try asking your question in a different way!",
      sources: [],
      contextsUsed: 0,
      tokensEstimate: 0,
    };
  }

  // Combine results into structured format
  const retrievedChunks: RetrievedChunk[] = results.documents.map(
    (doc, idx) => ({
      text: doc,
      score: results.scores[idx],
      metadata: results.metadatas[idx] || {},
    })
  );

  console.log(
    `✅ Retrieved ${
      retrievedChunks.length
    } chunks (scores: ${retrievedChunks[0].score.toFixed(
      2
    )} - ${retrievedChunks[retrievedChunks.length - 1].score.toFixed(2)})`
  );

  // Step 4: Filter and rank chunks
  const selectedChunks = filterAndRankChunks(
    retrievedChunks,
    MAX_CONTEXT_TOKENS
  );

  if (selectedChunks.length === 0) {
    console.log(`⚠️  No relevant chunks found for question`);

    // Return a helpful message instead of throwing an error
    return {
      answer:
        "I apologize, but I couldn't find any relevant information about that topic in the FTC DECODE Competition Manual. This could mean:\n\n- The topic might not be covered in the manual\n- It might be phrased differently in the official documentation\n- It could be in a section I don't have access to\n\n**Suggestions:**\n- Try rephrasing your question with different keywords\n- Check if you're asking about a specific rule number (e.g., \"What is rule R103?\")\n- Browse the official FIRST Tech Challenge manual directly for topics outside competition rules\n\nIf you believe this information should be in the manual, please try asking your question in a different way!",
      sources: [],
      contextsUsed: 0,
      tokensEstimate: 0,
    };
  }

  console.log(`📝 Using ${selectedChunks.length} chunks as context`);

  // Step 5: Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(question, selectedChunks);

  const totalTokensEstimate =
    estimateTokens(systemPrompt) + estimateTokens(userPrompt);
  console.log(`💭 Estimated context tokens: ${totalTokensEstimate}`);

  // Step 6: Build messages array with conversation history
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }];

  // Add conversation history (if any)
  for (const msg of conversationHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current question with context
  messages.push({ role: "user", content: userPrompt });

  // Step 7: Generate answer with LLM
  console.log("🤖 Generating answer with Claude...");
  const answer = await generateChatCompletion(messages);

  console.log(`✅ Answer generated (${answer.length} chars)`);

  // Step 7: Extract sources
  const sources = extractSources(selectedChunks);

  return {
    answer,
    sources,
    contextsUsed: selectedChunks.length,
    tokensEstimate: totalTokensEstimate,
  };
}

/**
 * Answer a question using RAG with streaming
 * Returns both the initial metadata and the stream
 */
export async function answerQuestionStreaming(
  question: string,
  conversationHistory: ConversationMessage[] = []
) {
  console.log("\n" + "=".repeat(50));
  console.log(
    `📥 New question: "${question}" (history: ${conversationHistory.length} messages)`
  );
  console.log("=".repeat(50));

  // Step 1: Validate vector store
  console.log("📚 Loading embedder and vector store...");
  await getEmbedder();
  await getVectorStore();

  // Step 2: Generate query embedding
  console.log("🔢 Generating query embedding...");
  const queryEmbedding = await generateEmbedding(question);

  // Step 3: Retrieve relevant chunks
  console.log(`🔎 Searching for top ${TOP_K_RESULTS} relevant chunks...`);
  const results = await queryVectorStore(queryEmbedding, TOP_K_RESULTS);

  if (results.documents.length === 0) {
    console.log(`⚠️  No documents returned from vector store`);

    // Return a helpful message as a stream
    const errorMessage =
      "I apologize, but I couldn't find any relevant information about that topic in the FTC DECODE Competition Manual. This could mean:\n\n- The topic might not be covered in the manual\n- It might be phrased differently in the official documentation\n- It could be in a section I don't have access to\n\n**Suggestions:**\n- Try rephrasing your question with different keywords\n- Check if you're asking about a specific rule number (e.g., \"What is rule R103?\")\n- Browse the official FIRST Tech Challenge manual directly for topics outside competition rules\n\nIf you believe this information should be in the manual, please try asking your question in a different way!";

    async function* errorStream() {
      // Yield the error message as a single chunk
      yield {
        type: "content_block_delta" as const,
        delta: { text: errorMessage },
      };
    }

    return {
      stream: errorStream(),
      sources: [],
      contextsUsed: 0,
      tokensEstimate: 0,
    };
  }

  // Combine results into structured format
  const retrievedChunks: RetrievedChunk[] = results.documents.map(
    (doc, idx) => ({
      text: doc,
      score: results.scores[idx],
      metadata: results.metadatas[idx] || {},
    })
  );

  console.log(
    `✅ Retrieved ${
      retrievedChunks.length
    } chunks (scores: ${retrievedChunks[0].score.toFixed(
      2
    )} - ${retrievedChunks[retrievedChunks.length - 1].score.toFixed(2)})`
  );

  // Step 4: Filter and rank chunks
  const selectedChunks = filterAndRankChunks(
    retrievedChunks,
    MAX_CONTEXT_TOKENS
  );

  if (selectedChunks.length === 0) {
    console.log(`⚠️  No relevant chunks found for question`);

    // Return a helpful message as a stream
    const errorMessage =
      "I apologize, but I couldn't find any relevant information about that topic in the FTC DECODE Competition Manual. This could mean:\n\n- The topic might not be covered in the manual\n- It might be phrased differently in the official documentation\n- It could be in a section I don't have access to\n\n**Suggestions:**\n- Try rephrasing your question with different keywords\n- Check if you're asking about a specific rule number (e.g., \"What is rule R103?\")\n- Browse the official FIRST Tech Challenge manual directly for topics outside competition rules\n\nIf you believe this information should be in the manual, please try asking your question in a different way!";

    async function* errorStream() {
      // Yield the error message as a single chunk
      yield {
        type: "content_block_delta" as const,
        delta: { text: errorMessage },
      };
    }

    return {
      stream: errorStream(),
      sources: [],
      contextsUsed: 0,
      tokensEstimate: 0,
    };
  }

  console.log(`📝 Using ${selectedChunks.length} chunks as context`);

  // Step 5: Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(question, selectedChunks);

  const totalTokensEstimate =
    estimateTokens(systemPrompt) + estimateTokens(userPrompt);
  console.log(`💭 Estimated context tokens: ${totalTokensEstimate}`);

  // Step 6: Build messages array with conversation history
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }];

  // Add conversation history (if any)
  for (const msg of conversationHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current question with context
  messages.push({ role: "user", content: userPrompt });

  // Step 7: Start streaming
  console.log("🤖 Starting streaming response from Claude...");
  const stream = await generateStreamingChatCompletion(messages);

  // Step 7: Extract sources
  const sources = extractSources(selectedChunks);

  return {
    stream,
    sources,
    contextsUsed: selectedChunks.length,
    tokensEstimate: totalTokensEstimate,
  };
}

/**
 * Get RAG configuration
 */
export function getRAGConfig() {
  return {
    topK: TOP_K_RESULTS,
    minSimilarityScore: MIN_SIMILARITY_SCORE,
    maxContextTokens: MAX_CONTEXT_TOKENS,
  };
}
