# Manual Management Guide

This document explains how to manage multiple versions of the FTC Decode Competition Manual in the chatbot system.

## Manual Folder Structure

All competition manual PDFs are stored in the `manual/` folder at the project root:

```
manual/
├── DECODE_Competition_Manual_TU1.pdf
├── DECODE_Competition_Manual_TU2.pdf  (future updates)
└── DECODE_Competition_Manual_TU3.pdf  (future updates)
```

## Adding New Manuals

When FIRST releases an updated manual:

1. Download the new PDF from the FIRST website
2. Place it in the `manual/` folder with a descriptive filename (e.g., `DECODE_Competition_Manual_TU2.pdf`)
3. Run the processing script to rebuild the vector database:

```bash
pnpm process-manual
```

## How It Works

### Multi-PDF Processing

The `scripts/process-manual.ts` script automatically:

1. **Scans** the `manual/` folder for all PDF files
2. **Processes** each PDF individually:
   - Extracts text from pages
   - Chunks content into semantic segments
   - Generates embeddings using the local model
3. **Tags** each chunk with its source filename
4. **Stores** all chunks in a unified vector database

### Source Attribution

Each chunk stored in the vector database includes metadata:

```typescript
{
  page: number,          // Page number in the PDF
  chunkIndex: number,    // Global chunk index
  length: number,        // Character count
  source: string         // Source PDF filename
}
```

### Retrieval with Sources

When querying the chatbot, results include the source filename:

```
📄 Result 1 (Score: 0.691)
   Source: DECODE_Competition_Manual_TU1.pdf
   Page: 105
   Text: Section 12 ROBOT Construction Rules (R)...
```

This allows users to know which version of the manual the answer came from.

## Reprocessing vs. Incremental Updates

### Current Approach (Reprocessing)

The current implementation uses a **full reprocessing** approach:

- When you run `pnpm process-manual`, it recreates the entire vector database
- All PDFs in the `manual/` folder are processed from scratch
- Previous data is overwritten

**Pros:**
- Simple and reliable
- Ensures consistency
- No drift or stale data

**Cons:**
- Takes ~8 seconds for 508 chunks (still very fast!)
- Reprocesses unchanged manuals

### Future: Incremental Updates (Not Yet Implemented)

For larger deployments, you could implement incremental updates:

1. Track which PDFs have been processed (by filename + modification date)
2. Only process new or changed PDFs
3. Append to existing vector database rather than recreating

This is not currently implemented as the reprocessing time (8 seconds) is negligible for the PoC.

## Multiple Versions Strategy

### Option A: Keep All Versions (Current)

Store all manual versions in the `manual/` folder:

```
manual/
├── DECODE_Competition_Manual_TU1.pdf
├── DECODE_Competition_Manual_TU2.pdf
└── DECODE_Competition_Manual_TU3.pdf
```

**Use when:** You want the chatbot to answer from any version, or compare changes across versions.

**Processing:** All PDFs are included in the vector database.

### Option B: Archive Old Versions

Move old versions to an `archive/` subfolder:

```
manual/
├── DECODE_Competition_Manual_TU3.pdf  (current)
└── archive/
    ├── DECODE_Competition_Manual_TU1.pdf
    └── DECODE_Competition_Manual_TU2.pdf
```

**Use when:** You only want the chatbot to answer from the latest version.

**Processing:** Only the current manual is processed.

### Option C: Dated Filenames

Use consistent naming with dates:

```
manual/
├── DECODE_Competition_Manual_2024-09-01.pdf
├── DECODE_Competition_Manual_2024-10-15.pdf
└── DECODE_Competition_Manual_2024-12-01.pdf
```

**Benefits:** Easy to identify which version is newest.

## Best Practices

### 1. Consistent Naming

Use clear, consistent filenames that indicate:
- Competition/season
- Version/update number
- Date (optional)

Examples:
- `DECODE_Competition_Manual_TU1.pdf` ✅
- `DECODE_Competition_Manual_TU2.pdf` ✅
- `manual.pdf` ❌ (too generic)

### 2. Version Control

Keep manual PDFs in git (they're already there):

```bash
git add manual/DECODE_Competition_Manual_TU2.pdf
git commit -m "Add TU2 manual update"
```

This provides:
- History of manual changes
- Team collaboration
- Rollback capability

### 3. Regular Reprocessing

After adding new manuals:

```bash
# 1. Add new PDF to manual/ folder
cp ~/Downloads/New_Manual.pdf manual/

# 2. Reprocess vector database
pnpm process-manual

# 3. Test retrieval
pnpm test:retrieval

# 4. Commit changes
git add manual/ data/vector_store.json
git commit -m "Update to latest manual"
```

### 4. Document Updates

Keep a changelog of manual versions:

```markdown
## Manual Versions

- **TU1** (2024-09-01): Initial release
- **TU2** (2024-10-15): Updated scoring rules
- **TU3** (2024-12-01): Clarified robot size restrictions
```

## Performance

### Current Stats (Single PDF)

- **Input:** 1 PDF, 161 pages, 335,384 characters
- **Output:** 508 chunks, 384D embeddings
- **Time:** ~8 seconds
- **Cost:** $0 (local embeddings)

### Estimated Performance (Multiple PDFs)

With 3 manual versions:

- **Input:** 3 PDFs, ~480 pages
- **Output:** ~1,500 chunks
- **Time:** ~24 seconds (linear scaling)
- **Cost:** $0 (still free!)
- **Storage:** ~8 MB vector_store.json

Performance remains excellent even with multiple manuals.

## Troubleshooting

### No PDFs Found

```
❌ No PDF files found in: /path/to/manual
```

**Solution:** Ensure PDFs are in the `manual/` folder, not the root.

### Wrong Results After Update

**Symptom:** Search returns outdated information.

**Solution:** Reprocess the vector database:

```bash
pnpm process-manual
```

### Mixed Version Results

**Symptom:** Results include outdated manual versions.

**Solution A:** Move old manuals to `archive/` subfolder.

**Solution B (Future):** Implement version filtering in Phase 2 (chat API).

## Next Steps

### Phase 2: Chat API Enhancement

When implementing the chat API (Phase 2), you can:

1. **Filter by version:**
   ```typescript
   queryVectorStore(embedding, topK, { source: "TU2.pdf" })
   ```

2. **Show version in responses:**
   ```
   According to the TU2 manual (page 105), robot size is...
   ```

3. **Compare versions:**
   ```
   "What changed between TU1 and TU2 regarding penalties?"
   ```

### Phase 3: UI Enhancements

In the web UI, add:
- Version selector dropdown
- "Latest version only" toggle
- Version comparison view

## Summary

The manual management system is designed to:

1. ✅ **Support multiple PDFs** in the `manual/` folder
2. ✅ **Track source filenames** in metadata
3. ✅ **Display sources** in search results
4. ✅ **Scale efficiently** (linear time complexity)
5. ✅ **Maintain zero cost** (local embeddings)

The current implementation handles multiple manuals seamlessly while keeping processing fast and cost-free.
