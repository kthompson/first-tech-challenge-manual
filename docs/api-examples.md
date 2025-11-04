# API Testing Examples

## Using curl (PowerShell)

### Health Check

```powershell
curl http://localhost:3000/api/health
```

### Ask a Question

```powershell
curl -X POST http://localhost:3000/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"question\": \"What are the robot size restrictions?\"}'
```

### More Questions

```powershell
# Match duration
curl -X POST http://localhost:3000/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"question\": \"How long is a match?\"}'

# Scoring
curl -X POST http://localhost:3000/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"question\": \"How many points is scoring in autonomous worth?\"}'

# Penalties
curl -X POST http://localhost:3000/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"question\": \"What are the penalties for fouls?\"}'
```

## Using PowerShell's Invoke-RestMethod

### Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get
```

### Ask a Question

```powershell
$body = @{
    question = "What are the robot size restrictions?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### Pretty Print Response

```powershell
$body = @{
    question = "How long is a match?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

Write-Host "`nQuestion: $($response.question)" -ForegroundColor Cyan
Write-Host "`nAnswer:" -ForegroundColor Green
Write-Host $response.answer
Write-Host "`nSources:" -ForegroundColor Yellow
$response.sources | ForEach-Object {
    Write-Host "  - $($_.source) (Page $($_.page))"
}
```

## Using JavaScript/Node.js

```javascript
// test-api.mjs
async function askQuestion(question) {
  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  const data = await response.json();

  console.log("\nQuestion:", data.question);
  console.log("\nAnswer:", data.answer);
  console.log("\nSources:");
  data.sources.forEach((source) => {
    console.log(`  - ${source.source} (Page ${source.page})`);
  });
}

await askQuestion("What are the robot size restrictions?");
```

Run with: `node test-api.mjs`

## Using Python

```python
# test_api.py
import requests
import json

def ask_question(question):
    response = requests.post(
        'http://localhost:3000/api/chat',
        json={'question': question}
    )
    data = response.json()

    print(f"\nQuestion: {data['question']}")
    print(f"\nAnswer: {data['answer']}")
    print("\nSources:")
    for source in data['sources']:
        print(f"  - {source['source']} (Page {source['page']})")

ask_question('What are the robot size restrictions?')
```

Run with: `python test_api.py`

## Response Format

All successful responses follow this format:

```json
{
  "question": "Your question here",
  "answer": "The generated answer with context from the manual",
  "sources": [
    {
      "source": "DECODE_Competition_Manual_TU1.pdf",
      "page": 105,
      "score": 0.683
    }
  ],
  "metadata": {
    "contextsUsed": 5,
    "tokensEstimate": 2847,
    "durationMs": 3245
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Field 'question' is required and must be a string"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Could not find relevant information in the manual"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Error details here"
}
```
