# Proof of Concept Plan

## Executive Summary

Build a minimal viable chatbot that can answer questions from the FTC Decode manual with:

- **Minimal cost** (~$5-20/month for OpenAI API only - embeddings are FREE)
- **Local development** (no cloud dependencies)
- **Core functionality** (PDF processing + Q&A)

## Decisions Made ✅

| Decision           | Choice                        | Rationale                              |
| ------------------ | ----------------------------- | -------------------------------------- |
| **Language**       | TypeScript                    | Fast development, great ecosystem      |
| **Vector DB**      | ChromaDB (local)              | Free, no cloud costs, production-ready |
| **Embeddings**     | Local model (transformers.js) | FREE - no API costs                    |
| **LLM Provider**   | OpenAI API                    | Best quality, pay-as-you-go            |
| **Cost Model**     | GPT-4-mini default            | 10x cheaper than GPT-4                 |
| **Authentication** | Skip for PoC                  | Not needed for local testing           |
| **Rate Limiting**  | Skip for PoC                  | Not needed for single user             |
| **Deployment**     | Local only                    | Defer cloud deployment                 |

## PoC Phases

### Phase 1: PDF Processing & Vectorization (PRIORITY) 🎯

**Goal**: Successfully process the FTC Decode manual and store in ChromaDB

**Tasks**:

1. ✅ Set up project structure with pnpm
2. ✅ Install dependencies (pdf-parse, langchain, chromadb, @xenova/transformers)
3. ✅ Configure environment (.env with OpenAI key for LLM only)
4. **Create `scripts/process-manual.ts`**:
   - Load DECODE_Competition_Manual_TU1.pdf
   - Extract text with page numbers
   - Split into chunks (~1000 tokens, 200 overlap)
   - Generate embeddings using local model (all-MiniLM-L6-v2 or similar)
   - Store in ChromaDB with metadata
5. **Create `scripts/test-retrieval.ts`**:
   - Test sample queries
   - Verify relevant chunks returned
   - Check similarity scores

**Success Criteria**:

- PDF fully processed without errors
- All chunks stored in ChromaDB
- Sample queries return relevant content
- Page numbers correctly tracked
- Embeddings generated locally (no API costs)

**Estimated Time**: 4-8 hours

**Estimated Cost**: $0 (fully local)

---

### Phase 2: Query & Response (NEXT)

**Goal**: Answer questions using retrieved context

**Tasks**:

1. **Create simple Express API**:
   - POST /api/chat endpoint
   - Health check endpoint
2. **Implement RAG pipeline**:
   - Embed user query
   - Search ChromaDB for top 3-5 chunks
   - Format prompt with context
   - Call OpenAI API for response
   - Return with source citations
3. **Test with CLI or curl**:
   - Ask 10-20 sample questions
   - Verify accuracy
   - Check response quality

**Success Criteria**:

- API responds to queries
- Answers are accurate and cite sources
- Response time under 5 seconds
- Cost per query under $0.01

**Estimated Time**: 4-6 hours

**Estimated Cost**: $1-2/day for testing

---

### Phase 3: Web UI (FINAL)

**Goal**: User-friendly interface for asking questions

**Tasks**:

1. **Set up Next.js project**
2. **Install assistant-ui components**
3. **Create chat interface**:
   - Message input
   - Response display
   - Source citations
   - Loading states
4. **Connect to backend API**
5. **Basic styling**

**Success Criteria**:

- Clean, functional chat UI
- Works on desktop and mobile
- Shows source citations clearly
- No crashes or errors

**Estimated Time**: 6-10 hours

**Estimated Cost**: $0 (no additional API costs)

---

## Total PoC Estimates

- **Development Time**: 14-24 hours
- **One-time Costs**: $0 (embeddings are local and free!)
- **Ongoing Costs**: $5-20/month (OpenAI for chat responses only)
- **Infrastructure**: $0 (all local)

## Testing Plan

### Functional Tests

- [ ] PDF parsing extracts all text
- [ ] Chunks contain complete information
- [ ] Embeddings generated successfully
- [ ] ChromaDB stores and retrieves correctly
- [ ] Queries return relevant chunks
- [ ] OpenAI generates accurate responses
- [ ] Source citations include correct page numbers

### Quality Tests

- [ ] Answers to 20 sample questions are accurate
- [ ] Response time < 5 seconds
- [ ] Cost per query < $0.01
- [ ] No hallucinations or made-up rules
- [ ] Citations match actual manual content

### Sample Test Questions

1. What are the robot size constraints in FTC Decode?
2. How many points is a high goal worth?
3. What happens during the autonomous period?
4. What are the weight limits for robots?
5. What safety requirements must be met?
6. How long is each match?
7. What are the field dimensions?
8. What is the penalty for a foul?
9. Can teams use custom electronics?
10. What materials are prohibited?

## Risk Mitigation

| Risk                        | Impact | Mitigation                                                |
| --------------------------- | ------ | --------------------------------------------------------- |
| OpenAI API costs too high   | High   | Set spending limits, cache responses, use GPT-4-mini      |
| PDF parsing fails           | High   | Test with sample PDF first, handle errors gracefully      |
| ChromaDB performance issues | Medium | Start with small chunks, can optimize later               |
| Poor answer quality         | High   | Fine-tune chunk size, prompt engineering, test thoroughly |
| Manual updates break system | Low    | Version control, document processing steps                |

## Success Metrics

### Must Have (for PoC to be successful)

- ✅ PDF fully processed and vectorized
- ✅ Q&A system returns accurate answers
- ✅ Source citations work correctly
- ✅ Total cost under $100 for PoC phase

### Nice to Have

- Response time under 3 seconds
- Web UI deployed
- Cache for common questions
- Cost under $0.005 per query

### Not Required for PoC

- Authentication
- Multiple users
- Production deployment
- Slack integration
- Advanced analytics

## Next Steps After PoC

Once PoC is validated:

1. **Evaluate results**: Is accuracy good enough?
2. **Measure costs**: Is it sustainable?
3. **User feedback**: Show to team members
4. **Decide**: Continue to production or pivot?

If continuing:

- Add authentication
- Deploy to Vercel
- Implement caching
- Add Slack integration
- Monitor and optimize costs
- Support multiple teams

## Development Environment

```
Project Root
├── DECODE_Competition_Manual_TU1.pdf  # Source manual
├── .env                                # API keys (gitignored)
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── scripts/
│   ├── process-manual.ts              # PDF → ChromaDB
│   └── test-retrieval.ts              # Test queries
├── src/
│   ├── server.ts                      # Express API (phase 2)
│   └── services/
│       ├── vectorStore.ts             # ChromaDB wrapper
│       ├── llm.ts                     # OpenAI wrapper
│       └── rag.ts                     # RAG pipeline
└── chroma_data/                       # ChromaDB storage (gitignored)
```

## Command Reference

```bash
# Setup
pnpm install
cp .env.example .env  # Add your OpenAI key

# Phase 1: Process manual
pnpm process-manual

# Phase 1: Test retrieval
pnpm test:retrieval

# Phase 2: Start API server
pnpm dev

# Phase 3: Start web UI
cd ui && pnpm dev
```

## Budget Tracking

Track spending at: https://platform.openai.com/account/usage

**Expected breakdown**:

- Embeddings: $0 (local model - FREE!)
  - ~150 pages × ~5 chunks/page = ~750 chunks
  - Processing time: ~2-5 minutes on local machine
  - Uses: all-MiniLM-L6-v2 or similar (384-dimension embeddings)
- Queries (ongoing): $0.002-0.01 per query
  - GPT-4-mini: ~$0.005/query
  - 20 queries/day × 30 days = $3-6/month
- Testing: $1-2/day during active development

**Total PoC budget**: $20 (includes buffer)

**Cost Savings**: ~$50-80/month by using local embeddings!

---

**Last Updated**: November 3, 2025  
**Status**: Ready to begin Phase 1
