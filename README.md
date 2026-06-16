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

```
You upload a video
        ↓
  Keyframes extracted (FFmpeg @ 1fps)
        ↓
  ┌─────────────────┬─────────────────┐
  │   pHash (64-bit) │  Jina CLIP v2   │
  │   Hamming dist.  │  Cosine sim.    │
  └────────┬────────┴────────┬────────┘
           ↓                 ↓
      PostgreSQL          pgvector
      bit_count()         <=> operator
           ↓                 ↓
           └──── Combined ────┘
                    ↓
            Confidence Score
          (LOW / MEDIUM / HIGH)
```

1. Video lands on the API (URL or direct upload up to 2GB)
2. Job goes into RabbitMQ for async processing
3. Worker pulls the video, extracts keyframes with FFmpeg
4. Each frame gets hashed (pHash) and embedded (Jina CLIP v2 API)
5. Both are queried against the protected content database
6. Results are aggregated and returned with a confidence breakdown

---

## Architecture

```
Internet
    ↓
Cloudflare Edge (WAF · DDoS · Rate Limiting · HTTPS)
    ↓ (Secure Tunnel)
┌─────────────────────────────────────────────┐
│              Docker Network                  │
│                                              │
│  cloudflared ──→ Nginx ──→ React SPA         │
│                    │                         │
│                    ├──→ Go API (:8080)        │
│                    │       ├──→ PostgreSQL    │
│                    │       │     + pgvector   │
│                    │       └──→ RabbitMQ      │
│                    │              ↓           │
│                    │           Worker(s)      │
│                    │           (yt-dlp,       │
│                    │            FFmpeg,       │
│                    │            Jina AI)      │
└─────────────────────────────────────────────┘
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

| Table | Purpose |
|-------|---------|
| `users` | Account credentials (bcrypt hashed) |
| `refresh_tokens` | Server-side token revocation |
| `protected_videos` | Registered content to protect |
| `frame_phashes` | 64-bit perceptual hashes per keyframe |
| `frame_embeddings` | 1024-dim vector embeddings per keyframe |
| `scan_results` | Scan history with match scores |

---

## License

MIT
