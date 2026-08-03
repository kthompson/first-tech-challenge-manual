# Multi-Step RAG with Tool Calling

## Overview

The chatbot now supports **iterative retrieval** using Claude's tool calling capability. When Claude encounters references to sections, rules, or topics that aren't in its initial context (e.g., "see section 10.5.2"), it can automatically query the vector store for that additional information.

## How It Works

### 1. Initial Retrieval

When a user asks a question, the system:

- Generates an embedding for the question
- Retrieves the top K most relevant chunks from the vector store
- Provides these chunks as context to Claude

### 2. Tool-Based Follow-up Retrieval

If Claude's response references information not in its context:

- Claude calls the `search_manual` tool with a specific query
- The system retrieves additional relevant chunks
- These chunks are provided back to Claude
- Claude incorporates this information into its response
- This can happen multiple times (up to 3 iterations by default)

### 3. Architecture

```
┌─────────────┐
│ User Query  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Initial Vector Search   │
│ (Top 5 chunks)          │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Claude with Tools       │◄───────┐
│ - Initial context       │        │
│ - search_manual tool    │        │
└──────┬──────────────────┘        │
       │                            │
       ├─ Needs more info? ─────────┘
       │  (calls search_manual)     │
       │                            │
       │  Tool executes:            │
       │  1. Generate embedding     │
       │  2. Query vector store     │
       │  3. Return formatted       │
       │     context                │
       │                            │
       ▼
┌─────────────────────────┐
│ Final Answer            │
│ (with all sources)      │
└─────────────────────────┘
```

## Implementation Details

### Claude Service (`lib/services/claude.ts`)

Added two new functions:

#### `generateChatCompletionWithTools()`

Handles the tool calling loop:

- Accepts messages, tool definitions, and a tool handler
- Iterates up to `maxIterations` (default: 5)
- Executes tools via the provided handler
- Returns the final text response

#### Tool Types

```typescript
interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}
```

### RAG Service (`lib/services/rag.ts`)

#### `searchManualForContext()`

The core tool implementation:

- Accepts a search query
- Generates embedding
- Queries vector store with topK=3
- Filters by minimum similarity score
- Returns formatted context

#### `searchManualTool`

Tool definition exposed to Claude:

```typescript
{
  name: "search_manual",
  description: "Search the FTC BIOBUZZ Competition Manual...",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query..."
      }
    },
    required: ["query"]
  }
}
```

#### Updated System Prompt

Instructs Claude to:

1. Identify references to missing information
2. Use the `search_manual` tool with specific queries
3. Wait for results before answering
4. Incorporate retrieved information
5. Properly cite sources

### Both Functions Updated

- `answerQuestion()` - Non-streaming with tool support
- `answerQuestionStreaming()` - Streaming with tool support (streams final answer after tool calls complete)

## Configuration

### Environment Variables

Same as before, but with these considerations:

- `RAG_TOP_K` - Initial retrieval count (default: 5)
- `RAG_MIN_SCORE` - Minimum similarity for both initial and tool searches (default: 0.3)
- `CLAUDE_MAX_TOKENS` - Should be sufficient for multiple tool iterations (default: 4096)

### Tool Iteration Limits

In `answerQuestion()` and `answerQuestionStreaming()`:

```typescript
maxIterations: 3; // Maximum number of tool call rounds
```

## Example Usage

### Question with Section Reference

**User:** "What are the robot size restrictions and how do they compare to the requirements in section 10.5.2?"

**Flow:**

1. Initial retrieval finds robot size restriction chunks
2. Claude sees reference to "section 10.5.2" not in context
3. Claude calls `search_manual` with query "section 10.5.2"
4. Tool retrieves additional chunks about section 10.5.2
5. Claude generates comprehensive answer using both sets of information

### Logging Example

```
💬 Chat request: "What are penalties mentioned in rule R205?"
🔍 RAG Query: "What are penalties mentioned in rule R205?"
📚 Loading embedder and vector store...
🔢 Generating query embedding...
🔎 Searching for top 5 relevant chunks...
✅ Retrieved 5 chunks (scores: 0.85 - 0.72)
📝 Using 5 chunks as context
💭 Estimated context tokens: 2450
🤖 Generating answer with Claude (with tool support)...
   🔄 Tool iteration 1/3
   🔧 Executing tool: search_manual with input: { query: 'rule R205 penalties' }
   🔍 Tool search: "rule R205 penalties" (topK: 3)
   ✅ Tool search returned 3 results
   ✅ Tool result received (1250 chars)
   🔄 Tool iteration 2/3
✅ Answer generated (425 chars)
```

## Benefits

1. **More Complete Answers**: No longer limited by initial context retrieval
2. **Handles Cross-References**: Can follow "see section X" references
3. **Better Source Coverage**: Tracks all chunks used across iterations
4. **Transparent**: Logs show when and why tools are called
5. **Efficient**: Only retrieves additional context when needed

## Limitations

1. **Max Iterations**: Limited to 3 tool call rounds to prevent runaway loops
2. **Non-Streaming During Tool Calls**: When using streaming mode, tool calls execute first, then the final answer streams
3. **Token Budget**: Each tool call adds to the context, so must manage token limits
4. **Cost**: More API calls when tools are used (embedding generation + Claude iterations)

## Testing

Run the test script to see it in action:

```bash
pnpm tsx scripts/test-chat.ts
```

Or test via the API:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the scoring rules mentioned in section 10.5?",
    "stream": false
  }'
```

## Future Enhancements

Potential improvements:

1. **True streaming with tools**: Stream initial response, pause for tool calls, continue streaming
2. **Parallel tool calls**: Execute multiple searches simultaneously
3. **Smart caching**: Cache tool results for common queries
4. **Confidence scoring**: Only call tools if initial confidence is low
5. **User feedback loop**: Ask user if they want more detail before calling tools
