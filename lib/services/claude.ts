"use server";

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
export async function getClaudeClient(): Promise<Anthropic> {
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
 * Tool definition for Claude
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Generate a chat completion with tool support, handling tool calls
 */
export async function generateChatCompletionWithTools(
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | Anthropic.MessageParam["content"];
  }>,
  tools: ClaudeTool[],
  toolHandler: (
    toolName: string,
    toolInput: Record<string, unknown>
  ) => Promise<string>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    maxIterations?: number;
  }
): Promise<string> {
  const client = await getClaudeClient();
  const maxIterations = options?.maxIterations ?? 5;
  let iterationCount = 0;

  // Extract system message
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages: Array<{
    role: "user" | "assistant";
    content: string | Anthropic.MessageParam["content"];
  }> = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  while (iterationCount < maxIterations) {
    iterationCount++;
    console.log(`   🔄 Tool iteration ${iterationCount}/${maxIterations}`);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: options?.maxTokens ?? MAX_TOKENS,
      temperature: options?.temperature ?? TEMPERATURE,
      system: systemMessage?.content as string,
      messages: conversationMessages as Anthropic.MessageParam[],
      tools,
    });

    console.log("   Claude Response:", {
      id: response.id,
      model: response.model,
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      contentBlocks: response.content.length,
    });

    // Check if we got a final text response
    if (response.stop_reason === "end_turn") {
      const textContent = response.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        return textContent.text;
      }
    }

    // Check for tool use
    const toolUseBlocks = response.content.filter(
      (c) => c.type === "tool_use"
    ) as Array<Anthropic.ToolUseBlock>;

    if (toolUseBlocks.length === 0) {
      // No tools used, return text if available
      const textContent = response.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        return textContent.text;
      }
      throw new Error("No text content and no tool use in response");
    }

    // Add assistant message with tool use
    conversationMessages.push({
      role: "assistant",
      content: response.content,
    });

    // Execute tools and collect results
    const toolResults: Array<Anthropic.ToolResultBlockParam> = [];
    for (const toolUse of toolUseBlocks) {
      console.log(
        `   🔧 Executing tool: ${toolUse.name} with input:`,
        toolUse.input
      );

      try {
        const result = await toolHandler(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
        console.log(`   ✅ Tool result received (${result.length} chars)`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`   ❌ Tool execution failed:`, errorMessage);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Error: ${errorMessage}`,
          is_error: true,
        });
      }
    }

    // Add user message with tool results
    conversationMessages.push({
      role: "user",
      content: toolResults,
    });
  }

  // If we hit max iterations, make one final call without tools to get an answer
  console.log(
    `   ⚠️  Max iterations (${maxIterations}) reached, requesting final answer without tools`
  );

  const finalResponse = await client.messages.create({
    model: MODEL,
    max_tokens: options?.maxTokens ?? MAX_TOKENS,
    temperature: options?.temperature ?? TEMPERATURE,
    system: systemMessage?.content as string,
    messages: conversationMessages as Anthropic.MessageParam[],
    // No tools provided - force a text response
  });

  console.log("   Claude Final Response:", {
    id: finalResponse.id,
    model: finalResponse.model,
    stopReason: finalResponse.stop_reason,
    inputTokens: finalResponse.usage.input_tokens,
    outputTokens: finalResponse.usage.output_tokens,
  });

  const textContent = finalResponse.content.find((c) => c.type === "text");
  if (textContent && textContent.type === "text") {
    return textContent.text;
  }

  throw new Error(
    "Failed to get text response after max iterations and final attempt"
  );
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
  const client = await getClaudeClient();

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
export async function estimateTokens(text: string): Promise<number> {
  // Rough estimate: 1 token ≈ 4 characters in English
  return Math.ceil(text.length / 4);
}

/**
 * Get model info
 */
export async function getModelInfo() {
  return {
    model: MODEL,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  };
}
