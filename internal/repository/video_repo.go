package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/models"
)

type VideoRepo struct {
	pool *pgxpool.Pool
}

func NewVideoRepo(pool *pgxpool.Pool) *VideoRepo {
	return &VideoRepo{pool: pool}
}

func (r *VideoRepo) InsertVideo(ctx context.Context, video *models.ProtectedVideo) error {
	video.ID = uuid.New()
	video.Status = "pending"
	video.CreatedAt = time.Now()
	video.UpdatedAt = time.Now()

	query := `
		INSERT INTO protected_videos (id, title, description, channel_id, source_url, duration_sec, frame_rate_fps, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := r.pool.Exec(ctx, query,
		video.ID, video.Title, video.Description, video.ChannelID,
		video.SourceURL, video.DurationSec, video.FrameRateFPS,
		video.Status, video.CreatedAt, video.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert video fail: %w", err)
	}

	log.Info().Str("video_id", video.ID.String()).Msg("video inserted")
	return nil
}

func (r *VideoRepo) UpdateVideoStatus(ctx context.Context, videoID uuid.UUID, status string) error {
	query := `UPDATE protected_videos SET status = $1, updated_at = $2 WHERE id = $3`
	_, err := r.pool.Exec(ctx, query, status, time.Now(), videoID)
	if err != nil {
		return fmt.Errorf("update status fail: %w", err)
	}
	return nil
}

func (r *VideoRepo) GetVideoByID(ctx context.Context, videoID uuid.UUID) (*models.ProtectedVideo, error) {
	query := `SELECT id, title, description, channel_id, source_url, duration_sec, frame_rate_fps, status, created_at, updated_at
	          FROM protected_videos WHERE id = $1`

	var v models.ProtectedVideo
	err := r.pool.QueryRow(ctx, query, videoID).Scan(
		&v.ID, &v.Title, &v.Description, &v.ChannelID,
		&v.SourceURL, &v.DurationSec, &v.FrameRateFPS,
		&v.Status, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get video fail: %w", err)
	}
	return &v, nil
}

func (r *VideoRepo) InsertPhashes(ctx context.Context, phashes []models.FramePhash) error {
	if len(phashes) == 0 {
		return nil
	}

	rows := make([][]interface{}, len(phashes))
	for i, p := range phashes {
		p.ID = uuid.New()
		p.CreatedAt = time.Now()
		rows[i] = []interface{}{
			p.ID, p.VideoID, p.FrameIndex, p.TimestampSec,
			int64(p.PhashValue), p.DhashValue, p.CreatedAt,
		}
	}

	copyCount, err := r.pool.CopyFrom(
		ctx,
		pgx.Identifier{"frame_phashes"},
		[]string{"id", "video_id", "frame_index", "timestamp_sec", "phash_value", "dhash_value", "created_at"},
		pgx.CopyFromRows(rows),
	)
	if err != nil {
		return fmt.Errorf("batch insert phashes fail: %w", err)
	}

	log.Info().Int64("inserted", copyCount).Msg("phashes batch inserted")
	return nil
}

func (r *VideoRepo) GetPhashMatches(ctx context.Context, phashValue int64, excludeVideoID uuid.UUID, threshold int) ([]PhashMatch, error) {
	query := `
	SELECT fp.video_id, fp.frame_index, fp.timestamp_sec, fp.phash_value,
	       length(replace((fp.phash_value # $1::bigint)::bit(64)::text, '0', '')) AS hamming_distance
	FROM frame_phashes fp
	WHERE fp.video_id != $2
	  AND length(replace((fp.phash_value # $1::bigint)::bit(64)::text, '0', '')) <= $3
	ORDER BY hamming_distance ASC
	LIMIT 50`

	rows, err := r.pool.Query(ctx, query, int64(phashValue), excludeVideoID, threshold)
	if err != nil {
		return nil, fmt.Errorf("phash match query fail: %w", err)
	}
	defer rows.Close()

	var matches []PhashMatch
	for rows.Next() {
		var m PhashMatch
		var dbPhash int64
		if err := rows.Scan(&m.VideoID, &m.FrameIndex, &m.TimestampSec, &dbPhash, &m.HammingDistance); err != nil {
			return nil, fmt.Errorf("scan phash match fail: %w", err)
		}
		m.PhashValue = int64(dbPhash)
		m.Similarity = 1.0 - float64(m.HammingDistance)/64.0
		matches = append(matches, m)
	}

	return matches, nil
}

func (r *VideoRepo) InsertScanResult(ctx context.Context, result *models.ScanResult) error {
	// ID must be set by caller (to match the jobID returned to client)
	result.CreatedAt = time.Now()

	query := `
		INSERT INTO scan_results (id, scanned_url, is_copyright_flag, phash_match_count, vector_match_count,
		                          max_phash_score, max_vector_score, matched_video_id, match_details, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := r.pool.Exec(ctx, query,
		result.ID, result.ScannedURL, result.IsCopyrightFlag,
		result.PhashMatchCount, result.VectorMatchCount,
		result.MaxPhashScore, result.MaxVectorScore,
		result.MatchedVideoID, result.MatchDetails, result.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert scan result fail: %w", err)
	}

	return nil
}

func (r *VideoRepo) GetScanResult(ctx context.Context, resultID uuid.UUID) (*models.ScanResult, error) {
	query := `SELECT id, scanned_url, is_copyright_flag, phash_match_count, vector_match_count,
	                 max_phash_score, max_vector_score, matched_video_id, match_details, created_at
	          FROM scan_results WHERE id = $1`

	var s models.ScanResult
	err := r.pool.QueryRow(ctx, query, resultID).Scan(
		&s.ID, &s.ScannedURL, &s.IsCopyrightFlag,
		&s.PhashMatchCount, &s.VectorMatchCount,
		&s.MaxPhashScore, &s.MaxVectorScore,
		&s.MatchedVideoID, &s.MatchDetails, &s.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get scan result fail: %w", err)
	}
	return &s, nil
}

type PhashMatch struct {
	VideoID         uuid.UUID
	FrameIndex      int
	TimestampSec    float64
	PhashValue      int64
	HammingDistance int
	Similarity      float64
}
