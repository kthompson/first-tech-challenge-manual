/**
 * Test Chat API Script
 *
 * Tests the chat endpoint with sample FTC questions
 */

import "dotenv/config";
import { answerQuestion } from "../lib/services/rag.js";

// Test questions
const TEST_QUESTIONS = [
  "What are the robot size restrictions?",
  "How many points is scoring in the autonomous period worth?",
  "What are the penalties for fouls?",
  "How long is a match?",
  "What are the team qualification requirements?",
];

/**
 * Test a single question
 */
async function testQuestion(question: string): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log(`❓ Question: ${question}`);
  console.log("=".repeat(80));

  try {
    const startTime = Date.now();
    const result = await answerQuestion(question);
    const duration = Date.now() - startTime;

    console.log("\n📝 Answer:");
    console.log(result.answer);

    console.log("\n📚 Sources:");
    result.sources.forEach((source, idx) => {
      console.log(
        `   ${idx + 1}. ${source.source} (Page ${
          source.page
        }, Score: ${source.score.toFixed(2)})`
      );
    });

    console.log("\n📊 Metadata:");
    console.log(`   - Contexts Used: ${result.contextsUsed}`);
    console.log(`   - Tokens Estimate: ${result.tokensEstimate}`);
    console.log(`   - Duration: ${duration}ms`);
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Main test function
 */
async function main() {
  console.log("🧪 FTC Decode Chatbot - Chat API Testing");
  console.log("========================================\n");

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY not found in environment");
    console.error(
      "💡 Set it in .env file or export OPENAI_API_KEY=your_key_here"
    );
    process.exit(1);
  }

  console.log("✅ OpenAI API key found");
  console.log(`🤖 Model: ${process.env.OPENAI_MODEL || "gpt-4o-mini"}`);
  console.log(`📊 Max tokens: ${process.env.OPENAI_MAX_TOKENS ?? "unlimited"}`);

  // Test each question
  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    await testQuestion(TEST_QUESTIONS[i]);

    // Small delay between questions
    if (i < TEST_QUESTIONS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ All tests complete!");
  console.log("=".repeat(80) + "\n");
}

// Run tests
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
