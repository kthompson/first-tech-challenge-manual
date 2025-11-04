/**
 * PDF Manual Processing Script
 *
 * This script:
 * 1. Downloads the latest FTC Decode manual PDF from FIRST website
 * 2. Extracts text with page numbers
 * 3. Chunks content into manageable segments
 * 4. Generates embeddings using LOCAL model (FREE!)
 * 5. Stores in vector database for semantic search
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { pipeline } from "@xenova/transformers";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  createVectorStore,
  addDocuments,
  saveVectorStore,
} from "../lib/services/vectorStore.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MANUAL_URL = "https://ftc-resources.firstinspires.org/ftc/game/manual";
const MANUAL_DIR = path.join(__dirname, "..", "manual");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = Math.floor(CHUNK_SIZE * 0.2);
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

interface PDFResult {
  numpages: number;
  text: string;
  info?: any;
  metadata?: any;
}

interface Chunk {
  text: string;
  page: number;
  chunkIndex: number;
  source: string; // PDF filename
}

/**
 * Download the manual from FTC website
 */
async function downloadManual(): Promise<string> {
  console.log(`📥 Downloading manual from: ${MANUAL_URL}`);

  try {
    const response = await fetch(MANUAL_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to download: ${response.status} ${response.statusText}`
      );
    }

    // Get filename from content-disposition header or use default
    const contentDisposition = response.headers.get("content-disposition");
    let filename = "FTC_Manual.pdf";

    if (contentDisposition) {
      const match = contentDisposition.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      );
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "");
      }
    }

    // Create manual directory if it doesn't exist
    if (!fs.existsSync(MANUAL_DIR)) {
      fs.mkdirSync(MANUAL_DIR, { recursive: true });
    }

    const filepath = path.join(MANUAL_DIR, filename);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));

    console.log(`✅ Downloaded manual to: ${filename}`);
    return filepath;
  } catch (error) {
    console.error(`❌ Failed to download manual:`, error);
    throw error;
  }
}

/**
 * Find all PDFs in manual directory
 */
function findPDFs(): string[] {
  console.log(`📁 Scanning for PDFs in: ${MANUAL_DIR}`);

  if (!fs.existsSync(MANUAL_DIR)) {
    throw new Error(`Manual directory not found: ${MANUAL_DIR}`);
  }

  const files = fs.readdirSync(MANUAL_DIR);
  const pdfFiles = files
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .map((file) => path.join(MANUAL_DIR, file));

  if (pdfFiles.length === 0) {
    throw new Error(`No PDF files found in: ${MANUAL_DIR}`);
  }

  console.log(`✅ Found ${pdfFiles.length} PDF(s):`);
  pdfFiles.forEach((pdf) => console.log(`   - ${path.basename(pdf)}`));

  return pdfFiles;
}

/**
 * Load and parse PDF file
 */
async function loadPDF(pdfPath: string): Promise<PDFResult> {
  console.log(`\n📄 Loading PDF: ${path.basename(pdfPath)}...`);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found at: ${pdfPath}`);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const data: any = await pdfParse(dataBuffer);

  console.log(
    `✅ PDF loaded: ${data.numpages} pages, ${data.text.length} characters`
  );

  return data;
}

/**
 * Extract text with page numbers
 */
async function extractTextWithPages(
  pdfData: PDFResult,
  source: string
): Promise<Array<{ text: string; page: number; source: string }>> {
  console.log("📝 Extracting text from pages...");

  // For simplicity in PoC, we'll treat the entire text as one block
  // In production, you'd parse page by page
  const pageTexts: Array<{ text: string; page: number; source: string }> = [];

  // Simple approach: estimate pages based on text length
  const avgCharsPerPage = Math.ceil(pdfData.text.length / pdfData.numpages);
  const lines = pdfData.text.split("\n");

  let currentPage = 1;
  let currentText = "";
  let charCount = 0;

  for (const line of lines) {
    currentText += line + "\n";
    charCount += line.length + 1;

    // Estimate page break
    if (charCount >= avgCharsPerPage && currentPage < pdfData.numpages) {
      pageTexts.push({
        text: currentText.trim(),
        page: currentPage,
        source,
      });
      currentPage++;
      currentText = "";
      charCount = 0;
    }
  }

  // Add remaining text
  if (currentText.trim()) {
    pageTexts.push({
      text: currentText.trim(),
      page: currentPage,
      source,
    });
  }

  console.log(`✅ Extracted text from ${pageTexts.length} page sections`);

  return pageTexts;
}

/**
 * Split text into chunks
 */
async function chunkText(
  pageTexts: Array<{ text: string; page: number; source: string }>
): Promise<Chunk[]> {
  console.log("✂️  Chunking text...");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const chunks: Chunk[] = [];
  let totalChunkIndex = 0;

  for (const pageText of pageTexts) {
    const pageChunks = await splitter.splitText(pageText.text);

    for (const chunkText of pageChunks) {
      chunks.push({
        text: chunkText,
        page: pageText.page,
        chunkIndex: totalChunkIndex++,
        source: pageText.source,
      });
    }
  }

  console.log(
    `✅ Created ${chunks.length} chunks (avg ${Math.round(
      chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length
    )} chars per chunk)`
  );

  return chunks;
}

/**
 * Generate embeddings using LOCAL model (FREE!)
 */
async function generateEmbeddings(chunks: Chunk[]): Promise<number[][]> {
  console.log(`🤖 Loading local embedding model: ${EMBEDDING_MODEL}`);
  console.log("   (First run will download ~90MB model, then cached)");

  const embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);

  console.log("✅ Model loaded! Generating embeddings...");

  const embeddings: number[][] = [];
  const batchSize = 10;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchTexts = batch.map((c) => c.text);

    // Generate embeddings for batch
    const batchEmbeddings = await Promise.all(
      batchTexts.map(async (text) => {
        const output = await embedder(text, {
          pooling: "mean",
          normalize: true,
        });
        return Array.from(output.data) as number[];
      })
    );

    embeddings.push(...batchEmbeddings);

    const progress = Math.min(i + batchSize, chunks.length);
    const percent = Math.round((progress / chunks.length) * 100);
    console.log(
      `   Progress: ${percent}% (${progress}/${chunks.length} chunks)`
    );
  }

  console.log(
    `✅ Generated ${embeddings.length} embeddings (${embeddings[0].length} dimensions)`
  );
  console.log(`   💰 Cost: $0 (local model!)`);

  return embeddings;
}

/**
 * Store in vector database
 */
async function storeInVectorDB(
  chunks: Chunk[],
  embeddings: number[][]
): Promise<void> {
  console.log("💾 Creating vector store...");

  // Create fresh vector store
  await createVectorStore();

  console.log("✅ Vector store created");
  console.log("📝 Adding documents...");

  // Prepare metadata with source filename
  const metadatas = chunks.map((c) => ({
    page: c.page,
    chunkIndex: c.chunkIndex,
    length: c.text.length,
    source: c.source,
  }));

  // Add documents with progress tracking
  await addDocuments(
    chunks.map((c) => c.text),
    embeddings,
    metadatas,
    (added: number, total: number) => {
      console.log(`   Added ${added}/${total} documents`);
    }
  );

  console.log("✅ All documents added");
  console.log("💾 Saving to disk...");

  // Save to disk
  await saveVectorStore();

  console.log("✅ Vector store saved");
}

/**
 * Main processing function
 */
async function main() {
  console.log("🚀 FTC Decode Manual Processing Started");
  console.log("========================================\n");

  const startTime = Date.now();

  try {
    // Step 0: Download the latest manual
    console.log("📥 Downloading latest FTC manual...\n");
    await downloadManual();

    // Step 1: Find all PDFs (including the one we just downloaded)
    const pdfPaths = findPDFs();

    let totalPages = 0;
    const allChunks: Chunk[] = [];

    // Process each PDF
    for (const pdfPath of pdfPaths) {
      const filename = path.basename(pdfPath);

      // Step 2: Load PDF
      const pdfData = await loadPDF(pdfPath);
      totalPages += pdfData.numpages;

      // Step 3: Extract text with page numbers
      const pageTexts = await extractTextWithPages(pdfData, filename);

      // Step 4: Chunk text
      const chunks = await chunkText(pageTexts);
      allChunks.push(...chunks);
    }

    console.log(`\n📊 Total from all PDFs:`);
    console.log(`   - PDFs: ${pdfPaths.length}`);
    console.log(`   - Pages: ${totalPages}`);
    console.log(`   - Chunks: ${allChunks.length}`);

    // Step 5: Generate embeddings (LOCAL - FREE!)
    const embeddings = await generateEmbeddings(allChunks);

    // Step 6: Store in vector database
    await storeInVectorDB(allChunks, embeddings);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log("\n========================================");
    console.log("✅ Processing Complete!");
    console.log(`⏱️  Time: ${duration} seconds`);
    console.log(`📊 Stats:`);
    console.log(`   - PDFs: ${pdfPaths.length}`);
    console.log(`   - Pages: ${totalPages}`);
    console.log(`   - Chunks: ${allChunks.length}`);
    console.log(
      `   - Embeddings: ${embeddings.length} x ${embeddings[0].length}D`
    );
    console.log(`   - Cost: $0 (all local!)`);
    console.log("\n🎉 Ready for queries! Run: pnpm test:retrieval");
  } catch (error) {
    console.error("\n❌ Error during processing:", error);
    process.exit(1);
  }
}

// Run the main function
main();
