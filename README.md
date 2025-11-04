# FTC Decode Manual Chatbot (Proof of Concept)

A conversational AI assistant that helps teams quickly find information from the FIRST Tech Challenge (FTC) Decode Challenge manual.

## Current Status: Complete! ✅

**Completed:**

- ✅ **Phase 1:** PDF processing and vectorization with multi-PDF support
- ✅ **Phase 2:** RAG-powered Chat API with Claude integration
- ✅ **Phase 3:** Next.js Web UI with assistant-ui.com
- ✅ **Migration:** Unified Next.js app (no separate backend server)
- ✅ FREE local embeddings (70-90% cost savings!)
- ✅ Source attribution with page numbers and filenames

**Deferred:** Authentication, rate limiting, production deployment

## What is This?

This project provides an intelligent chatbot interface to query the FTC Decode Competition Manual. The bot can answer questions about rules, regulations, game mechanics, scoring, and other competition details.

## PoC Goals & Achievements

- ✅ **Minimize Cost**: $0 for embeddings (local), ~$1-10/month for chat (OpenAI)
- ✅ **Core Functionality**: Working end-to-end Q&A system
- ✅ **Fast Iteration**: Phase 1 & 2 complete in record time
- ✅ **Local Development**: Runs entirely on a single machine

## Features (PoC)

- 🤖 **Natural Language Queries**: Ask questions in plain English

## Key Features

- 🤖 **RAG-Powered Q&A**: Ask questions, get accurate answers with sources
- 📚 **Multi-PDF Support**: Processes all PDFs in `manual/` folder
- 📄 **Source Attribution**: Tracks which manual version each answer comes from
- 🔢 **FREE Embeddings**: Local model (no API costs for vectorization)
- 💾 **Local Vector Storage**: Simple JSON-based store (ChromaDB-ready)
- 🎯 **Context-Aware**: Cites specific rules, pages, and manual versions
- 💰 **Cost-Optimized**: ~$1-10/month total (70-90% savings with local embeddings!)
- ⚡ **Fast Responses**: Answers in 2-5 seconds

## Technology Stack

- **Framework**: Next.js 16 (unified frontend + backend)
- **Language**: TypeScript
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm (workspace)
- **PDF Processing**: pdf-parse + LangChain
- **Embeddings**: @xenova/transformers (Xenova/all-MiniLM-L6-v2, FREE)
- **Vector Database**: JSON-based in-memory store (ChromaDB-ready)
- **LLM**: Anthropic Claude (Haiku 4.5 for cost optimization)
- **UI**: Next.js + assistant-ui.com (React components)

### Cost Breakdown

**Phase 1 (PDF Processing):**

- Embeddings: $0 (local model)
- Vector Storage: $0 (local JSON)
- Total: **$0/month**

**Phase 2-3 (Chat + Web UI):**

- Embeddings: $0 (still local!)
- Chat Completions: ~$1-10/month (Claude Haiku)
- Hosting: $0 (local) or ~$0-20/month (Vercel)
- Total: **~$1-10/month** (or $1-30 with hosting)

**Savings: 70-90%** compared to cloud embeddings + chat!

### Future Enhancements

- Slack integration
- Authentication & rate limiting
- Production deployment (Vercel)
- Advanced caching & analytics

## Project Structure

```
/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes (health, chat)
│   │   ├── health/route.ts
│   │   └── chat/route.ts
│   ├── page.tsx                # Main chat UI
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
├── components/                 # React UI components
│   ├── assistant-ui/           # Chat interface components
│   └── ui/                     # Reusable UI components
├── lib/                        # Services and utilities
│   ├── services/               # RAG, Claude, embeddings, vector store
│   ├── utils/                  # PDF processor, helpers
│   └── useDecodeRuntime.tsx    # Chat runtime hook
├── scripts/                    # Data processing scripts
│   ├── process-manual.ts       # Process PDFs into vector store
│   ├── test-retrieval.ts       # Test vector search
│   └── test-chat.ts            # Test chat functionality
├── manual/                     # PDF manuals (input)
│   └── *.pdf
├── data/                       # Vector store (output)
│   └── vector_store.json
├── docs/                       # Documentation
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Quick Start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your ANTHROPIC_API_KEY
   ```

3. **Process the manual** (one-time setup)

   ```bash
   pnpm process-manual
   ```

4. **Run the app**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to use the chatbot!

## Development

- **Start dev server**: `pnpm dev`
- **Build for production**: `pnpm build`
- **Start production**: `pnpm start`
- **Process manuals**: `pnpm process-manual`
- **Test retrieval**: `pnpm test:retrieval`
- **Test chat**: `pnpm test:chat`

All commands run from the project root.

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key:
   # OPENAI_API_KEY=sk-proj-...your-key-here
   ```

   Get an API key at: https://platform.openai.com/api-keys

4. **Process the manual**

   ```bash
   pnpm process-manual
   ```

5. **Start the API server**

   ```bash
   pnpm dev
   ```

6. **Test the chatbot**

   ```bash
   # In another terminal:
   pnpm test:chat

   # Or use curl:
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"question": "What are the robot size restrictions?"}'
   ```

### Handling Manual Updates

The FTC Decode manual receives regular updates throughout the season. To add new manual versions:

1. **Download** the updated PDF from the FIRST website
2. **Place** it in the `manual/` folder (e.g., `DECODE_Competition_Manual_TU2.pdf`)
3. **Reprocess** the vector database:

   ```bash
   pnpm process-manual
   ```

The system will automatically:

- Find all PDFs in the `manual/` folder
- Process each PDF with source tracking
- Rebuild the vector database with all versions

See [Manual Management Guide](docs/manual-management.md) for advanced strategies.

1. Replace the PDF file in the `manual/` directory
2. Run the manual processing script
3. Restart the service (if needed)

## Use Cases

- **Rule Clarification**: "What are the penalties for exceeding the size constraints?"
- **Scoring Questions**: "How many points is a high goal worth?"
- **Game Mechanics**: "What happens during the autonomous period?"
- **Safety Requirements**: "What are the electrical safety requirements?"
- **Robot Specifications**: "What are the maximum robot dimensions?"

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Check the `docs/` directory for detailed documentation
- **Community**: Join the discussion in our team's communication channels

## Acknowledgments

- FIRST Tech Challenge for providing the manual content
- The FTC community for inspiration and feedback
- Open source libraries and tools that make this project possible

---

_Built with ❤️ for the FTC community_
