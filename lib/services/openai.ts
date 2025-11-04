/**
 * OpenAI Service
 *
 * Wrapper for OpenAI API calls with error handling and configuration
 */

import OpenAI from "openai";

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MAX_TOKENS = process.env.OPENAI_MAX_TOKENS
  ? parseInt(process.env.OPENAI_MAX_TOKENS, 10)
  : undefined;
const TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || "0.7");

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Get OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY not found in environment variables. Please add it to your .env file."
    );
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

/**
 * Generate a chat completion
 */
export async function generateChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }
): Promise<string> {
  const client = getOpenAIClient();

  const requestParams: any = {
    model: MODEL,
    messages,
    temperature: options?.temperature ?? TEMPERATURE,
    stream: false,
  };

  // Only set max_completion_tokens if explicitly provided
  if (options?.maxTokens || MAX_TOKENS) {
    requestParams.max_completion_tokens = options?.maxTokens ?? MAX_TOKENS;
  }

  const response = await client.chat.completions.create(requestParams);

  // Debug logging
  console.log("   OpenAI Response:", {
    id: response.id,
    model: response.model,
    choices: response.choices.length,
    finishReason: response.choices[0]?.finish_reason,
    completionTokens: response.usage?.completion_tokens,
    reasoningTokens:
      response.usage?.completion_tokens_details?.reasoning_tokens,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    console.error("   Full response:", JSON.stringify(response, null, 2));
    throw new Error(
      `No content in OpenAI response. Finish reason: ${
        response.choices[0]?.finish_reason || "unknown"
      }`
    );
  }

  return content;
}

/**
 * Generate a streaming chat completion
 */
export async function generateStreamingChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const client = getOpenAIClient();

  const stream = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: options?.temperature ?? TEMPERATURE,
    max_completion_tokens: options?.maxTokens ?? MAX_TOKENS,
    stream: true,
  });

  return stream;
}

/**
 * Estimate token count (rough approximation)
 * More accurate would use tiktoken, but this is good enough for PoC
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
