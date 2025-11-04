/**
 * Claude Service
 *
 * Wrapper for Anthropic Claude API calls with error handling and configuration
 */

import Anthropic from "@anthropic-ai/sdk";

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022";
const MAX_TOKENS = process.env.CLAUDE_MAX_TOKENS
  ? parseInt(process.env.CLAUDE_MAX_TOKENS, 10)
  : 4096;
const TEMPERATURE = parseFloat(process.env.CLAUDE_TEMPERATURE || "1.0");

// Singleton Claude client
let claudeClient: Anthropic | null = null;

/**
 * Get Claude client instance
 */
export function getClaudeClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY not found in environment variables. Please add it to your .env file."
    );
  }

  if (!claudeClient) {
    claudeClient = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
  }

  return claudeClient;
}

/**
 * Generate a chat completion
 */
export async function generateChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getClaudeClient();

  // Extract system message
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: options?.maxTokens ?? MAX_TOKENS,
    temperature: options?.temperature ?? TEMPERATURE,
    system: systemMessage?.content,
    messages: conversationMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  // Debug logging
  console.log("   Claude Response:", {
    id: response.id,
    model: response.model,
    stopReason: response.stop_reason,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  const content = response.content[0];

  if (!content || content.type !== "text") {
    console.error("   Full response:", JSON.stringify(response, null, 2));
    throw new Error(
      `No text content in Claude response. Stop reason: ${
        response.stop_reason || "unknown"
      }`
    );
  }

  return content.text;
}

/**
 * Generate a streaming chat completion
 */
export async function* generateStreamingChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): AsyncGenerator<{ type: string; delta?: { text?: string } }> {
  const client = getClaudeClient();

  // Extract system message
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: options?.maxTokens ?? MAX_TOKENS,
    temperature: options?.temperature ?? TEMPERATURE,
    system: systemMessage?.content,
    messages: conversationMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield {
        type: "content_block_delta",
        delta: {
          text: event.delta.text,
        },
      };
    } else if (event.type === "message_stop") {
      console.log("   Claude stream completed");
      break;
    }
  }
}

/**
 * Estimate token count (rough approximation)
 * More accurate would use Claude's tokenizer, but this is good enough for PoC
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters in English
  return Math.ceil(text.length / 4);
}

/**
 * Get model info
 */
export function getModelInfo() {
  return {
    model: MODEL,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  };
}
