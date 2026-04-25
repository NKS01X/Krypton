# 🎬 vid-piracy-backend

A high-performance video copyright detection system built in Go. It detects pirated content by comparing incoming videos against a database of protected content using **dual-layer similarity matching**: perceptual hashing (exact/near-exact matches) and vector embeddings via pgvector (fuzzy/semantic matches).

---

## 🏗️ Architecture Overview

```text
┌──────────────┐       ┌────────────────┐       ┌──────────────────┐
│   Client     │──────▶│   API Server   │──────▶│    RabbitMQ      │
│  (HTTP)      │◀──────│  (Fiber v2)    │       │  (Job Queue)     │
└──────────────┘       └────────────────┘       └────────┬─────────┘
                                                         │
                                                         ▼
                                                ┌──────────────────┐
                                                │     Worker(s)    │
                                                │  (Scalable N)    │
                                                └────────┬─────────┘
                                                         │
                              ┌───────────────────────────┼───────────────────────────┐
                              │                           │                           │
                              ▼                           ▼                           ▼
                    ┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐
                    │   yt-dlp         │       │   FFmpeg         │        │  PostgreSQL      │
                    │ (Video Download) │       │ (Keyframe Extract)│       │  + pgvector      │
                    └──────────────────┘       └──────────────────┘        └──────────────────┘
```

**Flow:**

1. Client submits a YouTube URL via the API
2. API publishes a job to RabbitMQ and returns `202 Accepted` with a `job_id`
3. Worker(s) consume jobs and run the full pipeline:
   - **Download** video via `yt-dlp`
   - **Extract keyframes** via `ffmpeg` at configurable FPS
   - **Dual pipeline** (concurrent):
     - **pHash**: Perceptual + Difference hashing via `goimagehash`
     - **Embeddings**: Jina AI multimodal vectors (1024-dim) via `jina-clip-v2` API
   - **Compare** against protected content in PostgreSQL
   - **Store** scan result with match details
4. Client polls the scan result by `job_id`

---

## 📁 Project Structure

```text
vid-piracy-backend/
├── cmd/
│   ├── api/main.go              # HTTP API server entrypoint
│   └── worker/main.go           # Queue consumer/worker entrypoint
├── internal/
│   ├── config/config.go         # YAML config loading via Viper
│   ├── embedder/embedder.go     # Vector embedding generation (HTTP / placeholder)
│   ├── engine/similarity.go     # Core pipeline orchestrator
│   ├── extractor/
│   │   ├── downloader.go        # yt-dlp video downloader
│   │   └── keyframe.go          # FFmpeg keyframe extraction
│   ├── handler/api.go           # Fiber HTTP handlers & route registration
│   ├── hasher/phash.go          # Perceptual + difference hash generation
│   ├── queue/
│   │   ├── consumer.go          # RabbitMQ consumer (worker side)
│   │   └── publisher.go         # RabbitMQ publisher (API side)
│   └── repository/
│       ├── video_repo.go        # Protected video & scan result CRUD, pHash matching
│       └── vector_repo.go       # pgvector cosine similarity search
├── migrations/
│   ├── 001_init.up.sql          # Schema: tables, indexes, pgvector extension
│   └── 001_init.down.sql        # Rollback migration
├── config.yaml                  # Default configuration
├── docker-compose.yml           # Full stack: Postgres, RabbitMQ, API, Worker
├── Dockerfile                   # Multi-stage build (Go builder + Alpine runtime)
├── go.mod
└── go.sum
```

---

## ⚙️ Tech Stack

| Component          | Technology                                                             |
| ------------------ | ---------------------------------------------------------------------- |
| **Language**       | Go 1.22                                                                |
| **HTTP Framework** | [Fiber v2](https://gofiber.io/)                                        |
| **Database**       | PostgreSQL 16 + [pgvector](https://github.com/pgvector/pgvector)       |
| **Message Queue**  | RabbitMQ 3 (AMQP 0-9-1)                                                |
| **Video Download** | [yt-dlp](https://github.com/yt-dlp/yt-dlp)                             |
| **Frame Extract**  | [FFmpeg](https://ffmpeg.org/)                                          |
| **Hashing**        | [goimagehash](https://github.com/corona10/goimagehash) (pHash + dHash) |
| **Embeddings**     | Jina AI `jina-clip-v2` (1024-dim) via HTTP API                         |
| **Config**         | [Viper](https://github.com/spf13/viper) (YAML + env override)          |
| **Logging**        | [zerolog](https://github.com/rs/zerolog)                               |
| **Concurrency**    | `errgroup`, semaphore pattern, goroutine pools                         |

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Go 1.22+ (for local development)
- FFmpeg
- yt-dlp

### Run with Docker Compose (recommended)

```bash
# Start everything: Postgres, RabbitMQ, API, 2 Workers
docker-compose up --build

# Scale workers for more throughput
docker-compose up --scale worker=5
```

Services will be available at:

| Service              | URL                       |
| -------------------- | ------------------------- |
| API Server           | `http://localhost:8080`   |
| RabbitMQ Management  | `http://localhost:15672`  |
| PostgreSQL           | `localhost:5432`          |

Default RabbitMQ creds: `guest` / `guest`

### Run Locally

```bash
# 1. Start dependencies
docker-compose up postgres rabbitmq

# 2. Run migrations (auto-runs via docker-entrypoint-initdb.d on first start)

# 3. Start API server
go run ./cmd/api

# 4. Start worker (separate terminal)
go run ./cmd/worker
```

---

## 📡 API Endpoints

All endpoints are prefixed with `/api/v1`.

---

### `POST /api/v1/scan` — Submit Scan Job

Submit a YouTube URL for copyright scanning. Returns immediately with a `job_id` for polling.

**Request:**

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response `202 Accepted`:**

```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "message": "scan job queue mein daal diya, GET /api/v1/scan/:id se result check karo"
}
```

**Errors:**

| Status | Condition             |
| ------ | --------------------- |
| `400`  | Missing/invalid body  |
| `400`  | Empty `url` field     |
| `500`  | Queue publish failure |

**cURL:**

```bash
curl -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

---

### `GET /api/v1/scan/:id` — Get Scan Result

Poll scan result by job ID. Returns copyright match details once processing completes.

**Response `200 OK`:**

```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "done",
  "copyright_flag": true,
  "phash_score": 0.953125,
  "vector_score": 0.912,
  "confidence": 0.953125,
  "matched_video_id": "f9e8d7c6-b5a4-3210-fedc-ba0987654321"
}
```

**Fields:**

| Field              | Type    | Description                                                     |
| ------------------ | ------- | --------------------------------------------------------------- |
| `job_id`           | string  | UUID of the scan job                                            |
| `status`           | string  | `"done"` when processing complete                               |
| `copyright_flag`   | boolean | `true` if pirated content detected                              |
| `phash_score`      | float   | Max perceptual hash similarity (0.0–1.0). Higher = more similar |
| `vector_score`     | float   | Max cosine similarity from vector search (0.0–1.0)              |
| `confidence`       | float   | Overall confidence score (`max(phash_score, vector_score)`)     |
| `matched_video_id` | string  | UUID of the best-matching protected video (if any)              |

**Errors:**

| Status | Condition        |
| ------ | ---------------- |
| `400`  | Invalid UUID     |
| `404`  | Result not found |

**cURL:**

```bash
curl http://localhost:8080/api/v1/scan/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

### `POST /api/v1/protected` — Register Protected Content

Register a video as protected content. Its keyframes will be fingerprinted and stored for future scans to match against.

**Request:**

```json
{
  "url": "https://www.youtube.com/watch?v=ORIGINAL_VIDEO_ID",
  "title": "My Original Movie Trailer"
}
```

**Response `202 Accepted`:**

```json
{
  "job_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "status": "queued",
  "message": "protected content registration queued"
}
```

**Errors:**

| Status | Condition              |
| ------ | ---------------------- |
| `400`  | Missing/invalid body   |
| `400`  | Empty `url` or `title` |
| `500`  | Queue publish failure  |

**cURL:**

```bash
curl -X POST http://localhost:8080/api/v1/protected \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=ORIGINAL", "title": "My Movie"}'
```

---

### `GET /api/v1/health` — Health Check

Liveness probe for the API server.

**Response `200 OK`:**

```json
{
  "status": "ok",
  "service": "vid-piracy-backend"
}
```

---

## 🔧 Processing Pipeline (Worker)

When a worker picks up a job from RabbitMQ, it executes the following steps:

### For `scan` jobs:

```text
1. yt-dlp downloads video to temp dir
2. FFmpeg extracts keyframes at configured FPS (default: 1 frame/sec)
3. Dual concurrent pipeline:
   ├── Goroutine A: Generate pHash + dHash for each frame (semaphore-limited)
   └── Goroutine B: Generate vector embeddings (HTTP inference or placeholder)
4. pHash matching: Hamming distance query against frame_phashes table
5. Vector matching: Cosine similarity search via pgvector <=> operator
6. Aggregate results → determine copyright flag
7. Store scan result in scan_results table
8. Cleanup temp directory
```

### For `register` jobs:

```text
1. Insert video metadata into protected_videos (status: pending)
2. Download video → Extract keyframes
3. Generate pHash + embeddings (concurrent)
4. Batch insert into frame_phashes + frame_embeddings
5. Update video status to "done"
```

---

## 🗄️ Database Schema

Four tables, managed via the migration in `migrations/001_init.up.sql`:

### `protected_videos`

Stores metadata for copyrighted content to match against.

| Column           | Type         | Description                                |
| ---------------- | ------------ | ------------------------------------------ |
| `id`             | UUID (PK)    | Auto-generated                             |
| `title`          | VARCHAR(512) | Video title                                |
| `description`    | TEXT         | Optional description                       |
| `channel_id`     | VARCHAR(128) | Source channel identifier                  |
| `source_url`     | TEXT         | Original video URL                         |
| `duration_sec`   | INT          | Video duration in seconds                  |
| `frame_rate_fps` | FLOAT        | FPS used for keyframe extraction           |
| `status`         | VARCHAR(32)  | `pending` → `processing` → `done`/`failed` |
| `created_at`     | TIMESTAMPTZ  | Creation timestamp                         |
| `updated_at`     | TIMESTAMPTZ  | Last update timestamp                      |

### `frame_phashes`

Per-frame perceptual hash values for fast exact/near-exact matching.

| Column          | Type        | Description                                |
| --------------- | ----------- | ------------------------------------------ |
| `id`            | UUID (PK)   | Auto-generated                             |
| `video_id`      | UUID (FK)   | References `protected_videos.id` (CASCADE) |
| `frame_index`   | INT         | 0-based frame index                        |
| `timestamp_sec` | FLOAT       | Frame timestamp in the video               |
| `phash_value`   | BIGINT      | 64-bit perceptual hash                     |
| `dhash_value`   | BIGINT      | Optional 64-bit difference hash            |
| `created_at`    | TIMESTAMPTZ | Creation timestamp                         |

**Indexes:** `idx_phash_value` (B-tree on `phash_value`), `idx_phash_video` (on `video_id`)

### `frame_embeddings`

Per-frame vector embeddings for fuzzy semantic matching via pgvector.

| Column          | Type        | Description                                |
| --------------- | ----------- | ------------------------------------------ |
| `id`            | UUID (PK)   | Auto-generated                             |
| `video_id`      | UUID (FK)   | References `protected_videos.id` (CASCADE) |
| `frame_index`   | INT         | 0-based frame index                        |
| `timestamp_sec` | FLOAT       | Frame timestamp                            |
| `embedding`     | vector(1024)| Jina AI multimodal embedding (1024 dimensions)|
| `created_at`    | TIMESTAMPTZ | Creation timestamp                         |

**Indexes:** `idx_embedding_cosine` (IVFFlat with `vector_cosine_ops`, lists=100), `idx_embedding_video`

### `scan_results`

Stores outcomes of each scan job.

| Column               | Type        | Description                               |
| -------------------- | ----------- | ----------------------------------------- |
| `id`                 | UUID (PK)   | Scan result ID                            |
| `scanned_url`        | TEXT        | URL that was scanned                      |
| `is_copyright_flag`  | BOOLEAN     | Whether piracy was detected               |
| `phash_match_count`  | INT         | Number of pHash matches found             |
| `vector_match_count` | INT         | Number of vector matches found            |
| `max_phash_score`    | FLOAT       | Highest pHash similarity (0.0–1.0)        |
| `max_vector_score`   | FLOAT       | Highest cosine similarity (0.0–1.0)       |
| `matched_video_id`   | UUID (FK)   | Best matching protected video             |
| `match_details`      | JSONB       | Detailed per-frame match breakdown        |
| `created_at`         | TIMESTAMPTZ | Scan timestamp                            |

---

## 🔬 Similarity Matching

### Perceptual Hashing (Exact/Near-Exact)

- Generates 64-bit **pHash** and **dHash** per keyframe using [goimagehash](https://github.com/corona10/goimagehash)
- Compares via **Hamming distance** (XOR + popcount) computed in PostgreSQL using `bit_count()`
- Similarity score: `1.0 - (hamming_distance / 64.0)`
- Default threshold: ≤10 bits difference (configurable)

### Vector Embeddings (Fuzzy/Semantic)

- Generates 1024-dimensional vectors using Jina AI multimodal API (`jina-clip-v2`)
- Stored in pgvector `vector(1024)` columns with **IVFFlat** index
- Compared via **cosine similarity** using pgvector's `<=>` operator
- Default threshold: ≥0.85 similarity (configurable)
- Top-K search limit: 20 results per query frame

### Copyright Flag Logic

A video is flagged as pirated when **either**:
- pHash similarity ≥ 0.9 (near-exact frame match)
- Vector similarity ≥ configured threshold (default 0.85)

The `matched_video_id` is determined by which protected video has the most frame-level matches across both methods.

---

## ⚡ Configuration

All config lives in `config.yaml` with environment variable overrides via Viper.

```yaml
server:
  port: 8080
  read_timeout: 30s
  write_timeout: 30s

database:
  host: localhost
  port: 5432
  user: postgres
  password: postgres
  dbname: vidpiracy
  sslmode: disable
  max_conns: 20

rabbitmq:
  url: amqp://guest:guest@localhost:5672/
  queue_name: video.scan
  prefetch_count: 1         # Fair dispatch: 1 job per worker at a time

processing:
  frame_rate_fps: 1.0       # Extract 1 frame per second
  max_concurrent_frames: 10 # Goroutine pool size for hashing/embedding
  temp_dir: /tmp/vidpiracy

similarity:
  phash_threshold: 10       # Max Hamming distance for pHash match
  vector_threshold: 0.85    # Min cosine similarity for vector match
  vector_search_limit: 20   # Top-K results from pgvector

embedder:
  api_key: ${JINA_API_KEY}
  model: jina-clip-v2
  embedding_dim: 1024
```

### Environment Variable Overrides

Viper auto-reads env vars. Docker Compose uses this for service-to-service config:

```bash
DATABASE_HOST=postgres
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
```

---

## 🐳 Docker

### Multi-Stage Build

The `Dockerfile` uses a two-stage build:

1. **Builder** (`golang:1.22-alpine`): Compiles both `api` and `worker` binaries
2. **Runtime** (`alpine:3.19`): Minimal image with FFmpeg + yt-dlp installed

Both binaries are built with `CGO_ENABLED=0` for static linking.

### Docker Compose Services

| Service    | Image                           | Purpose                               |
| ---------- | ------------------------------- | ------------------------------------- |
| `postgres` | `pgvector/pgvector:pg16`        | PostgreSQL 16 with pgvector extension |
| `rabbitmq` | `rabbitmq:3-management-alpine`  | Message broker with management UI     |
| `api`      | Built from Dockerfile           | HTTP API server (port 8080)           |
| `worker`   | Built from Dockerfile           | Queue consumer (default: 2 replicas)  |

Migrations auto-run on first Postgres start via `docker-entrypoint-initdb.d`.

---

## 📬 Message Queue

RabbitMQ is used for decoupling the API from heavy processing:

- **Queue**: `video.scan` (durable, persistent messages)
- **Publisher**: API server pushes `QueueMessage` with `job_id`, `url`, and `action` (`scan` or `register`)
- **Consumer**: Worker(s) consume with `prefetch_count=1` for fair dispatch
- **Acknowledgment**: Manual ACK after successful processing; NACK with requeue on first failure, drop on second

### Message Format

```json
{
  "job_id": "uuid-v4",
  "url": "https://youtube.com/...",
  "action": "scan"   // "scan" or "register"
}
```

---

## 🔌 Embedding Service

The embedder uses the [Jina AI Embeddings API](https://jina.ai/embeddings/).

It converts extracted keyframes to base64 images and sends them to the Jina API (`https://api.jina.ai/v1/embeddings`) using the configured model (e.g. `jina-clip-v2`). Generated embeddings are returned as 1024-dimensional vectors.

---

## 🧪 Example Workflow

```bash
# 1. Register original copyrighted content
curl -X POST http://localhost:8080/api/v1/protected \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=ORIGINAL", "title": "Original Movie"}'
# → {"job_id": "abc-123", "status": "queued"}

# 2. Wait for registration to complete (worker processes it)

# 3. Scan a suspected pirated video
curl -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=SUSPECTED_PIRATE"}'
# → {"job_id": "def-456", "status": "queued"}

# 4. Poll for results
curl http://localhost:8080/api/v1/scan/def-456
# → {"copyright_flag": true, "phash_score": 0.95, "vector_score": 0.91, ...}
```

---

## 📜 License

MIT
