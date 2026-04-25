-- pgvector extension enable karo
CREATE EXTENSION IF NOT EXISTS vector;

-- Protected content metadata table
CREATE TABLE IF NOT EXISTS protected_videos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(512) NOT NULL,
    description     TEXT,
    channel_id      VARCHAR(128),
    source_url      TEXT NOT NULL,
    duration_sec    INT,
    frame_rate_fps  FLOAT DEFAULT 1.0,
    status          VARCHAR(32) DEFAULT 'pending',  -- pending | processing | done | failed
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Perceptual hash table — har keyframe ka ek row
CREATE TABLE IF NOT EXISTS frame_phashes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id        UUID NOT NULL REFERENCES protected_videos(id) ON DELETE CASCADE,
    frame_index     INT NOT NULL,
    timestamp_sec   FLOAT NOT NULL,
    phash_value     BIGINT NOT NULL,        -- 64-bit perceptual hash
    dhash_value     BIGINT,                 -- optional difference hash
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(video_id, frame_index)
);

-- Fast lookup ke liye phash pe index
CREATE INDEX idx_phash_value ON frame_phashes(phash_value);
CREATE INDEX idx_phash_video ON frame_phashes(video_id);

-- Vector embeddings table — har keyframe ka embedding
CREATE TABLE IF NOT EXISTS frame_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id        UUID NOT NULL REFERENCES protected_videos(id) ON DELETE CASCADE,
    frame_index     INT NOT NULL,
    timestamp_sec   FLOAT NOT NULL,
    embedding       vector(1024),           -- Jina-Clip-v2 = 1024 dims
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(video_id, frame_index)
);

-- Cosine similarity search ke liye ivfflat index
CREATE INDEX idx_embedding_cosine ON frame_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_embedding_video ON frame_embeddings(video_id);

-- Scan results store karne ke liye
CREATE TABLE IF NOT EXISTS scan_results (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scanned_url         TEXT NOT NULL,
    is_copyright_flag   BOOLEAN DEFAULT FALSE,
    phash_match_count   INT DEFAULT 0,
    vector_match_count  INT DEFAULT 0,
    max_phash_score     FLOAT DEFAULT 0.0,
    max_vector_score    FLOAT DEFAULT 0.0,
    matched_video_id    UUID REFERENCES protected_videos(id),
    match_details       JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
