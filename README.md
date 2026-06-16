# Krypton - AI Video Copyright Protection Suite

Krypton is an enterprise-grade, high-performance video copyright detection and verification system. It leverages dual-layer similarity matching (combining perceptual hashing for near-exact match detection and deep multimodal vector embeddings via pgvector for fuzzy/semantic match detection) to identify pirated content across the internet in seconds.

The system is split into a scalable Go concurrency backend pipeline, a modern Vite/React SPA frontend designed with a clean Clarity-inspired light theme, and a secure reverse-proxy perimeter protecting the API with JWT authentication and PoW-Shield Layer 7 DDoS mitigation.

---

## Architecture Overview

```text
                                  ┌───────────────────────────────┐
                                  │         Client Browser        │
                                  └───────────────┬───────────────┘
                                                  │
                                                  │ (Port 5173 / HTTP/S)
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │      PoW-Shield Proxy         │
                                  │   (DDoS & Bot Mitigation)     │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │      Frontend Nginx Server    │
                                  └───────┬───────────────┬───────┘
                                          │               │
                            (SPA Assets)  │               │ (/api/* Proxy)
                                          ▼               ▼
                                  ┌───────────────┐┌───────────────┐
                                  │   React SPA   ││   Go Backend  │
                                  │ (Vite Build)  ││ (Fiber API)   │
                                  └───────────────┘└───────┬───────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │   RabbitMQ    │
                                                  │ (Job Queue)   │
                                                  └───────┬───────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │   Worker(s)   │
                                                  └───────┬───────┘
                                                          │
                               ┌──────────────────────────┼──────────────────────────┐
                               │                          │                          │
                               ▼                          ▼                          ▼
                     ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
                     │     yt-dlp       │       │     FFmpeg       │       │    PostgreSQL    │
                     │ (Video Download) │       │(Keyframe Extract)│       │    + pgvector    │
                     └──────────────────┘       └──────────────────┘       └──────────────────┘
```

### End-to-End Flow
1. **Perimeter Defense**: All incoming client traffic lands on the PoW-Shield proxy, which forces automated bots and crawlers to solve a client-side cryptographic proof-of-work (PoW) puzzle before passing.
2. **Reverse Proxying**: Once solved, PoW-Shield forwards traffic to Nginx inside the docker network. Nginx serves the React SPA assets and proxies `/api/*` to the Go backend API.
3. **Authentication**: Authentication handlers authorize users via JWT access tokens (in-memory) and refresh tokens (signed httpOnly secure cookies with server-side revocation). All scanning routes are protected by Fiber middleware validating this token.
4. **Queue Ingestion**: The API server accepts video links or direct video uploads (up to 2GB), queues a background task onto RabbitMQ, and returns a `job_id`.
5. **Keyframe Pipeline**: Workers consume tasks, download videos via yt-dlp (if URL) or load raw uploads directly, extract keyframes via FFmpeg (at 1 FPS), and concurrent workers compute:
   - **pHash**: Perceptual and difference image hashing.
   - **Vectors**: 1024-dimension deep neural embeddings using the Jina AI multimodal jina-clip-v2 API.
6. **Cross-Matching & Scoring**: Frame data is queried in PostgreSQL utilizing bit_count for Hamming distance (pHash) and the <=> cosine operator via IVFFlat indexing (pgvector). Results are aggregated to flag copyright status.

---

## Project Structure

```text
Krypton/
├── cmd/
│   ├── api/main.go              # HTTP API gateway entry point
│   └── worker/main.go           # RabbitMQ worker daemon entry point
├── internal/
│   ├── auth/                    # JWT service & Fiber auth middleware
│   ├── config/                  # Configuration parsing via Viper
│   ├── embedder/                # Multimodal Jina AI API integration client
│   ├── engine/                  # Core fingerprinting & comparison engine
│   ├── extractor/               # yt-dlp download & FFmpeg keyframe wrappers
│   ├── handler/                 # Auth & protected scanner Fiber handlers
│   ├── hasher/                  # Perceptual & difference image hashing
│   ├── models/                  # Core user, token, video, and scan schemas
│   ├── queue/                   # RabbitMQ publishers & consumers
│   └── repository/              # PostgreSQL data layers (video, vector, user)
├── migrations/                  # Schema migrations (001_init, 002_users)
├── config.yaml                  # System configuration parameters
├── docker-compose.yml           # Multi-container service orchestration
├── Dockerfile                   # Multi-stage optimized builder file
├── .env.example                 # Example server environment configuration
└── frontend/                    # React SPA client application
    ├── src/
    │   ├── AuthContext.jsx      # Session management & auto-refresh logic
    │   ├── AuthModal.jsx        # Login/Signup modal with tab switching
    │   ├── LandingPage.jsx      # Clarity-inspired light theme landing page
    │   ├── App.jsx              # Secured core workspace & scanning dashboard
    │   ├── index.css            # Style sheets & unified color tokens
    │   └── main.jsx             # SPA entry point with conditional auth routing
    ├── nginx.conf               # Internal routing reverse proxy config
    └── vite.config.js           # Dev-mode reverse proxy setup
```

---

## Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Language** | Go 1.22 | High-performance compiled backend service |
| **Database** | PostgreSQL 16 | Relational database engine |
| **Vector Engine** | pgvector | Cosine similarity indexing for 1024-dim vectors |
| **Message Broker** | RabbitMQ 3 | Fair dispatch task queues with manual ACK |
| **Gateway Security** | PoW-Shield | Client-side challenge Layer 7 DDoS and bot protection |
| **Web Proxy** | Nginx Alpine | Asset server and API router |
| **Client UI** | React, Vite, Framer Motion | High-fidelity interactive SPA |

---

## Detailed Component Specifications

### 1. Security & Authentication Architecture
To prevent malicious access and credential harvesting, the application isolates the core business logic behind a multi-tier security setup:
* **JWT Session Lifecycle**: 
  * Access tokens have a TTL of 15 minutes, are kept in the browser's JavaScript memory state, and are never written to disk or LocalStorage.
  * Refresh tokens have a TTL of 7 days, are cryptographically signed, and are transmitted exclusively via httpOnly, Secure, and SameSite cookies (protecting against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF)).
  * The backend maintains a `refresh_tokens` database table enabling instant session revocation (logout) and preventing replay attacks.
* **Network Isolation**: The application and API services run inside an isolated Docker network. No backend ports are exposed directly to the server host's public IP address. All API queries are routed through the secure internal proxy, preventing direct backend port scanning.

### 2. DDoS Mitigation (PoW-Shield)
The PoW-Shield reverse proxy sits at the edge of the deployment:
* **The Puzzle**: Every request from a new IP address is presented with a SHA-256 computational challenge.
* **Client-Side Solving**: The user's browser must compute a numeric nonce such that the hash of the nonce combined with a server-provided challenge string has a set number of leading zeros (determined by the difficulty setting).
* **Mitigation Logic**: Humans experience a single delay of 1-2 seconds on initial page load. Scripted bots, crawlers, and volumetric DDoS tools cannot scale their computation to solve thousands of puzzles simultaneously, causing them to run out of CPU resources and fail.

### 3. Dual-Layer Match Engine
Every keyframe extracted from scanned videos goes through two independent pipelines:
* **Perceptual Hashing (pHash)**: 
  * Generates a 64-bit integer hash representing the structural visual composition of the frame.
  * Hashing is resistant to minor modifications like contrast changes, watermark overlays, and scale adjustments.
  * Query evaluation calculates the Hamming distance between hashes using PostgreSQL's native bit_count function on XOR operations:
    ```sql
    SELECT video_id, frame_index, (64 - bit_count(phash_value # $1)) AS match_score
    FROM frame_phashes
    WHERE bit_count(phash_value # $1) <= 10;
    ```
* **Multimodal Vector Embeddings**:
  * Utilizes Jina AI's multimodal jina-clip-v2 API to convert frame images into dense 1024-dimensional floating-point vectors.
  * Captures semantic concepts within the video frames, making detection highly resistant to complex edits like horizontal flips, color grading changes, extreme cropping, and speed alterations.
  * Similarity is evaluated using cosine distance (via pgvector's <=> operator) accelerated by an IVFFlat index:
    ```sql
    SELECT video_id, frame_index, (1 - (embedding <=> $1)) AS similarity
    FROM frame_embeddings
    ORDER BY embedding <=> $1 LIMIT 20;
    ```

### 4. Background Job Queue (RabbitMQ)
Scanning and registering videos are resource-intensive operations that run asynchronously:
* **Concurrency Gates**: Workers limit concurrent keyframe downloads and processing steps using counting semaphores to prevent memory depletion.
* **Prefetch Configurations**: RabbitMQ consumers use a prefetch limit of 1, ensuring tasks are distributed fairly across multiple worker replicas instead of overloading a single container.
* **Error Recovery**: In the event of network timeouts or downstream API glitches during a task, workers issue a NACK (Negative Acknowledgment). The task is retried. Repeated failures are logged and gracefully stored as a failed scan status.

---

## Database Schema Detail

The database schema is managed via Go migrations located in `/migrations`:

### users
* `id` (UUID, Primary Key): Unique user identifier.
* `username` (VARCHAR, Unique): Custom account username.
* `email` (VARCHAR, Unique): Verified account email.
* `password_hash` (VARCHAR): BCrypt hashed password string.
* `created_at` / `updated_at`: Creation and modification timestamps.

### refresh_tokens
* `id` (UUID, Primary Key): Token identifier.
* `user_id` (UUID, Foreign Key): References users table.
* `token_hash` (VARCHAR, Indexed): SHA-256 hash of the refresh token.
* `expires_at` (TIMESTAMPTZ): Expiration timestamp.
* `revoked` (BOOLEAN): Revocation flag.

### protected_videos
* `id` (UUID, Primary Key): Unique video identifier.
* `title` (VARCHAR): Video title.
* `description` (TEXT): Description of the video.
* `source_url` (TEXT): Original reference URL.
* `status` (VARCHAR): Ingestion status (pending, processing, done, failed).
* `created_at` / `updated_at`: Auditing timestamps.

### frame_phashes
* `id` (UUID, Primary Key): Frame identifier.
* `video_id` (UUID, Foreign Key): References protected_videos.
* `frame_index` (INT): Index order of the frame.
* `timestamp_sec` (FLOAT): Video timestamp in seconds.
* `phash_value` (BIGINT, Indexed): 64-bit perceptual hash value.

### frame_embeddings
* `id` (UUID, Primary Key): Vector identifier.
* `video_id` (UUID, Foreign Key): References protected_videos.
* `frame_index` (INT): Index order of the frame.
* `embedding` (vector(1024)): 1024-dimension float vector.

### scan_results
* `id` (UUID, Primary Key): Scan transaction identifier.
* `scanned_url` (TEXT): The URL processed during the scan.
* `is_copyright_flag` (BOOLEAN): Status of piracy flag.
* `max_phash_score` (FLOAT): Maximum perceptual hash match percentage.
* `max_vector_score` (FLOAT): Maximum vector cosine similarity score.
* `matched_video_id` (UUID, Foreign Key): References matching protected video.

---

## Deployment Guide

### Prerequisites
* Docker and Docker Compose
* Domain name and SSL Certificates (recommended for production)

### Quick Start (Production Setup)
1. **Clone the repository** and navigate to the root directory.
2. **Create a .env file** based on the env configuration:
   ```bash
   cp .env.example .env
   ```
   Provide valid API keys for your AI embedders and secure secrets:
   ```env
   JINA_API_KEY=jina_your_api_key
   GEMINI_API_KEY=your_gemini_key
   SERP_API_KEY=your_serp_key
   JWT_SECRET=use-a-strong-random-key-here
   SESSION_KEY=strong-session-signing-key-for-pow-shield
   ```
3. **Build and start the container network**:
   ```bash
   docker-compose up --build -d
   ```
4. **Scale workers for ingestion performance**:
   ```bash
   docker-compose up -d --scale worker=4
   ```

Services will automatically initialize on the following endpoints:
* **User Application**: http://localhost:5173 (challenged by PoW-Shield)
* **RabbitMQ Dashboard**: http://localhost:15672 (credentials: guest/guest)
* **PostgreSQL Database**: localhost:5432 (internal only)

---

## API Reference

Endpoints are internally proxied from `/api/v1` to the Go backend.

### Public Auth Endpoints
* **`POST /api/v1/auth/register`**: Register a new user account.
* **`POST /api/v1/auth/login`**: Authenticate credentials; returns in-memory access_token and sets an httpOnly cookie for refresh.
* **`POST /api/v1/auth/refresh`**: Refresh expired access tokens securely.
* **`POST /api/v1/auth/logout`**: Expire user sessions and revoke active refresh tokens.

### Protected Scanning Endpoints (JWT Required)
* **`POST /api/v1/scan`**: Submit a video URL to scan for copyright matching.
* **`POST /api/v1/scan/upload`**: Directly upload a raw MP4/MOV/AVI video file up to 2GB to scan.
* **`GET /api/v1/scan/:id`**: Poll results of a scanning task.
* **`POST /api/v1/protected`**: Register a reference video to protect.
* **`POST /api/v1/protected/upload`**: Directly upload a reference video file to project database.

---

## License

MIT
