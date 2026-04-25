package embedder

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
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

const jinaEndpoint = "https://api.jina.ai/v1/embeddings"

type JinaEmbedder struct {
	apiKey       string
	model        string
	embeddingDim int
	client       *http.Client
}

// Jina API request/response types
type jinaImageInput struct {
	Image string `json:"image"` // base64 data URI
}

type jinaRequest struct {
	Model string           `json:"model"`
	Input []jinaImageInput `json:"input"`
}

type jinaEmbeddingData struct {
	Embedding []float32 `json:"embedding"`
}

type jinaResponse struct {
	Data []jinaEmbeddingData `json:"data"`
}

func NewJinaEmbedder(cfg config.EmbedderConfig) *JinaEmbedder {
	return &JinaEmbedder{
		apiKey:       cfg.APIKey,
		model:        cfg.Model,
		embeddingDim: cfg.EmbeddingDim,
		client:       &http.Client{},
	}
}

func (e *JinaEmbedder) EmbedImage(ctx context.Context, imgPath string) ([]float32, error) {
	imgData, err := os.ReadFile(imgPath)
	if err != nil {
		return nil, fmt.Errorf("image read fail: %w", err)
	}

	b64 := base64.StdEncoding.EncodeToString(imgData)
	dataURI := "data:image/png;base64," + b64

	reqBody, err := json.Marshal(jinaRequest{
		Model: e.model,
		Input: []jinaImageInput{{Image: dataURI}},
	})
	if err != nil {
		return nil, fmt.Errorf("request marshal fail: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, jinaEndpoint, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("request create fail: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+e.apiKey)

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("jina request fail: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("jina returned status %d", resp.StatusCode)
	}

	var jinaResp jinaResponse
	if err := json.NewDecoder(resp.Body).Decode(&jinaResp); err != nil {
		return nil, fmt.Errorf("response decode fail: %w", err)
	}

	if len(jinaResp.Data) == 0 {
		return nil, fmt.Errorf("jina returned no embeddings")
	}

	vec := jinaResp.Data[0].Embedding
	if len(vec) != e.embeddingDim {
		return nil, fmt.Errorf("embedding dim mismatch: expected %d, got %d", e.embeddingDim, len(vec))
	}

	return vec, nil
}

func (e *JinaEmbedder) Close() error {
	return nil
}

func GenerateEmbeddings(ctx context.Context, frames []extractor.KeyframeResult, videoID uuid.UUID, cfg config.EmbedderConfig, maxConcurrent int) ([]models.FrameEmbedding, error) {
	if len(frames) == 0 {
		return nil, fmt.Errorf("koi frame nahi mila embedding ke liye")
	}

	e := NewJinaEmbedder(cfg)
	defer e.Close()

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

			vec, err := e.EmbedImage(ctx, f.Path)
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
			progress := len(embeddings)
			total := len(frames)
			mu.Unlock()

			log.Info().
				Int("frame", f.FrameIndex).
				Int("progress", progress).
				Int("total", total).
				Msg("frame embedded successfully")
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
