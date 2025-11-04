# API Documentation (PoC)

## Overview

# API Documentation

The FTC Decode Manual Chatbot API provides endpoints for querying the competition manual. This documentation covers the **Proof of Concept** implementation focused on core functionality.

## PoC Scope

**Included**:

- Chat endpoint for querying the manual
- Health check
- Manual processing status

**Deferred to Later**:

- Authentication
- Rate limiting
- User management
- Session persistence
- Advanced analytics

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: (Not yet implemented)

## Authentication

**PoC**: No authentication required. Local development only.

## Endpoints

### Chat Endpoints

#### POST /api/chat

Send a message to the chatbot and receive a response based on the FTC Decode manual.

**Request Body**:

```json
{
  "message": "What are the robot size constraints?"
}
```

**Response**:

```json
{
  "response": "According to the FTC Decode manual, robots must fit within...",
  "sources": [
    {
      "page": 42,
      "section": "Robot Construction Rules",
      "content": "Robot dimensions shall not exceed...",
      "score": 0.89
    }
  ],
  "timestamp": "2025-11-03T10:30:00Z"
}
```

**Status Codes**:

- `200 OK`: Successful response
- `400 Bad Request`: Invalid request format
- `500 Internal Server Error`: Server error

**PoC Notes**:

- No session management
- No rate limiting
- Simple error messages

---

#### GET /api/chat/history

Retrieve chat history for a session.

**Query Parameters**:

- `sessionId` (required): Session identifier
- `limit` (optional): Number of messages to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:

```json
{
  "messages": [
    {
      "id": "msg-123",
      "type": "user",
      "content": "What are the robot size constraints?",
      "timestamp": "2025-09-13T10:30:00Z"
    },
    {
      "id": "msg-124",
      "type": "assistant",
      "content": "According to the FTC Decode manual...",
      "sources": [...],
      "timestamp": "2025-09-13T10:30:05Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

#### DELETE /api/chat/session/{sessionId}

Clear chat history for a specific session.

**Response**:

```json
{
  "message": "Session cleared successfully",
  "sessionId": "session-123"
}
```

### Manual Management

#### GET /api/manual/info

Get information about the current manual version and processing status.

**Response**:

```json
{
  "manual": {
    "filename": "DECODE_Competition_Manual_TU1.pdf",
    "version": "TU1",
    "lastUpdated": "2025-09-13T08:00:00Z",
    "pages": 156,
    "sections": 12,
    "lastProcessed": "2025-09-13T09:15:00Z"
  },
  "processing": {
    "status": "completed",
    "chunksCreated": 324,
    "embeddingsGenerated": 324,
    "processingTime": "2m 34s"
  }
}
```

---

#### POST /api/manual/process

Trigger manual reprocessing (admin function).

**Request Body**:

```json
{
  "forceReprocess": false,
  "chunkSize": 1000,
  "overlap": 200
}
```

**Response**:

```json
{
  "status": "processing",
  "jobId": "job-456",
  "estimatedTime": "3-5 minutes"
}
```

---

#### GET /api/manual/search

Search manual content directly (without AI interpretation).

**Query Parameters**:

- `q` (required): Search query
- `limit` (optional): Number of results (default: 10)
- `threshold` (optional): Similarity threshold (default: 0.7)

**Response**:

```json
{
  "results": [
    {
      "content": "Robot dimensions shall not exceed 28 inches...",
      "page": 42,
      "section": "Robot Construction Rules",
      "score": 0.89,
      "metadata": {
        "subsection": "Size Constraints",
        "ruleNumber": "R301"
      }
    }
  ],
  "query": "robot size constraints",
  "totalResults": 5
}
```

### Health and Status

#### GET /api/health

Health check endpoint for monitoring.

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2025-09-13T10:30:00Z",
  "services": {
    "database": "connected",
    "vectorStore": "connected",
    "llm": "available"
  },
  "version": "1.0.0"
}
```

---

#### GET /api/status

Detailed system status and metrics.

**Response**:

```json
{
  "system": {
    "uptime": "2d 4h 15m",
    "requests": {
      "total": 1247,
      "last24h": 89,
      "avgResponseTime": "1.2s"
    }
  },
  "manual": {
    "status": "loaded",
    "chunks": 324,
    "lastUpdate": "2025-09-13T08:00:00Z"
  },
  "ai": {
    "model": "gpt-4",
    "tokensUsed": 15420,
    "averageTokensPerQuery": 125
  }
}
```

## Request/Response Examples

### Example 1: Basic Question

**Request**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many points is a high goal worth in FTC Decode?"
  }'
```

**Response**:

```json
{
  "response": "In FTC Decode, a high goal is worth 5 points when scored during the teleoperated period and 10 points when scored during the autonomous period.",
  "sources": [
    {
      "page": 28,
      "section": "Scoring",
      "content": "High goals scored during autonomous: 10 points\nHigh goals scored during teleop: 5 points",
      "confidence": 0.96
    }
  ],
  "sessionId": "session-abc123",
  "timestamp": "2025-09-13T10:30:00Z"
}
```

### Example 2: Complex Rule Question

**Request**:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What happens if a robot exceeds the weight limit during inspection?",
    "sessionId": "session-abc123"
  }'
```

**Response**:

```json
{
  "response": "If a robot exceeds the weight limit during inspection, the team must remove weight before the robot can pass inspection and participate in matches. The robot cannot compete until it meets all weight requirements as specified in rule R104.",
  "sources": [
    {
      "page": 45,
      "section": "Robot Inspection",
      "content": "Robots exceeding weight limits must be modified before passing inspection...",
      "confidence": 0.92
    },
    {
      "page": 38,
      "section": "Robot Construction Rules",
      "content": "R104: Robot weight shall not exceed 125 pounds...",
      "confidence": 0.88
    }
  ],
  "sessionId": "session-abc123",
  "timestamp": "2025-09-13T10:32:15Z"
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request message cannot be empty",
    "details": {
      "field": "message",
      "reason": "required_field_missing"
    }
  },
  "timestamp": "2025-09-13T10:30:00Z",
  "requestId": "req-123456"
}
```

### Common Error Codes

| Code                     | Description             | HTTP Status |
| ------------------------ | ----------------------- | ----------- |
| `INVALID_REQUEST`        | Malformed request       | 400         |
| `RATE_LIMIT_EXCEEDED`    | Too many requests       | 429         |
| `MANUAL_NOT_LOADED`      | Manual not processed    | 503         |
| `AI_SERVICE_UNAVAILABLE` | LLM service down        | 503         |
| `INTERNAL_ERROR`         | Unexpected server error | 500         |

## Rate Limiting

- **Chat Endpoint**: 30 requests per minute per IP
- **Search Endpoint**: 60 requests per minute per IP
- **Admin Endpoints**: 5 requests per minute per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1726222800
```

## TypeScript SDK

For TypeScript applications, use the generated SDK:

```typescript
import { FtcDecodeApi } from "ftc-decode-sdk";

const client = new FtcDecodeApi({
  baseUrl: "http://localhost:3000/api",
});

// Send a chat message
const response = await client.chat.sendMessage({
  message: "What are the robot size constraints?",
  sessionId: "my-session",
});

console.log(response.response);
console.log(response.sources);
```

## C# SDK

For C# applications:

```csharp
using FtcDecodeBot.Client;

var client = new FtcDecodeClient("http://localhost:3000/api");

// Send a chat message
var response = await client.Chat.SendMessageAsync(new ChatRequest
{
    Message = "What are the robot size constraints?",
    SessionId = "my-session"
});

Console.WriteLine(response.Response);
```

## Webhook Support (Future)

For real-time updates and notifications:

```json
{
  "event": "manual_updated",
  "timestamp": "2025-09-13T10:30:00Z",
  "data": {
    "version": "TU2",
    "changes": ["Section 4.2 updated", "New appendix added"]
  }
}
```

## Testing

### Unit Tests

```bash
npm test
# or
dotnet test
```

### Integration Tests

```bash
npm run test:integration
# or
dotnet test --filter Category=Integration
```

### API Testing with curl

See the `scripts/test-api.sh` file for comprehensive API testing examples.

## Changelog

### v1.0.0 (Current)

- Initial API implementation
- Chat functionality
- Manual processing
- Health endpoints

### Future Versions

- Authentication system
- Advanced search filters
- Webhook notifications
- Multi-language support
