package embedder

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"net/http"
	"os"
	"sync"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/config"
	"github.com/nikhil/vid-piracy-backend/internal/extractor"
	"github.com/nikhil/vid-piracy-backend/internal/models"
)

type Embedder interface {
	EmbedImage(ctx context.Context, img image.Image) ([]float32, error)
	Close() error
}

type HTTPEmbedder struct {
	endpoint     string
	embeddingDim int
	client       *http.Client
}

type httpEmbedRequest struct {
	ImagePath string `json:"image_path"`
}

type httpEmbedResponse struct {
	Embedding []float32 `json:"embedding"`
}

func NewHTTPEmbedder(cfg config.EmbedderConfig) *HTTPEmbedder {
	return &HTTPEmbedder{
		endpoint:     cfg.HTTPEndpoint,
		embeddingDim: cfg.EmbeddingDim,
		client:       &http.Client{},
	}
}

func (e *HTTPEmbedder) EmbedImage(ctx context.Context, imgPath string) ([]float32, error) {
	reqBody, err := json.Marshal(httpEmbedRequest{ImagePath: imgPath})
	if err != nil {
		return nil, fmt.Errorf("request marshal fail: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.endpoint, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("request create fail: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("embed request fail: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("embed service returned status %d", resp.StatusCode)
	}

	var embedResp httpEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&embedResp); err != nil {
		return nil, fmt.Errorf("response decode fail: %w", err)
	}

	if len(embedResp.Embedding) != e.embeddingDim {
		return nil, fmt.Errorf("embedding dim mismatch: expected %d, got %d", e.embeddingDim, len(embedResp.Embedding))
	}

	return embedResp.Embedding, nil
}

func (e *HTTPEmbedder) Close() error {
	return nil
}

func GenerateEmbeddings(ctx context.Context, frames []extractor.KeyframeResult, videoID uuid.UUID, cfg config.EmbedderConfig, maxConcurrent int) ([]models.FrameEmbedding, error) {
	if len(frames) == 0 {
		return nil, fmt.Errorf("koi frame nahi mila embedding ke liye")
	}

	embedder := NewHTTPEmbedder(cfg)
	defer embedder.Close()

	sem := make(chan struct{}, maxConcurrent)
	var mu sync.Mutex
	var embeddings []models.FrameEmbedding
	var errList []error

	var wg sync.WaitGroup

	for _, frame := range frames {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		wg.Add(1)
		go func(f extractor.KeyframeResult) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			vec, err := embedder.EmbedImage(ctx, f.Path)
			if err != nil {
				mu.Lock()
				errList = append(errList, fmt.Errorf("frame[%d] embed fail: %w", f.FrameIndex, err))
				mu.Unlock()
				log.Error().Int("frame", f.FrameIndex).Err(err).Msg("embedding fail")
				return
			}

			embedding := models.FrameEmbedding{
				VideoID:      videoID,
				FrameIndex:   f.FrameIndex,
				TimestampSec: f.TimestampSec,
				Embedding:    pgvector.NewVector(vec),
			}

			mu.Lock()
			embeddings = append(embeddings, embedding)
			mu.Unlock()
		}(frame)
	}

	wg.Wait()

	if len(embeddings) == 0 && len(errList) > 0 {
		return nil, fmt.Errorf("saare embeddings fail: %v", errList[0])
	}

	log.Info().
		Int("total", len(frames)).
		Int("success", len(embeddings)).
		Int("errors", len(errList)).
		Msg("embedding generation complete")

	return embeddings, nil
}

func GeneratePlaceholderEmbeddings(frames []extractor.KeyframeResult, videoID uuid.UUID, dim int) []models.FrameEmbedding {
	var embeddings []models.FrameEmbedding
	for _, f := range frames {
		vec := make([]float32, dim)
		file, err := os.Open(f.Path)
		if err == nil {
			img, _, err := image.Decode(file)
			if err == nil {
				bounds := img.Bounds()
				var r, g, b float32
				count := float32(0)
				for y := bounds.Min.Y; y < bounds.Max.Y; y += 10 {
					for x := bounds.Min.X; x < bounds.Max.X; x += 10 {
						cr, cg, cb, _ := img.At(x, y).RGBA()
						r += float32(cr) / 65535.0
						g += float32(cg) / 65535.0
						b += float32(cb) / 65535.0
						count++
					}
				}
				if count > 0 {
					vec[0] = r / count
					vec[1] = g / count
					vec[2] = b / count
				}
			}
			file.Close()
		}

		embeddings = append(embeddings, models.FrameEmbedding{
			VideoID:      videoID,
			FrameIndex:   f.FrameIndex,
			TimestampSec: f.TimestampSec,
			Embedding:    pgvector.NewVector(vec),
		})
	}
	return embeddings
}
