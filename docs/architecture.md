# System Architecture

## Overview

The FTC Decode Manual Chatbot is designed as a modular system that can process PDF content, understand natural language queries, and provide accurate responses about the competition manual.

## Project Goals (Proof of Concept)

- **Minimize Cost**: Use local vector database and optimize API usage
- **Fast Iteration**: Start with core functionality, skip auth and complex features
- **Local Development**: Everything should run on a single machine initially
- **Core Features**: PDF processing and vectorization are the priority

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Interface │    │   API Server    │    │  Local Storage  │
│                 │    │                 │    │                 │
│ • Web Chat UI   │◄──►│ • Query Router  │◄──►│ • PDF Content   │
│ • CLI (future)  │    │ • Validation    │    │ • ChromaDB      │
└─────────────────┘    └─────────────────┘    │ • Metadata      │
                                │              └─────────────────┘
                                ▼
                       ┌─────────────────┐
                       │   AI Engine     │
                       │                 │
                       │ • OpenAI API    │
                       │ • Embeddings    │
                       │ • Context Mgmt  │
                       └─────────────────┘
```

## Component Details

### 1. Document Processing Pipeline

**Purpose**: Convert PDF manual into searchable, structured content

**Components**:

- **PDF Parser**: Extract text, tables, and structure from manual
- **Text Chunker**: Split content into semantic chunks
- **Embedding Generator**: Create vector embeddings for similarity search
- **Metadata Extractor**: Extract sections, page numbers, and context

**Technologies**:

- **TypeScript**: `pdf-parse`, `@langchain/community`, `langchain`
- **Recommended for PoC**: Focus on TypeScript for rapid development

### 2. Vector Database (Decision: ChromaDB)

**Purpose**: Store and retrieve relevant manual sections locally

**Why ChromaDB for PoC**:

- **Free & Open Source**: No API costs
- **Runs Locally**: No external dependencies or network latency
- **Easy Setup**: Simple installation and configuration
- **Production Ready**: Can scale to cloud later if needed

**Features**:

- Semantic search capabilities
- Fast similarity matching
- Metadata filtering
- Persistent storage on disk

**Installation**:

```bash
pnpm add chromadb
```

### 3. Embeddings (Decision: Local Model)

**Purpose**: Convert text into vector embeddings for semantic search

**Why Local Embeddings for PoC**:

- **FREE**: No API costs whatsoever
- **Fast**: No network latency, runs on your machine
- **Privacy**: All data stays local
- **Unlimited**: Generate as many embeddings as needed

**Recommended Model**: `all-MiniLM-L6-v2`

- 384-dimension embeddings
- Fast inference on CPU
- Good quality for English text
- Small model size (~90MB)

**Installation**:

```bash
pnpm add @xenova/transformers
```

**Performance**:

- ~50-100 chunks/second on modern laptop
- ~2-5 minutes to process full manual
- No ongoing costs

**Cost Savings**: ~$2-5 one-time + $0.10-0.50/month ongoing = **~$30-60/year saved!**

### 4. AI/LLM Integration (Decision: OpenAI API)

**Purpose**: Generate natural language responses from retrieved content

**Why OpenAI for PoC**:

- **Pay-per-use**: Only pay for chat completions (not embeddings!)
- **High Quality**: Best responses for minimal tuning
- **Fast to Integrate**: Well-documented API
- **Cost Control**: Can set spending limits

**Cost Optimization Strategies**:

- ✅ **Use local embeddings** (biggest savings!)
- Cache common queries locally
- Use GPT-4-mini for all queries (10x cheaper than GPT-4)
- Limit context size to 3-5 chunks
- Implement response caching

**Components**:

- **Query Understanding**: Parse and understand user intent
- **Context Retrieval**: Find relevant manual sections via ChromaDB
- **Response Generation**: Create coherent, accurate answers
- **Citation Tracking**: Reference source pages/sections

### 4. API Layer

**Purpose**: Handle requests and routing

**PoC Approach**: Simple Express.js server without authentication

**Endpoints**:

```
POST /api/chat          # Send chat message
GET  /api/health        # Health check
POST /api/manual/process # Process PDF manual
GET  /api/manual/status  # Check processing status
```

**Features (PoC)**:

- Basic request validation
- Error handling
- Simple in-memory session storage
- **Skipped for PoC**: Authentication, rate limiting, user management

### 5. User Interface

**PoC Approach**: Start with assistant-ui.com web interface

- Rich chat components out of the box
- Minimal configuration needed
- Professional UI without custom development
- **Future**: Slack integration, mobile app

## Data Flow (PoC Focus)

### 1. Manual Processing (Priority #1)

```
PDF File → Parse Text & Structure → Chunk into Segments → Generate Embeddings (Local) → Store in ChromaDB
```

**Key Steps**:

1. Load PDF using `pdf-parse`
2. Extract text with page numbers and section metadata
3. Split into ~1000 token chunks with overlap
4. Generate embeddings using local model (@xenova/transformers)
5. Store in local ChromaDB with metadata

**Embedding Model Details**:

- Model: `Xenova/all-MiniLM-L6-v2`
- Dimension: 384
- Processing speed: ~50-100 chunks/second
- Total time: ~2-5 minutes for full manual
- Cost: $0 (runs on your CPU)

### 2. Query Processing (Priority #2)

```
User Query → Generate Embedding (Local) → Search ChromaDB → Retrieve Top Chunks → Send to OpenAI → Format Response
```

**Key Steps**:

1. User submits question via web UI
2. Generate query embedding using local model (instant, free)
3. Search ChromaDB for similar chunks (top 3-5)
4. Combine chunks with query in prompt
5. Send to OpenAI API (GPT-4-mini for cost)
6. Return response with source citations

## Deployment Architecture

### PoC (Current Focus)

```
Single Local Machine
├── Frontend (Next.js with assistant-ui)
├── Backend (Node.js/Express)
├── Embedding Model (@xenova/transformers - runs in Node.js)
├── Vector DB (ChromaDB - local file storage)
└── LLM (OpenAI API via HTTPS - only component with costs)
```

**Requirements**:

- Node.js 18+
- 4GB RAM (embedding model needs ~1GB)
- 2GB disk space for ChromaDB + model weights
- OpenAI API key (for chat completions only)

### Future Production (After PoC)

```
Cloud Platform (Vercel recommended for cost)
├── Frontend (Vercel Edge)
├── Backend (Vercel Serverless Functions)
├── Vector DB (Upgrade ChromaDB or migrate to managed)
├── LLM (OpenAI API)
└── CDN (PDF/static assets)
```

## Cost Optimization Strategies

### PoC Phase (Major Savings!)

- **Embeddings**: Local model (FREE - saves $2-5 one-time + $0.10-0.50/month)
- **Vector DB**: ChromaDB (FREE - runs locally)
- **LLM**: OpenAI API pay-as-you-go (~$0.20-1.00 per day for testing)
- **Hosting**: Local development (FREE)
- **Total PoC Cost**: ~$5-20/month (OpenAI chat completions only)

### Cost Controls

1. ✅ **Use local embeddings** (biggest cost savings - $30-60/year!)
2. **Cache responses** in memory for repeat questions
3. **Use GPT-4-mini** (10x cheaper than GPT-4) for all queries
4. **Limit context** to 3-5 most relevant chunks
5. **Set API spending limits** in OpenAI dashboard
6. **Track token usage** to optimize chunk sizes
7. **Batch process** manual updates to minimize reprocessing

### Cost Comparison

| Approach                          | Setup Cost | Monthly Cost |
| --------------------------------- | ---------- | ------------ |
| OpenAI Embeddings + GPT-4-mini    | $2-5       | $15-60       |
| **Local Embeddings + GPT-4-mini** | **$0**     | **$5-20**    |
| Local Embeddings + GPT-4          | $0         | $50-200      |

**Savings**: 70-80% cost reduction by using local embeddings!

## Security Considerations (PoC)

**Current Scope**:

- Secure storage of OpenAI API key in .env file
- Basic input validation and sanitization
- Local-only access (no public exposure)

**Skipped for PoC**:

- User authentication
- Rate limiting
- Access control
- Data encryption
- Audit logging

## Scalability (Future)

- Response caching for common queries
- Horizontal API scaling if needed
- ChromaDB can handle millions of vectors
- Migration path to managed vector DB if required

## Technology Stack Summary (PoC)

| Component       | Technology               | Reason                              |
| --------------- | ------------------------ | ----------------------------------- |
| Language        | TypeScript               | Fast development, great ecosystem   |
| Runtime         | Node.js 18+              | Modern, efficient, well-supported   |
| Package Manager | pnpm                     | Faster, more efficient than npm     |
| PDF Processing  | pdf-parse                | Simple, reliable, well-maintained   |
| **Embeddings**  | **@xenova/transformers** | **FREE, local, fast, no API costs** |
| Vector DB       | ChromaDB                 | Free, local, production-ready       |
| LLM             | OpenAI API (GPT-4-mini)  | Best quality, pay-as-you-go         |
| Web Framework   | Next.js                  | Great DX, easy deployment           |
| UI Components   | assistant-ui             | Pre-built chat components           |
| Backend         | Express.js               | Simple, familiar, lightweight       |

## PoC Development Roadmap

### Phase 1: PDF Processing & Vectorization (Priority)

1. ✅ **Documentation complete**
2. **Set up project structure** with TypeScript + pnpm
3. **Implement PDF processing pipeline**
   - Parse DECODE_Competition_Manual_TU1.pdf
   - Extract text and metadata (pages, sections)
   - Chunk content (1000 tokens, 200 overlap)
4. **Set up ChromaDB locally**
   - Install and configure
   - Create collection
   - Store embeddings with metadata
5. **Test retrieval** with sample queries

### Phase 2: Query & Response (Next)

6. **Integrate OpenAI API**
   - Set up embeddings endpoint
   - Test similarity search
   - Implement chat completion
7. **Build simple API**
   - Express.js server
   - Chat endpoint
   - Health check
8. **Test end-to-end** with command-line interface

### Phase 3: Web UI (Final)

9. **Set up Next.js with assistant-ui**
10. **Connect frontend to backend**
11. **Polish and document**

## Future Enhancements (Post-PoC)

- Authentication and user management
- Slack integration
- Rate limiting and cost controls
- Advanced caching strategies
- Analytics and usage tracking
- Multi-manual support (other years, Q&A documents)
- Production deployment to Vercel
