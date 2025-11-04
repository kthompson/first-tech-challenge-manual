"use client";

import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
} from "@assistant-ui/react";
import { useState } from "react";
import { useThreadManager, type DecodeMessage } from "./useThreadManager";

// Use relative API URL since the API is now part of the Next.js app
const API_URL = "";

// Convert DecodeMessage to ThreadMessageLike
const convertMessage = (message: DecodeMessage): ThreadMessageLike => {
  const baseMessage: ThreadMessageLike = {
    role: message.role,
    content: [{ type: "text", text: message.content }],
    id: message.id,
    createdAt: message.createdAt,
  };

  // Add sources as metadata if they exist
  if (message.sources && message.sources.length > 0) {
    return {
      ...baseMessage,
      metadata: {
        custom: {
          sources: message.sources,
        },
      },
    };
  }

  return baseMessage;
};

export function useDecodeRuntime() {
  const threadManager = useThreadManager();
  const { messages, updateMessages, currentThreadId, createThread } =
    threadManager;
  const [isRunning, setIsRunning] = useState(false);

  const sendMessage = async (userText: string) => {
    // Ensure we have a thread
    if (!currentThreadId) {
      createThread(userText);
    }

    setIsRunning(true);

    // Create an assistant message that will be updated as we stream
    const assistantId = `assistant-${Date.now()}`;
    let assistantContent = "";
    let sources: DecodeMessage["sources"] = [];

    try {
      // Build conversation history (exclude the current message which was just added)
      const conversationHistory = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Call our API with streaming and conversation history
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userText,
          conversationHistory,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.type === "metadata") {
              // Store sources from metadata
              sources = data.sources;
            } else if (data.type === "content") {
              // Append content and update message
              assistantContent += data.content;

              updateMessages((prev: DecodeMessage[]) => {
                const existing = prev.find(
                  (m: DecodeMessage) => m.id === assistantId
                );
                if (existing) {
                  // Update existing message
                  return prev.map((m: DecodeMessage) =>
                    m.id === assistantId
                      ? { ...m, content: assistantContent, sources }
                      : m
                  );
                } else {
                  // Create new message
                  return [
                    ...prev,
                    {
                      role: "assistant" as const,
                      content: assistantContent,
                      sources,
                      id: assistantId,
                      createdAt: new Date(),
                    },
                  ];
                }
              });
            } else if (data.type === "done") {
              console.log("Stream completed", data.metadata);
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error calling API:", error);

      // Add error message
      const errorMessage: DecodeMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please make sure the API server is running on ${API_URL}.`,
        id: `error-${Date.now()}`,
        createdAt: new Date(),
      };
      updateMessages((prev: DecodeMessage[]) => [...prev, errorMessage]);
    } finally {
      setIsRunning(false);
    }
  };

  const onNew = async (message: AppendMessage) => {
    // Extract text content
    if (message.content.length !== 1 || message.content[0]?.type !== "text") {
      throw new Error("Only text content is supported");
    }

    const userText = message.content[0].text;

    // Add user message
    const userMessage: DecodeMessage = {
      role: "user",
      content: userText,
      id: `user-${Date.now()}`,
      createdAt: new Date(),
    };
    updateMessages((prev: DecodeMessage[]) => [...prev, userMessage]);

    // Call the sendMessage function to get the assistant response
    await sendMessage(userText);
  };

  const onReload = async (parentId: string | null) => {
    // Find the message to reload (the last user message before the assistant response we're reloading)
    const messageIndex = messages.findIndex(
      (m: DecodeMessage) => m.id === parentId
    );
    if (messageIndex === -1) return;

    // Find the user message that prompted this assistant response
    let userMessage: DecodeMessage | undefined;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        userMessage = messages[i];
        break;
      }
    }

    if (!userMessage) {
      console.error("Could not find user message to reload");
      return;
    }

    // Remove all messages after and including the message being reloaded
    updateMessages((prev: DecodeMessage[]) => prev.slice(0, messageIndex));

    // Re-send the user's message to get a new response
    await sendMessage(userMessage.content);
  };

  const runtime = useExternalStoreRuntime<DecodeMessage>({
    messages,
    setMessages: (newMessages) => updateMessages([...newMessages]),
    isRunning,
    onNew,
    onReload,
    convertMessage,
  });

  return { runtime, threadManager };
}
