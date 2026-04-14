package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pgvector/pgvector-go"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/models"
)

type VectorRepo struct {
	pool *pgxpool.Pool
}

func NewVectorRepo(pool *pgxpool.Pool) *VectorRepo {
	return &VectorRepo{pool: pool}
}

func (r *VectorRepo) InsertEmbeddings(ctx context.Context, embeddings []models.FrameEmbedding) error {
	if len(embeddings) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	query := `
		INSERT INTO frame_embeddings (id, video_id, frame_index, timestamp_sec, embedding, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (video_id, frame_index) DO UPDATE SET embedding = $5`

	for _, e := range embeddings {
		e.ID = uuid.New()
		e.CreatedAt = time.Now()
		batch.Queue(query, e.ID, e.VideoID, e.FrameIndex, e.TimestampSec, e.Embedding, e.CreatedAt)
	}

	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	for i := 0; i < len(embeddings); i++ {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("embedding insert fail at index %d: %w", i, err)
		}
	}

	log.Info().Int("count", len(embeddings)).Msg("embeddings batch inserted")
	return nil
}

type VectorMatch struct {
	VideoID      uuid.UUID
	FrameIndex   int
	TimestampSec float64
	Similarity   float64
}

func (r *VectorRepo) FindSimilarByCosineSim(ctx context.Context, queryEmbedding pgvector.Vector, excludeVideoID uuid.UUID, threshold float64, limit int) ([]VectorMatch, error) {
	query := `
		SELECT video_id, frame_index, timestamp_sec,
		       1 - (embedding <=> $1) AS similarity
		FROM frame_embeddings
		WHERE video_id != $2
		ORDER BY embedding <=> $1
		LIMIT $3`

	rows, err := r.pool.Query(ctx, query, queryEmbedding, excludeVideoID, limit)
	if err != nil {
		return nil, fmt.Errorf("cosine similarity query fail: %w", err)
	}
	defer rows.Close()

	var matches []VectorMatch
	for rows.Next() {
		var m VectorMatch
		if err := rows.Scan(&m.VideoID, &m.FrameIndex, &m.TimestampSec, &m.Similarity); err != nil {
			return nil, fmt.Errorf("scan vector match fail: %w", err)
		}

		if m.Similarity >= threshold {
			matches = append(matches, m)
		}
	}

	log.Debug().
		Int("matches_above_threshold", len(matches)).
		Float64("threshold", threshold).
		Msg("cosine similarity search done")

	return matches, nil
}

func (r *VectorRepo) FindSimilarBatch(ctx context.Context, queryEmbeddings []models.FrameEmbedding, excludeVideoID uuid.UUID, threshold float64, limit int) (map[int][]VectorMatch, error) {
	results := make(map[int][]VectorMatch)

	for _, qe := range queryEmbeddings {
		matches, err := r.FindSimilarByCosineSim(ctx, qe.Embedding, excludeVideoID, threshold, limit)
		if err != nil {
			log.Error().Int("frame", qe.FrameIndex).Err(err).Msg("batch similarity search fail for frame")
			continue
		}
		if len(matches) > 0 {
			results[qe.FrameIndex] = matches
		}
	}

	return results, nil
}
