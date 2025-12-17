"use server";

/**
 * RAG (Retrieval Augmented Generation) Service
 *
 * Combines semantic search with LLM generation to answer questions
 * based on the FTC Decode manual
 */

import { getEmbedder, generateEmbedding } from "./embeddings";
import { getVectorStore, queryVectorStore } from "./vectorStore";
import {
  generateChatCompletionWithTools,
  estimateTokens,
  ClaudeTool,
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
 * Build system prompt for the LLM with tool support
 */
function buildSystemPrompt(withTools: boolean = false): string {
  const basePrompt = `You are an expert assistant for the FIRST Tech Challenge (FTC) Decode Competition. Your role is to help teams understand the game manual by answering questions accurately and concisely.

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

  if (withTools) {
    return (
      basePrompt +
      `\n\n**Important Tool Usage:**
When you encounter references to sections, rules, or topics that are NOT in your provided context (e.g., "see section 10.5.2" or "refer to rule R205"), you MUST use the 'search_manual' tool to retrieve that information before answering.

Steps to follow when you see a reference to missing information:
1. Identify the specific section, rule, or topic being referenced
2. Use the search_manual tool with a clear query (e.g., "section 10.5.2" or "rule R205")
3. Wait for the tool results to be provided
4. Incorporate the retrieved information into your answer
5. Cite the section/rule properly in your response

Example: If you see "Teams should follow the scoring guidelines in section 10.5.2" but section 10.5.2 is not in your context, use search_manual with query "section 10.5.2 scoring guidelines" to retrieve it.

**Do NOT** simply state "I don't have information about section X" if you haven't tried using the search_manual tool first.`
    );
  }

  return basePrompt;
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
async function filterAndRankChunks(
  chunks: RetrievedChunk[],
  maxTokens: number
): Promise<RetrievedChunk[]> {
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
    const chunkTokens = await estimateTokens(chunk.text);
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

/**
 * Search for additional context in the manual
 * This is exposed as a tool that the LLM can call
 */
async function searchManualForContext(
  query: string,
  topK: number = 5
): Promise<string> {
  console.log(`   🔍 Tool search: "${query}" (topK: ${topK})`);

  // Generate embedding for the search query
  const queryEmbedding = await generateEmbedding(query);

  // Search vector store
  const results = await queryVectorStore(queryEmbedding, topK);

  if (results.documents.length === 0) {
    return `No information found for query: "${query}". The topic may not be covered in the available manual sections.`;
  }

  // Format results
  const retrievedChunks: RetrievedChunk[] = results.documents.map(
    (doc, idx) => ({
      text: doc,
      score: results.scores[idx],
      metadata: results.metadatas[idx] || {},
    })
  );

  // Filter by minimum similarity
  const filtered = retrievedChunks.filter(
    (chunk) => chunk.score >= MIN_SIMILARITY_SCORE
  );

  if (filtered.length === 0) {
    return `No highly relevant information found for query: "${query}". The similarity scores were too low.`;
  }

  // Format the context
  const contextText = filtered
    .map((ctx, idx) => {
      const source = ctx.metadata.source || "Unknown";
      const page = ctx.metadata.page || "?";
      return `[Result ${
        idx + 1
      } - ${source}, Page ${page}, Relevance: ${ctx.score.toFixed(2)}]\n${
        ctx.text
      }`;
    })
    .join("\n\n---\n\n");

  console.log(`   ✅ Tool search returned ${filtered.length} results`);

  return `Additional context retrieved for "${query}":\n\n${contextText}`;
}

/**
 * Define the search tool for Claude
 */
const searchManualTool: ClaudeTool = {
  name: "search_manual",
  description:
    "Search the FTC DECODE Competition Manual for specific information. Use this when you encounter references to sections, rules, or topics that are not in your current context. Provide a clear, specific query describing what information you need (e.g., 'section 10.5.2', 'rule R205', 'autonomous scoring requirements').",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "The search query. Be specific and include section numbers, rule numbers, or key terms from the reference you're trying to find.",
      },
    },
    required: ["query"],
  },
};

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
  const selectedChunks = await filterAndRankChunks(
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
  const systemPrompt = buildSystemPrompt(true); // Enable tool support
  const userPrompt = buildUserPrompt(question, selectedChunks);

  const totalTokensEstimate =
    (await estimateTokens(systemPrompt)) + (await estimateTokens(userPrompt));
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

  // Step 7: Generate answer with LLM using tool support
  console.log("🤖 Generating answer with Claude (with tool support)...");

  // Track all chunks used (initial + tool searches)
  const allChunksUsed = [...selectedChunks];

  // Tool handler for search_manual
  const toolHandler = async (
    toolName: string,
    toolInput: Record<string, unknown>
  ): Promise<string> => {
    if (toolName === "search_manual") {
      const query = toolInput.query as string;
      const additionalContext = await searchManualForContext(query, 5);

      // Parse the retrieved chunks to add to sources
      // (This is a simplified version - in production you'd want more robust parsing)
      const queryEmbedding = await generateEmbedding(query);
      const results = await queryVectorStore(queryEmbedding, 5);

      if (results.documents.length > 0) {
        const toolChunks: RetrievedChunk[] = results.documents.map(
          (doc, idx) => ({
            text: doc,
            score: results.scores[idx],
            metadata: results.metadatas[idx] || {},
          })
        );
        allChunksUsed.push(...toolChunks);
      }

      return additionalContext;
    }
    throw new Error(`Unknown tool: ${toolName}`);
  };

  const answer = await generateChatCompletionWithTools(
    messages,
    [searchManualTool],
    toolHandler,
    { maxIterations: 3 }
  );

  console.log(`✅ Answer generated (${answer.length} chars)`);

  // Step 8: Extract sources from all chunks used
  const sources = extractSources(allChunksUsed);

  return {
    answer,
    sources,
    contextsUsed: allChunksUsed.length,
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
  const selectedChunks = await filterAndRankChunks(
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
  const systemPrompt = buildSystemPrompt(true); // Enable tool support
  const userPrompt = buildUserPrompt(question, selectedChunks);

  const totalTokensEstimate =
    (await estimateTokens(systemPrompt)) + (await estimateTokens(userPrompt));
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

  // Step 7: Use tool-based approach (non-streaming during tool calls, then stream final response)
  console.log(
    "🤖 Generating answer with Claude (with tool support, streaming final response)..."
  );

  // Track all chunks used
  const allChunksUsed = [...selectedChunks];

  // Tool handler for search_manual
  const toolHandler = async (
    toolName: string,
    toolInput: Record<string, unknown>
  ): Promise<string> => {
    if (toolName === "search_manual") {
      const query = toolInput.query as string;
      const additionalContext = await searchManualForContext(query, 5);

      // Parse the retrieved chunks to add to sources
      const queryEmbedding = await generateEmbedding(query);
      const results = await queryVectorStore(queryEmbedding, 5);

      if (results.documents.length > 0) {
        const toolChunks: RetrievedChunk[] = results.documents.map(
          (doc, idx) => ({
            text: doc,
            score: results.scores[idx],
            metadata: results.metadatas[idx] || {},
          })
        );
        allChunksUsed.push(...toolChunks);
      }

      return additionalContext;
    }
    throw new Error(`Unknown tool: ${toolName}`);
  };

  // Get the complete answer (with tool calls handled)
  const answer = await generateChatCompletionWithTools(
    messages,
    [searchManualTool],
    toolHandler,
    { maxIterations: 3 }
  );

  // Create a simple stream that yields the complete answer
  async function* answerStream() {
    // Yield answer in chunks for a smoother streaming experience
    const chunkSize = 50; // characters per chunk
    for (let i = 0; i < answer.length; i += chunkSize) {
      yield {
        type: "content_block_delta" as const,
        delta: { text: answer.slice(i, i + chunkSize) },
      };
    }
  }

  console.log(`✅ Answer generated (${answer.length} chars)`);

  // Step 8: Extract sources from all chunks used
  const sources = extractSources(allChunksUsed);

  return {
    stream: answerStream(),
    sources,
    contextsUsed: allChunksUsed.length,
    tokensEstimate: totalTokensEstimate,
  };
}

/**
 * Get RAG configuration
 */
export async function getRAGConfig() {
  return {
    topK: TOP_K_RESULTS,
    minSimilarityScore: MIN_SIMILARITY_SCORE,
    maxContextTokens: MAX_CONTEXT_TOKENS,
  };
}
