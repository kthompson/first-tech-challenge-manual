import { NextResponse } from "next/server";
import { getVectorStoreStats } from "@/lib/services/vectorStore";
import { getRAGConfig } from "@/lib/services/rag";
import { getModelInfo } from "@/lib/services/claude";

export async function GET() {
  try {
    const vectorStats = await getVectorStoreStats();
    const ragConfig = getRAGConfig();
    const modelInfo = getModelInfo();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      vectorStore: {
        exists: vectorStats.exists,
        documents: vectorStats.count,
      },
      rag: ragConfig,
      claude: modelInfo,
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
