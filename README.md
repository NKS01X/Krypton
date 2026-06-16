<p align="center">
  <img src="docs/screenshots/landing.png" alt="Krypton Landing Page" width="800" />
</p>

<h1 align="center">Krypton</h1>
<p align="center">
  <b>AI-powered video copyright detection that actually works.</b><br/>
  Perceptual hashing + deep neural embeddings to catch pirated content across the internet — in seconds.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.22-00ADD8?style=flat-square&logo=go" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/pgvector-0.7-4169E1?style=flat-square" />
  <img src="https://img.shields.io/badge/RabbitMQ-3-FF6600?style=flat-square&logo=rabbitmq&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

---

## What is this?

Krypton is a full-stack video copyright detection system. You give it a video (URL or file upload), and it tells you whether that video matches anything in your protected content database.

It does this through two independent detection methods running in parallel:

- **Perceptual Hashing (pHash)** — Structural visual fingerprinting. Catches near-exact copies even after re-encoding, watermark overlays, or resolution changes.
- **Vector Embeddings (Jina CLIP v2)** — 1024-dimensional deep neural embeddings via pgvector. Catches semantic copies — flipped, cropped, color-graded, or speed-altered videos.

Both signals are combined into a single confidence score.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/landing.png" alt="Landing Page" width="700" /><br/>
  <em>Landing page with live dashboard preview</em>
</p>

<p align="center">
  <img src="docs/screenshots/auth.png" alt="Authentication" width="700" /><br/>
  <em>JWT authentication with secure httpOnly refresh cookies</em>
</p>

---

## How it works

```mermaid
sequenceDiagram
    participant User
    participant API as Fiber API (Go)
    participant MQ as RabbitMQ
    participant Worker as Task Worker (Go)
    participant Extract as FFmpeg / yt-dlp
    participant Model as Jina CLIP v2
    participant DB as PostgreSQL + pgvector

    User->>API: POST /api/v1/scan (URL or File)
    API->>MQ: Publish Scan Task
    API-->>User: Return job_id
    
    MQ-->>Worker: Consume Task
    Worker->>Extract: Download & Extract Keyframes (1fps)
    Extract-->>Worker: Return Frame Images
    
    par Dual-Pipeline Processing
        Worker->>Worker: Compute pHash (64-bit perceptual hash)
        Worker->>Model: Request Embeddings
        Model-->>Worker: Return 1024-dim Vectors
    end

    Worker->>DB: Query pHash (bit_count Hamming dist)
    DB-->>Worker: pHash Match Scores
    Worker->>DB: Query Vectors (<=> Cosine sim)
    DB-->>Worker: Vector Match Scores

    Worker->>DB: Update scan_results (Confidence Score)
    
    User->>API: GET /api/v1/scan/:job_id (Polling)
    API->>DB: Fetch Status
    DB-->>API: Status (Done + Results)
    API-->>User: Analysis Report
```

1. Video lands on the API (URL or direct upload up to 2GB)
2. Job goes into RabbitMQ for async processing
3. Worker pulls the video, extracts keyframes with FFmpeg
4. Each frame gets hashed (pHash) and embedded (Jina CLIP v2 API)
5. Both are queried against the protected content database
6. Results are aggregated and returned with a confidence breakdown

---

## Architecture

```mermaid
graph TD
    %% Define Styles
    classDef client fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff
    classDef edge fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff
    classDef network fill:#1e293b,stroke:#475569,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
    classDef proxy fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    classDef backend fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff
    classDef queue fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    classDef db fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff
    classDef external fill:#64748b,stroke:#334155,stroke-width:2px,color:#fff

    Client("Client Browser"):::client
    CF("Cloudflare Edge<br/>(WAF, DDoS, HTTPS)"):::edge
    
    subgraph OCI["Oracle Cloud VM (Isolated Docker Network)"]
        Tunnel("cloudflared<br/>(Outbound Secure Tunnel)"):::proxy
        Nginx("Nginx<br/>(Reverse Proxy & Static Assets)"):::proxy
        SPA("React SPA<br/>(Vite)"):::client
        
        API("Fiber API<br/>(Go Gateway)"):::backend
        MQ("RabbitMQ<br/>(Message Queue)"):::queue
        Worker("Background Workers<br/>(Go Routines)"):::backend
        
        DB[("PostgreSQL 16<br/>+ pgvector")]:::db
    end

    Jina("Jina AI API<br/>(Multimodal Embeddings)"):::external

    Client -->|HTTPS| CF
    CF -->|Zero Trust Tunnel| Tunnel
    Tunnel -->|HTTP| Nginx
    
    Nginx -->|Route /| SPA
    Nginx -->|Route /api/*| API
    
    API -->|Publish Task| MQ
    API -->|Read/Write Session| DB
    
    MQ -->|Consume Task| Worker
    Worker -->|Fetch Vectors| Jina
    Worker -->|Query Similarity| DB
```

No ports exposed to the public internet. All traffic flows through Cloudflare Tunnels.

---

## Tech stack

| Layer | Tech | Why |
|-------|------|-----|
| Backend | Go 1.22, Fiber | Fast, compiled, great concurrency primitives |
| Frontend | React 18, Vite, Framer Motion | Responsive SPA with smooth animations |
| Database | PostgreSQL 16 + pgvector | Relational + vector similarity in one engine |
| Queue | RabbitMQ 3 | Reliable async job dispatch with manual ACK |
| Video | FFmpeg, yt-dlp | Keyframe extraction + URL video downloading |
| Embeddings | Jina AI (jina-clip-v2) | 1024-dim multimodal vectors |
| Proxy | Nginx | Static assets + transparent API reverse proxy |
| Security | Cloudflare Tunnels, JWT | Zero-trust networking + token auth |
| Infra | Docker Compose, Terraform | One-command deployment to Oracle Cloud |

---

## Project structure

```
Krypton/
├── cmd/
│   ├── api/main.go                 # API server entrypoint
│   └── worker/main.go              # Queue worker entrypoint
├── internal/
│   ├── auth/                       # JWT tokens, middleware
│   ├── config/                     # Viper config parsing
│   ├── embedder/                   # Jina AI client
│   ├── engine/                     # Core fingerprint + comparison logic
│   ├── extractor/                  # yt-dlp + FFmpeg wrappers
│   ├── handler/                    # HTTP route handlers
│   ├── hasher/                     # pHash + dHash implementation
│   ├── models/                     # Data models
│   ├── queue/                      # RabbitMQ pub/sub
│   └── repository/                 # PostgreSQL data access
├── migrations/                     # SQL schema files
├── frontend/
│   ├── src/
│   │   ├── LandingPage.jsx         # Marketing landing page
│   │   ├── AuthModal.jsx           # Login/signup modal
│   │   ├── AuthContext.jsx         # JWT session management
│   │   ├── App.jsx                 # Scanner dashboard
│   │   └── index.css               # Design system
│   ├── nginx.conf                  # Reverse proxy config
│   └── Dockerfile                  # Multi-stage build
├── deploy/
│   ├── docker-compose.prod.yml     # Production stack
│   ├── .env.prod.example           # Environment template
│   ├── README.md                   # Deployment guide
│   └── terraform/                  # Oracle Cloud IaC
├── docker-compose.yml              # Dev stack
├── Dockerfile                      # Backend multi-stage build
└── config.yaml                     # App configuration
```

---

## Getting started

### Prerequisites

- Docker & Docker Compose
- API keys: [Jina AI](https://jina.ai/) (embeddings), [SerpAPI](https://serpapi.com/) (optional)

### 1. Clone and configure

```bash
git clone https://github.com/NKS01X/Krypton.git
cd Krypton
cp .env.example .env
# Fill in your API keys
```

### 2. Run

```bash
docker compose up --build -d
```

### 3. Scale workers

```bash
docker compose up -d --scale worker=4
```

The app is now running at `http://localhost:80`.

---

## API

All endpoints are under `/api/v1`. Auth routes are public; scanner routes require a Bearer token.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get access token + refresh cookie |
| POST | `/api/v1/auth/refresh` | Rotate access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |

### Scanner (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scan` | Submit URL for scanning |
| POST | `/api/v1/scan/upload` | Upload video file (up to 2GB) |
| GET | `/api/v1/scan/:id` | Poll scan results |
| POST | `/api/v1/protected` | Register a video to protect |
| POST | `/api/v1/protected/upload` | Upload a protected video file |

---

## Detection methods

### Perceptual hashing

Each keyframe is reduced to a 64-bit hash representing its visual structure. Comparison uses Hamming distance via PostgreSQL's `bit_count` on XOR:

```sql
SELECT video_id, frame_index,
       (64 - bit_count(phash_value # $1)) AS match_score
FROM frame_phashes
WHERE bit_count(phash_value # $1) <= 10;
```

Resistant to: re-encoding, watermarks, contrast changes, resolution scaling.

### Vector embeddings

Frames are encoded into 1024-dim vectors using Jina CLIP v2. Similarity is evaluated via cosine distance with pgvector's IVFFlat index:

```sql
SELECT video_id, frame_index,
       (1 - (embedding <=> $1)) AS similarity
FROM frame_embeddings
ORDER BY embedding <=> $1
LIMIT 20;
```

Resistant to: horizontal flips, color grading, cropping, speed changes.

---

## Security

- **Zero-trust networking** — Cloudflare Tunnel creates an outbound-only connection. No inbound ports open on the server.
- **JWT architecture** — Access tokens (15min, in-memory only) + refresh tokens (7d, httpOnly/Secure/SameSite cookies with server-side revocation).
- **Cloudflare WAF** — Managed ruleset + OWASP Core for SQLi/XSS protection.
- **Rate limiting** — Auth endpoints rate-limited at the Cloudflare edge.
- **Network isolation** — All backend services communicate on an internal Docker network. Only Nginx is reachable from the tunnel.

---

## Deployment

Production deployment targets Oracle Cloud Always Free tier (ARM A1 Flex, 12GB RAM, $0/month forever).

Infrastructure is fully automated with Terraform. See [`deploy/README.md`](deploy/README.md) for the complete guide.

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in OCI credentials
terraform init && terraform apply
```

---

## Database schema

```mermaid
erDiagram
    USERS ||--o{ REFRESH_TOKENS : "has"
    PROTECTED_VIDEOS ||--o{ FRAME_PHASHES : "contains"
    PROTECTED_VIDEOS ||--o{ FRAME_EMBEDDINGS : "contains"
    PROTECTED_VIDEOS ||--o{ SCAN_RESULTS : "matches"

    USERS {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        timestamp created_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamp expires_at
        boolean revoked
    }

    PROTECTED_VIDEOS {
        uuid id PK
        varchar title
        text description
        text source_url
        varchar status "pending, processing, done"
        timestamp created_at
    }

    FRAME_PHASHES {
        uuid id PK
        uuid video_id FK
        int frame_index
        float timestamp_sec
        bigint phash_value
    }

    FRAME_EMBEDDINGS {
        uuid id PK
        uuid video_id FK
        int frame_index
        vector embedding "1024-dim array"
    }

    SCAN_RESULTS {
        uuid id PK
        text scanned_url
        boolean is_copyright_flag
        float max_phash_score
        float max_vector_score
        uuid matched_video_id FK
    }
```

---

## License

MIT
