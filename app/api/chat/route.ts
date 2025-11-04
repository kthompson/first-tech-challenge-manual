import { NextRequest, NextResponse } from "next/server";
import { answerQuestion, answerQuestionStreaming } from "@/lib/services/rag";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, conversationHistory = [], stream = false } = body;

    // Validation
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Field 'question' is required and must be a string",
        },
        { status: 400 }
      );
    }

    if (question.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Question cannot be empty",
        },
        { status: 400 }
      );
    }

    if (question.length > 1000) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Question is too long (max 1000 characters)",
        },
        { status: 400 }
      );
    }

    console.log(
      `\n💬 Chat request: "${question}" (stream: ${stream}, history: ${conversationHistory.length} messages)`
    );

    // Handle streaming
    if (stream) {
      try {
        const startTime = Date.now();
        const result = await answerQuestionStreaming(
          question,
          conversationHistory
        );

        // Create a readable stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              // Send initial metadata
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "metadata",
                    sources: result.sources,
                    contextsUsed: result.contextsUsed,
                    tokensEstimate: result.tokensEstimate,
                  })}\n\n`
                )
              );

              // Stream the response
              for await (const chunk of result.stream) {
                // Claude returns { type: "content_block_delta", delta: { text: "..." } }
                if (chunk.type === "content_block_delta" && chunk.delta?.text) {
                  const content = chunk.delta.text;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "content",
                        content: content,
                      })}\n\n`
                    )
                  );
                }
              }

              const duration = Date.now() - startTime;
              console.log(`✅ Streaming response completed in ${duration}ms\n`);

              // Send completion event
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "done",
                    metadata: {
                      durationMs: duration,
                    },
                  })}\n\n`
                )
              );

              controller.close();
            } catch (error) {
              console.error("Streaming error:", error);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error:
                      error instanceof Error ? error.message : "Unknown error",
                  })}\n\n`
                )
              );
              controller.close();
            }
          },
        });

        return new NextResponse(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (error) {
        console.error("Streaming setup error:", error);
        return NextResponse.json(
          {
            error: "Internal Server Error",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Non-streaming response (original behavior)
    const startTime = Date.now();
    const result = await answerQuestion(question, conversationHistory);
    const duration = Date.now() - startTime;

    console.log(`✅ Response generated in ${duration}ms\n`);

    // Send response
    return NextResponse.json({
      question,
      answer: result.answer,
      sources: result.sources,
      metadata: {
        contextsUsed: result.contextsUsed,
        tokensEstimate: result.tokensEstimate,
        durationMs: duration,
      },
    });
  } catch (error) {
    console.error("Chat error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("ANTHROPIC_API_KEY")) {
        return NextResponse.json(
          {
            error: "Configuration Error",
            message:
              "Anthropic API key not configured. Please set ANTHROPIC_API_KEY in .env",
          },
          { status: 500 }
        );
      }

      if (error.message.includes("No relevant content")) {
        return NextResponse.json(
          {
            error: "Not Found",
            message: "Could not find relevant information in the manual",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: error.message,
        },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "An unknown error occurred",
        },
        { status: 500 }
      );
    }
  }
}
