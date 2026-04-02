# Phase 13: Vector Embeddings for Semantic Weak Topic Detection 🎯

## Overview

This implementation adds **semantic understanding** to the weak topic detection system using **vector embeddings**. When a student struggles with a topic, the system can now identify **semantically related topics** that may also be at risk, even if they haven't been studied yet.

---

## Architecture

### Components

1. **Embedding Generation** (`src/utils/embeddings.ts`)
   - Uses **Xenova/all-MiniLM-L6-v2** (384-dimensional vectors)
   - Runs locally via Transformers.js
   - No external API costs for embedding generation

2. **Vector Database** - Qdrant (`src/utils/vectorService.ts`)
   - High-performance vector similarity search
   - HNSW index for fast approximate nearest neighbor search
   - Cosine distance metric for semantic similarity
   - Falls back to MongoDB-only storage if Qdrant unavailable

3. **Dual Storage Strategy**
   - **MongoDB**: Persistent storage of topic vectors linked to syllabus
   - **Qdrant**: Fast similarity search and semantic queries

4. **Semantic Detection Pipeline**
   - When a topic is flagged as weak → Generate embedding
   - Query vector DB for similar topics (>0.70 cosine similarity)
   - Flag semantically related topics as "at risk"
   - Display warnings in the calendar timeline

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install @qdrant/js-client-rest openai
```

### 2. Run Qdrant Vector Database

#### Option A: Docker (Recommended)
```bash
docker pull qdrant/qdrant
docker run -p 6333:6333 qdrant/qdrant
```

#### Option B: Local Installation
Download from: https://qdrant.tech/documentation/quick-start/

#### Option C: Cloud Qdrant
Use Qdrant Cloud: https://cloud.qdrant.io/
Update `.env` with your cloud URL

### 3. Update Environment Variables

Add to `backend/.env`:
```env
QDRANT_URL=http://localhost:6333
```

---

## API Endpoints

### 1. **POST /api/weak-topics/embed-syllabus**
Batch embed all topics from a study plan into the vector database.

**Request:**
```json
{
  "syllabusId": "abc123"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Successfully embedded 25/30 topics",
  "embeddedCount": 25,
  "totalTopics": 30
}
```

---

### 2. **POST /api/weak-topics/flag-semantic**
Find topics semantically similar to a weak topic.

**Request:**
```json
{
  "syllabusId": "abc123",
  "topicTitle": "Newton's Laws of Motion"
}
```

**Response:**
```json
{
  "ok": true,
  "weakTopic": "Newton's Laws of Motion",
  "atRisk": [
    {
      "topic": "Force and Acceleration",
      "similarity": 87.3
    },
    {
      "topic": "Momentum and Collisions",
      "similarity": 79.5
    }
  ]
}
```

---

### 3. **GET /api/weak-topics/detect-at-risk**
Detect all at-risk topics based on current weak topics.

**Query Parameters:**
- `syllabusId` (required)
- `userId` (optional, default: 'anonymous')

**Response:**
```json
{
  "ok": true,
  "weakTopicsCount": 3,
  "atRisk": [
    {
      "topic": "Electromagnetic Induction",
      "reason": "Semantically related to weak topic \"Faraday's Law\" (82% similar)",
      "riskLevel": "high"
    }
  ]
}
```

---

## How It Works

### Step-by-Step Flow

1. **Syllabus Upload** → Topics extracted by Claude
2. **Background Embedding** → All topics embedded and stored in Qdrant + MongoDB
3. **Quiz Performance** → Student scores poorly on a topic
4. **Weak Topic Detection** → Topic flagged with low confidence score
5. **Semantic Analysis** → Vector DB queried for similar topics
6. **Proactive Warning** → At-risk topics flagged in calendar

### Example Scenario

```
Student struggles with: "Derivatives" (Calculus)
↓
System detects weak topic → confidence score: 45%
↓
Queries vector DB: "Find topics similar to Derivatives"
↓
Finds:
  - "Integration" (85% similar)
  - "Rate of Change" (78% similar)
  - "Optimization Problems" (72% similar)
↓
Flags these topics as "At Risk" in the study schedule
↓
Student sees warning: ⚠️ At Risk: Related to weak topic "Derivatives"
```

---

## Frontend Integration

### CalendarTimeline Component

The component automatically shows semantic warnings when viewing sessions:

```tsx
// Visual indicator for at-risk topics
{(session as any).semanticAtRisk && (
  <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30">
    ⚠️ At Risk: {session.semanticReason}
  </div>
)}
```

### "Detect Knowledge Gaps" Button

When clicked, it runs both:
1. **Prerequisite gap detection** (missing foundations)
2. **Semantic similarity detection** (related at-risk topics)

---

## Configuration

### Similarilarity Threshold

Adjust in `vectorService.ts`:
```typescript
const threshold = 0.6; // Minimum similarity to consider
const highSimilarity = 0.70; // Flag as at-risk
```

### Vector Dimensions

Currently using 384 (Xenova/all-MiniLM-L6-v2):
```typescript
const VECTOR_SIZE = 384;
```

To use OpenAI embeddings (1536 dimensions):
1. Update `VECTOR_SIZE = 1536`
2. Modify `embeddings.ts` to call OpenAI API instead of Xenova

---

## Performance Optimization

### Batch Processing
- Topics are embedded in batches with 50ms delays
- Non-blocking background tasks
- Graceful fallback if Qdrant unavailable

### Index Configuration
```typescript
hnsw_config: {
  m: 16,              // Connections per node
  ef_construct: 100,  // Search depth during construction
}
```

---

## Monitoring & Debugging

### Check Vector Collection
```bash
curl http://localhost:6333/collections/study_topics
```

### View Embedded Topics
```javascript
// In MongoDB
db.topicvectors.find({ syllabusId: "abc123" })
```

### Test Semantic Search
```bash
curl -X POST http://localhost:4000/api/weak-topics/flag-semantic \
  -H "Content-Type: application/json" \
  -d '{"syllabusId":"abc123","topicTitle":"Test Topic"}'
```

---

## Future Enhancements

### Planned Features

1. **Multi-language Support**
   - Use multilingual embeddings (e.g., LaBSE)
   - Support Hindi, Tamil, Spanish, etc.

2. **Concept Graph Enhancement**
   - Combine semantic similarity with prerequisite graph
   - Detect both semantic AND structural dependencies

3. **Adaptive Thresholds**
   - Adjust similarity threshold based on student performance
   - Personalized risk detection

4. **Explainability**
   - Show WHY topics are semantically related
   - Highlight key concept overlaps

5. **OpenAI Embeddings Option**
   - Toggle between Xenova (free) and OpenAI (higher quality)
   - Configurable via environment variable

---

## Troubleshooting

### Qdrant Connection Failed
```
⚠️  Qdrant initialization failed - falling back to MongoDB-only vector storage
```
**Solution:** System continues working with MongoDB-only storage. To fix:
- Ensure Qdrant is running: `docker ps | grep qdrant`
- Check URL in `.env`: `QDRANT_URL=http://localhost:6333`

### Embedding Generation Slow
- First run downloads the model (~80MB)
- Subsequent runs are faster
- Consider pre-caching model on server startup

### Memory Issues
- Reduce batch size in `batchEmbedTopics()`
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`

---

## Credits

- **Model**: Xenova/all-MiniLM-L6-v2 (Apache 2.0)
- **Vector DB**: Qdrant (Apache 2.0)
- **Implementation**: Study planner semantic detection system

---

## Summary

✅ **Phase 13 Complete**: Vector embeddings for semantic weak topic detection

- Students get **proactive warnings** about related at-risk topics
- **Zero external API costs** (using local Xenova embeddings)
- **Hybrid storage**: MongoDB + Qdrant for reliability and speed
- **Automatic integration**: Embeddings generated on syllabus upload
- **Visual feedback**: Clear UI indicators in calendar timeline

The system now understands **conceptual relationships** between topics, not just prerequisites! 🎉
