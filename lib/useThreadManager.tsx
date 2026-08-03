"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface BiobuzzMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    source: string;
    page: number;
    score: number;
  }>;
  id: string;
  createdAt: Date;
}

export interface Thread {
  id: string;
  title: string;
  messages: BiobuzzMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = "ftc-biobuzz-threads";
const CURRENT_THREAD_KEY = "ftc-biobuzz-current-thread";

// Helper to generate thread title from first message
function generateThreadTitle(firstMessage: string): string {
  const maxLength = 50;
  const cleaned = firstMessage.trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.substring(0, maxLength) + "...";
}

// Load threads from localStorage
function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const threads = JSON.parse(stored);
    // Convert date strings back to Date objects
    return threads.map((thread: Thread) => ({
      ...thread,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
      messages: thread.messages.map((msg: BiobuzzMessage) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
      })),
    }));
  } catch (error) {
    console.error("Error loading threads from localStorage:", error);
    return [];
  }
}

// Save threads to localStorage
function saveThreads(threads: Thread[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch (error) {
    console.error("Error saving threads to localStorage:", error);
  }
}

// Load current thread ID from localStorage
function loadCurrentThreadId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(CURRENT_THREAD_KEY);
  } catch (error) {
    console.error("Error loading current thread ID:", error);
    return null;
  }
}

// Save current thread ID to localStorage
function saveCurrentThreadId(threadId: string | null) {
  if (typeof window === "undefined") return;

  try {
    if (threadId) {
      localStorage.setItem(CURRENT_THREAD_KEY, threadId);
    } else {
      localStorage.removeItem(CURRENT_THREAD_KEY);
    }
  } catch (error) {
    console.error("Error saving current thread ID:", error);
  }
}

export function useThreadManager() {
  const [threads, setThreads] = useState<Thread[]>(loadThreads);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(
    loadCurrentThreadId
  );

  // Mirrors currentThreadId but updates synchronously, so callers that
  // create a thread and immediately write messages in the same tick (before
  // React commits the state update) still target the right thread.
  const currentThreadIdRef = useRef(currentThreadId);

  // Save threads whenever they change (after initial render)
  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  // Save current thread ID whenever it changes
  useEffect(() => {
    saveCurrentThreadId(currentThreadId);
  }, [currentThreadId]);

  // Create a new thread
  const createThread = useCallback((firstMessage?: string): Thread => {
    const now = new Date();
    const newThread: Thread = {
      id: `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: firstMessage
        ? generateThreadTitle(firstMessage)
        : "New Conversation",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    setThreads((prev) => [newThread, ...prev]);
    setCurrentThreadId(newThread.id);
    currentThreadIdRef.current = newThread.id;

    return newThread;
  }, []);

  // Switch to a different thread
  const switchThread = useCallback((threadId: string) => {
    setCurrentThreadId(threadId);
    currentThreadIdRef.current = threadId;
  }, []);

  // Delete a thread
  const deleteThread = useCallback(
    (threadId: string) => {
      setThreads((prev) => {
        const filtered = prev.filter((t) => t.id !== threadId);

        // If we deleted the current thread, switch to another or create new
        if (threadId === currentThreadIdRef.current) {
          const newId = filtered.length > 0 ? filtered[0].id : null;
          setCurrentThreadId(newId);
          currentThreadIdRef.current = newId;
        }

        return filtered;
      });
    },
    []
  );

  // Update messages in current thread
  const updateMessages = useCallback(
    (
      messagesOrUpdater:
        | BiobuzzMessage[]
        | ((prev: BiobuzzMessage[]) => BiobuzzMessage[])
    ) => {
      const threadId = currentThreadIdRef.current;
      if (!threadId) return;

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) return thread;

          const newMessages =
            typeof messagesOrUpdater === "function"
              ? messagesOrUpdater(thread.messages)
              : messagesOrUpdater;

          return {
            ...thread,
            messages: newMessages,
            updatedAt: new Date(),
            // Update title from first user message if not set
            title:
              thread.messages.length === 0 && newMessages.length > 0
                ? generateThreadTitle(newMessages[0].content)
                : thread.title,
          };
        })
      );
    },
    []
  );

  // Get current thread
  const currentThread = threads.find((t) => t.id === currentThreadId);

  // Get messages for current thread
  const messages = currentThread?.messages || [];

  return {
    threads,
    currentThreadId,
    currentThread,
    messages,
    createThread,
    switchThread,
    deleteThread,
    updateMessages,
  };
}
