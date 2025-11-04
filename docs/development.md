# Development Guide

## Getting Started

# Development Guide

This guide covers development practices, code organization, and contribution guidelines for the FTC Decode Manual Chatbot.

## Development Workflow

### 1. Project Setup

```powershell
# Clone and setup
git clone <your-repo-url>
cd manual
pnpm install  # or dotnet restore

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Process the manual
pnpm process-manual
```

### 2. Development Commands

**TypeScript**:

```powershell
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm test         # Run tests
pnpm lint         # Code linting
pnpm type-check   # TypeScript checking
```

**C#**:

```powershell
dotnet run --project FtcDecodeBot.Api    # Start development server
dotnet build                             # Build solution
dotnet test                              # Run tests
dotnet watch run                         # Auto-reload development
```

## Code Organization

### TypeScript Structure

```
src/
├── api/
│   ├── routes/
│   │   ├── chat.ts
│   │   ├── manual.ts
│   │   └── health.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   └── validation.ts
│   └── server.ts
├── services/
│   ├── aiService.ts
│   ├── vectorStore.ts
│   ├── pdfProcessor.ts
│   └── manualService.ts
├── types/
│   ├── api.ts
│   ├── manual.ts
│   └── chat.ts
├── utils/
│   ├── logger.ts
│   ├── config.ts
│   └── helpers.ts
└── ui/
    ├── components/
    ├── pages/
    └── hooks/
```

### C# Structure

```
FtcDecodeBot.Api/
├── Controllers/
│   ├── ChatController.cs
│   ├── ManualController.cs
│   └── HealthController.cs
├── Middleware/
├── Models/
└── Program.cs

FtcDecodeBot.Core/
├── Services/
│   ├── IAiService.cs
│   ├── IVectorStore.cs
│   └── Implementations/
├── Models/
│   ├── ChatModels.cs
│   ├── ManualModels.cs
│   └── ApiModels.cs
└── Configuration/

FtcDecodeBot.Data/
├── Repositories/
├── Entities/
└── Migrations/
```

## Development Best Practices

### 1. Code Style

**TypeScript**:

- Use ESLint + Prettier for formatting
- Follow Airbnb style guide
- Use strict TypeScript configuration
- Prefer functional programming patterns

**C#**:

- Follow Microsoft C# coding conventions
- Use EditorConfig for consistency
- Enable nullable reference types
- Use async/await patterns

### 2. Error Handling

**Centralized Error Handling**:

```typescript
// TypeScript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

// Usage
throw new AppError(400, "Invalid request format", "INVALID_REQUEST");
```

```csharp
// C#
public class AppException : Exception
{
    public int StatusCode { get; }
    public string Code { get; }

    public AppException(int statusCode, string message, string code = null)
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }
}
```

### 3. Logging

**Structured Logging**:

```typescript
// TypeScript with Winston
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.Console(),
  ],
});

// Usage
logger.info("Processing manual", { filename: "manual.pdf", pages: 156 });
```

```csharp
// C# with Serilog
Log.Information("Processing manual {Filename} with {Pages} pages",
    filename, pageCount);
```

### 4. Configuration Management

**Environment-based Configuration**:

```typescript
// config.ts
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || "gpt-4",
  },
  vectorDb: {
    provider: process.env.VECTOR_DB_PROVIDER || "chroma",
    connectionString: process.env.VECTOR_DB_CONNECTION!,
  },
  app: {
    port: parseInt(process.env.PORT || "3000"),
    env: process.env.NODE_ENV || "development",
  },
};
```

```csharp
// C# with IConfiguration
public class AppSettings
{
    public OpenAiSettings OpenAi { get; set; }
    public VectorDbSettings VectorDb { get; set; }
}
```

## Testing Strategy

### 1. Unit Tests

**Test Structure**:

```
tests/
├── unit/
│   ├── services/
│   ├── utils/
│   └── models/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    ├── chat-flow.test.ts
    └── manual-processing.test.ts
```

**Example Unit Test (TypeScript)**:

```typescript
// services/aiService.test.ts
import { AiService } from "../src/services/aiService";

describe("AiService", () => {
  let aiService: AiService;

  beforeEach(() => {
    aiService = new AiService();
  });

  it("should generate response for valid query", async () => {
    const response = await aiService.generateResponse(
      "What are robot size constraints?",
      mockContext
    );

    expect(response).toBeDefined();
    expect(response.content).toContain("robot");
    expect(response.sources).toHaveLength(1);
  });
});
```

### 2. Integration Tests

**API Testing**:

```typescript
// api/chat.integration.test.ts
describe("Chat API", () => {
  it("should return response for valid message", async () => {
    const response = await request(app)
      .post("/api/chat")
      .send({ message: "What is FTC Decode?" })
      .expect(200);

    expect(response.body.response).toBeDefined();
    expect(response.body.sources).toBeInstanceOf(Array);
  });
});
```

### 3. Manual Processing Tests

```typescript
// Test manual processing pipeline
describe("Manual Processing", () => {
  it("should extract text from PDF", async () => {
    const processor = new PdfProcessor();
    const text = await processor.extractText("test-manual.pdf");

    expect(text).toContain("FTC");
    expect(text.length).toBeGreaterThan(1000);
  });

  it("should create vector embeddings", async () => {
    const chunks = ["Robot construction rules...", "Scoring system..."];
    const embeddings = await vectorStore.createEmbeddings(chunks);

    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toHaveLength(1536); // OpenAI embedding size
  });
});
```

## Performance Considerations

### 1. Caching Strategy

**Response Caching**:

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

// Cache frequently asked questions
export async function getCachedResponse(query: string) {
  const cached = await redis.get(`chat:${hashQuery(query)}`);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedResponse(query: string, response: any) {
  await redis.setex(`chat:${hashQuery(query)}`, 3600, JSON.stringify(response));
}
```

### 2. Database Optimization

**Vector Search Optimization**:

- Use appropriate similarity thresholds
- Implement result caching
- Optimize chunk sizes for your content
- Monitor query performance

### 3. Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: "Too many chat requests, please try again later",
});
```

## Deployment

### 1. Environment Setup

**Production Environment Variables**:

```env
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Security
API_SECRET=your-secret-key
CORS_ORIGIN=https://your-domain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-key
```

### 2. Docker Configuration

**Dockerfile**:

```dockerfile
FROM node:18-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY . .
RUN pnpm build

EXPOSE 8080
CMD ["pnpm", "start"]
```

**docker-compose.yml**:

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
      - chroma

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  chroma:
    image: chromadb/chroma
    ports:
      - "8000:8000"
```

### 3. Health Checks

```typescript
export async function healthCheck() {
  const checks = {
    database: await checkDatabaseConnection(),
    vectorStore: await checkVectorStoreConnection(),
    aiService: await checkAiServiceConnection(),
    manual: await checkManualStatus(),
  };

  const healthy = Object.values(checks).every((check) => check === "healthy");

  return {
    status: healthy ? "healthy" : "unhealthy",
    checks,
    timestamp: new Date().toISOString(),
  };
}
```

## Monitoring and Observability

### 1. Metrics Collection

**Application Metrics**:

- Request count and latency
- Error rates by endpoint
- AI service usage and costs
- Manual processing performance

### 2. Logging Standards

**Log Levels**:

- `ERROR`: System errors, exceptions
- `WARN`: Unexpected but recoverable issues
- `INFO`: Important business events
- `DEBUG`: Detailed diagnostic information

### 3. Alerting

**Key Alerts**:

- High error rates (>5%)
- Slow response times (>5s)
- AI service failures
- Manual processing failures

## Security Considerations

### 1. Input Validation

```typescript
import Joi from "joi";

const chatSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required(),
  sessionId: Joi.string().uuid().optional(),
});

export function validateChatRequest(req: Request) {
  const { error, value } = chatSchema.validate(req.body);
  if (error) {
    throw new AppError(400, error.details[0].message);
  }
  return value;
}
```

### 2. Rate Limiting

Implement rate limiting to prevent abuse and control API costs.

### 3. Secure Configuration

- Store secrets in environment variables
- Use secure headers (helmet.js)
- Implement CORS properly
- Log security events

## Contributing Guidelines

### 1. Code Review Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Run full test suite
4. Create pull request
5. Peer review required
6. Merge after approval

### 2. Commit Standards

```
feat: add manual update notification
fix: resolve vector search timeout issue
docs: update API documentation
test: add integration tests for chat flow
refactor: optimize PDF processing pipeline
```

### 3. Documentation Updates

Always update documentation when:

- Adding new API endpoints
- Changing configuration options
- Modifying manual processing logic
- Adding new features

## Troubleshooting Common Issues

### 1. PDF Processing Fails

- Check PDF file permissions
- Verify PDF is not corrupted
- Ensure sufficient memory available

### 2. Vector Search Issues

- Verify vector database connection
- Check embedding generation
- Validate chunk size configuration

### 3. AI Service Timeouts

- Implement retry logic
- Check API key limits
- Monitor request sizes

### 4. Performance Issues

- Profile database queries
- Check cache hit rates
- Monitor memory usage
- Analyze response times
