package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
)

type ProtectedVideo struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Title        string    `json:"title" db:"title"`
	Description  string    `json:"description,omitempty" db:"description"`
	ChannelID    string    `json:"channel_id,omitempty" db:"channel_id"`
	SourceURL    string    `json:"source_url" db:"source_url"`
	DurationSec  int       `json:"duration_sec,omitempty" db:"duration_sec"`
	FrameRateFPS float64   `json:"frame_rate_fps" db:"frame_rate_fps"`
	Status       string    `json:"status" db:"status"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type FramePhash struct {
	ID           uuid.UUID `json:"id" db:"id"`
	VideoID      uuid.UUID `json:"video_id" db:"video_id"`
	FrameIndex   int       `json:"frame_index" db:"frame_index"`
	TimestampSec float64   `json:"timestamp_sec" db:"timestamp_sec"`
	PhashValue   uint64    `json:"phash_value" db:"phash_value"`
	DhashValue   *uint64   `json:"dhash_value,omitempty" db:"dhash_value"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type FrameEmbedding struct {
	ID           uuid.UUID       `json:"id" db:"id"`
	VideoID      uuid.UUID       `json:"video_id" db:"video_id"`
	FrameIndex   int             `json:"frame_index" db:"frame_index"`
	TimestampSec float64         `json:"timestamp_sec" db:"timestamp_sec"`
	Embedding    pgvector.Vector `json:"-" db:"embedding"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
}

type ScanResult struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	ScannedURL       string          `json:"scanned_url" db:"scanned_url"`
	IsCopyrightFlag  bool            `json:"is_copyright_flag" db:"is_copyright_flag"`
	PhashMatchCount  int             `json:"phash_match_count" db:"phash_match_count"`
	VectorMatchCount int             `json:"vector_match_count" db:"vector_match_count"`
	MaxPhashScore    float64         `json:"max_phash_score" db:"max_phash_score"`
	MaxVectorScore   float64         `json:"max_vector_score" db:"max_vector_score"`
	MatchedVideoID   *uuid.UUID      `json:"matched_video_id,omitempty" db:"matched_video_id"`
	MatchDetails     json.RawMessage `json:"match_details,omitempty" db:"match_details"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
}

type ScanRequest struct {
	URL string `json:"url" validate:"required,url"`
}

type ScanResponse struct {
	JobID          uuid.UUID     `json:"job_id"`
	Status         string        `json:"status"`
	CopyrightFlag  bool          `json:"copyright_flag"`
	Confidence     float64       `json:"confidence"`
	PhashScore     float64       `json:"phash_score"`
	VectorScore    float64       `json:"vector_score"`
	MatchedVideoID *uuid.UUID    `json:"matched_video_id,omitempty"`
	MatchDetails   []MatchDetail `json:"match_details,omitempty"`
}

type MatchDetail struct {
	FrameIndex      int     `json:"frame_index"`
	TimestampSec    float64 `json:"timestamp_sec"`
	MatchType       string  `json:"match_type"`
	Similarity      float64 `json:"similarity"`
	MatchedVideoID  string  `json:"matched_video_id"`
	MatchedFrameIdx int     `json:"matched_frame_index"`
}

type ProtectedVideoRequest struct {
	URL         string `json:"url" validate:"required,url"`
	Title       string `json:"title" validate:"required"`
	Description string `json:"description,omitempty"`
	ChannelID   string `json:"channel_id,omitempty"`
}

type QueueMessage struct {
	JobID   uuid.UUID `json:"job_id"`
	URL     string    `json:"url"`
	VideoID uuid.UUID `json:"video_id,omitempty"`
	Action  string    `json:"action"`
}
