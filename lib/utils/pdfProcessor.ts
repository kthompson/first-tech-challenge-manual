/**
 * PDF Processor Utility
 *
 * Handles PDF loading, text extraction, and chunking
 */

import * as fs from "fs";
import { createRequire } from "module";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export interface PDFData {
  numpages: number;
  text: string;
  info?: any;
  metadata?: any;
}

export interface PageText {
  text: string;
  page: number;
}

export interface TextChunk {
  text: string;
  page: number;
  chunkIndex: number;
}

/**
 * Load and parse a PDF file
 */
export async function loadPDF(pdfPath: string): Promise<PDFData> {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found at: ${pdfPath}`);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const data: any = await pdfParse(dataBuffer);
  return data as PDFData;
}

/**
 * Extract text with page information
 * Note: pdf-parse doesn't provide per-page text easily,
 * so we estimate page breaks based on total pages
 */
export async function extractTextWithPages(
  pdfData: PDFData
): Promise<PageText[]> {
  const pageTexts: PageText[] = [];

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
    });
  }

  return pageTexts;
}

/**
 * Chunk text into smaller segments
 */
export async function chunkText(
  pageTexts: PageText[],
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<TextChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const chunks: TextChunk[] = [];
  let totalChunkIndex = 0;

  for (const pageText of pageTexts) {
    const pageChunks = await splitter.splitText(pageText.text);

    for (const chunkText of pageChunks) {
      chunks.push({
        text: chunkText,
        page: pageText.page,
        chunkIndex: totalChunkIndex++,
      });
    }
  }

  return chunks;
}

/**
 * Get text statistics
 */
export function getTextStats(text: string): {
  length: number;
  words: number;
  lines: number;
} {
  return {
    length: text.length,
    words: text.split(/\s+/).filter((w) => w.length > 0).length,
    lines: text.split("\n").length,
  };
}

/**
 * Get chunk statistics
 */
export function getChunkStats(chunks: TextChunk[]): {
  count: number;
  avgLength: number;
  minLength: number;
  maxLength: number;
  totalLength: number;
} {
  if (chunks.length === 0) {
    return {
      count: 0,
      avgLength: 0,
      minLength: 0,
      maxLength: 0,
      totalLength: 0,
    };
  }

  const lengths = chunks.map((c) => c.text.length);
  const totalLength = lengths.reduce((sum, len) => sum + len, 0);

  return {
    count: chunks.length,
    avgLength: Math.round(totalLength / chunks.length),
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
    totalLength,
  };
}
