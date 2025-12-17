"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { useDecodeRuntime } from "@/lib/useDecodeRuntime";
import { useResponsiveSidebar } from "@/lib/useResponsiveSidebar";

export default function Home() {
  const { runtime, threadManager } = useDecodeRuntime();
  const { showSidebar, setShowSidebar, isMobile } = useResponsiveSidebar();

  const handleNewThread = () => {
    threadManager.createThread();
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
        {/* Mobile Overlay */}
        {showSidebar && isMobile && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar with Thread List */}
        {showSidebar && (
          <div
            className={`${
              isMobile
                ? "fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out"
                : "w-64 shrink-0"
            }`}
          >
            <div className="relative h-full">
              {isMobile && (
                <button
                  onClick={() => setShowSidebar(false)}
                  className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Close sidebar"
                >
                  <svg
                    className="w-5 h-5 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              <ThreadList
                threads={threadManager.threads}
                currentThreadId={threadManager.currentThreadId}
                onSelectThread={(id) => {
                  threadManager.switchThread(id);
                  if (isMobile) setShowSidebar(false);
                }}
                onDeleteThread={threadManager.deleteThread}
                onNewThread={() => {
                  handleNewThread();
                  if (isMobile) setShowSidebar(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl">🤖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base sm:text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                    FTC DECODE Assistant
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                    Competition Manual Expert
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Online
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Thread Container */}
          <div className="flex-1 overflow-hidden">
            <Thread />
          </div>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
