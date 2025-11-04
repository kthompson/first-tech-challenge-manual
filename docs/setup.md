# Setup and Installation Guide (PoC)

This guide focuses on setting up a **Proof of Concept** with minimal cost and local development.

## PoC Goals

- **Cost Minimization**: Use free local tools where possible
- **Fast Setup**: Get running quickly with minimal configuration
- **Core Features**: Focus on PDF processing and vectorization
- **Skip for Now**: Authentication, rate limiting, production deployment

## Prerequisites

### System Requirements

- **Node.js** 18+ (for TypeScript)
- **pnpm** (package manager - faster and more efficient than npm)
- **Git** for version control
- **PowerShell** (your current shell)
- **4GB+ RAM** for local development
- **2GB+ disk space** for dependencies and ChromaDB data

### External Services (Minimal)

- **OpenAI API Key** (only external cost - ~$5-20/month for chat completions)
- **Local Embedding Model** (FREE - runs on your machine)
- **ChromaDB** (runs locally - FREE)

## TypeScript Setup (Recommended for PoC)

### 1. Initialize Project

```powershell
# Initialize Node.js project
pnpm init

# Install TypeScript and essential dependencies
pnpm add -D typescript @types/node ts-node nodemon
pnpm add express cors dotenv
pnpm add langchain @langchain/openai @langchain/community
pnpm add pdf-parse
pnpm add chromadb

# Install local embedding model (saves API costs!)
pnpm add @xenova/transformers
```

### 2. Install UI Dependencies (Later Phase)

```powershell
# Skip for initial PoC - focus on core functionality first
# We'll add UI after PDF processing works

# For future reference:
# pnpm add @assistant-ui/react @assistant-ui/react-ui
# pnpm add next react react-dom
# pnpm add -D @types/react @types/react-dom
```

### 3. Local Embedding Model Setup

```powershell
# Already installed in step 1: @xenova/transformers
# Model will auto-download on first use (~90MB)
# Recommended model: Xenova/all-MiniLM-L6-v2
#
# Benefits:
# - FREE (no API costs)
# - Fast on CPU (~50-100 chunks/second)
# - Good quality embeddings (384 dimensions)
# - Runs entirely locally
```

### 4. Vector Database Setup (ChromaDB - Local)

```powershell
# Already installed in step 1
# ChromaDB runs in-process, no separate server needed for PoC
# Data will be stored in local ./chroma_data directory
```

### 5. Create Configuration Files

**tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**package.json scripts**:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "process-manual": "ts-node scripts/process-manual.ts",
    "test": "jest",
    "test:retrieval": "ts-node scripts/test-retrieval.ts"
  },
  "packageManager": "pnpm@8.0.0"
}
```

## Environment Configuration (PoC)

### 1. Create Environment File

```powershell
# Create .env file
New-Item -Path ".env" -ItemType File
```

**Add to .env** (minimal configuration):

```env
# OpenAI Configuration (REQUIRED - for chat completions only, not embeddings)
OPENAI_API_KEY=your_openai_api_key_here

# Application Settings
PORT=3000
NODE_ENV=development

# Local Embedding Model (no config needed - runs automatically)
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2

# ChromaDB (runs locally, no config needed)
CHROMA_DATA_PATH=./chroma_data

# Optional: Limit spending
OPENAI_MAX_TOKENS=2000
```

### 2. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and paste into `.env` file
4. Set spending limit in OpenAI dashboard (recommended: $10/month for testing)

### 3. Secure Environment File

```powershell
# Add .env to .gitignore
Add-Content -Path ".gitignore" -Value "`n.env`n*.log`nnode_modules/`ndist/`nchroma_data/`n.DS_Store"
```

## Verify Setup

````powershell
## Verify Setup

### 1. Check Dependencies

```powershell
# Verify Node.js version
node --version  # Should be 18+

# Verify pnpm
pnpm --version

# Install all dependencies
pnpm install
````

### 2. Verify Manual File

```powershell
# Check if manual exists
Test-Path "DECODE_Competition_Manual_TU1.pdf"  # Should return True
```

### 3. Create Required Directories

```powershell
# Create directories for scripts and data
New-Item -Path "scripts" -ItemType Directory -Force
New-Item -Path "src" -ItemType Directory -Force
```

## Next Steps - PoC Development

### Priority 1: PDF Processing Script

Create `scripts/process-manual.ts` to:

1. Load DECODE_Competition_Manual_TU1.pdf
2. Extract text with page numbers
3. Chunk the content (~1000 tokens with 200 overlap)
4. Generate embeddings via OpenAI
5. Store in local ChromaDB

### Priority 2: Test Retrieval

Create `scripts/test-retrieval.ts` to:

1. Query ChromaDB with sample questions
2. Verify relevant chunks are returned
3. Check similarity scores
4. Validate metadata (page numbers, sections)

### Priority 3: Simple API (Later)

Create basic Express server with:

1. `/api/chat` endpoint
2. Integration with OpenAI
3. Response formatting with sources

## Troubleshooting (PoC)

````

### Option B: Chroma (Local)

```powershell
# Install Chroma server
pip install chromadb

# Start Chroma server
chroma run --host localhost --port 8000
````

### Option C: Azure Cognitive Search

```powershell
# Create via Azure CLI
az search service create --name ftc-manual-search --resource-group your-rg --sku Basic
```

## Manual Processing Setup

### 1. Create Processing Script Directory

```powershell
New-Item -Path "scripts" -ItemType Directory
```

### 2. Verify Manual File

```powershell
# Check if manual exists
Test-Path "DECODE_Competition_Manual_TU1.pdf"
```

## Development Server

### TypeScript

```powershell
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### C#

```powershell
# Restore packages and run
dotnet restore
dotnet run --project FtcDecodeBot.Api
```

## Verification Steps

### 1. Test API Health

```powershell
# Test endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
```

### 2. Test PDF Processing

```powershell
# Run manual processing
pnpm process-manual
# OR
dotnet run --project Scripts -- process-manual
```

### 3. Test Chat Endpoint

```powershell
# Test chat functionality
$body = @{
    message = "What is the FTC Decode challenge about?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Body $body -ContentType "application/json"
```

## Troubleshooting (PoC)

### Common Issues

1. **PDF Processing Fails**

   - Verify PDF file exists: `Test-Path DECODE_Competition_Manual_TU1.pdf`
   - Check file permissions
   - Ensure pdf-parse is installed: `pnpm add pdf-parse`

2. **ChromaDB Issues**

   - ChromaDB data directory: should auto-create at `./chroma_data`
   - If connection fails, delete `chroma_data` folder and restart
   - Check Node.js version (needs 18+)

3. **OpenAI API Errors**

   - Verify API key in `.env` file
   - Check billing status: https://platform.openai.com/account/billing
   - Ensure spending limits are set
   - Test API key: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

4. **Out of Memory**
   - PDF too large: process in smaller chunks
   - Reduce batch size when generating embeddings
   - Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 pnpm process-manual`

### Environment-Specific Issues

**macOS with PowerShell**:

```powershell
# If pnpm/node commands fail, ensure PATH is set
$env:PATH += ":/usr/local/bin:/opt/homebrew/bin"

# Install pnpm if not already installed
corepack enable
corepack prepare pnpm@latest --activate
```

## Cost Monitoring

### Track OpenAI Usage

1. Go to https://platform.openai.com/account/usage
2. Monitor daily token usage
3. Set alerts for spending thresholds
4. Expected PoC costs:
   - Initial processing: $2-5 (one-time)
   - Daily testing: $0.50-2.00
   - Monthly estimate: $15-60

### Optimize Costs

- **Reduce chunk size** if embeddings are expensive
- **Cache embeddings** - don't reprocess unchanged content
- **Use GPT-4-mini** instead of GPT-4 for queries
- **Limit context** to 3-5 chunks per query
- **Batch process** embeddings when possible

## Support

- Check the [Architecture Guide](architecture.md) for system design
- Review [Development Guide](development.md) for coding practices
- See [API Documentation](api.md) for endpoint details (when implemented)
- Create GitHub issues for bugs or questions

  - Verify PDF file exists and is readable
  - Check file permissions
  - Ensure PDF parsing library is installed

2. **Vector Database Connection**

   - Verify API keys and endpoints
   - Check network connectivity
   - Validate environment variables

3. **OpenAI API Errors**

   - Verify API key is valid
   - Check account billing and limits
   - Ensure correct model names

4. **Port Already in Use**

   ```powershell
   # Find process using port 3000
   netstat -ano | findstr :3000

   # Kill process if needed
   taskkill /PID <process_id> /F
   ```

### Environment-Specific Issues

**macOS with PowerShell**:

```powershell
# If pnpm/node commands fail, ensure PATH is set
$env:PATH += ":/usr/local/bin:/opt/homebrew/bin"

# Install pnpm if not already installed
npm install -g pnpm

# If permission issues with pnpm, use corepack (recommended)
corepack enable
corepack prepare pnpm@latest --activate
```

## Next Steps

1. **Process the Manual**: Run the manual processing script
2. **Set Up UI**: Configure assistant-ui components
3. **Test Queries**: Verify the chatbot responds correctly
4. **Deploy**: Follow deployment guide for production setup

## Support

- Check the [Architecture Guide](architecture.md) for system design
- Review [API Documentation](api.md) for endpoint details
- Create GitHub issues for bugs or feature requests
