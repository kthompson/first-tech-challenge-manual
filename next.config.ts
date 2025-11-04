import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle canvas module which requires native dependencies
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        canvas: "commonjs canvas",
      });
    }
    return config;
  },
  // Allow loading environment variables
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL,
    RAG_TOP_K: process.env.RAG_TOP_K,
    RAG_MIN_SCORE: process.env.RAG_MIN_SCORE,
    RAG_MAX_CONTEXT_TOKENS: process.env.RAG_MAX_CONTEXT_TOKENS,
    VECTOR_STORE_PATH: process.env.VECTOR_STORE_PATH,
  },
};

export default nextConfig;
