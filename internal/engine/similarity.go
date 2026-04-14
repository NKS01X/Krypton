package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"golang.org/x/sync/errgroup"

	"github.com/nikhil/vid-piracy-backend/internal/config"
	"github.com/nikhil/vid-piracy-backend/internal/embedder"
	"github.com/nikhil/vid-piracy-backend/internal/extractor"
	"github.com/nikhil/vid-piracy-backend/internal/hasher"
	"github.com/nikhil/vid-piracy-backend/internal/models"
	"github.com/nikhil/vid-piracy-backend/internal/repository"
)

type SimilarityEngine struct {
	cfg        *config.AppConfig
	videoRepo  *repository.VideoRepo
	vectorRepo *repository.VectorRepo
}

func NewSimilarityEngine(cfg *config.AppConfig, videoRepo *repository.VideoRepo, vectorRepo *repository.VectorRepo) *SimilarityEngine {
	return &SimilarityEngine{
		cfg:        cfg,
		videoRepo:  videoRepo,
		vectorRepo: vectorRepo,
	}
}

func (e *SimilarityEngine) ProcessAndScan(ctx context.Context, scanURL string, jobID uuid.UUID) (*models.ScanResult, error) {
	log.Info().Str("url", scanURL).Str("job_id", jobID.String()).Msg("scan pipeline shuru")

	tempDir := filepath.Join(e.cfg.Processing.TempDir, jobID.String())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("temp dir create fail: %w", err)
	}
	defer extractor.CleanupDir(tempDir)

	log.Info().Msg("step 1: downloading video")
	videoPath, err := extractor.DownloadVideo(ctx, scanURL, tempDir)
	if err != nil {
		return nil, fmt.Errorf("video download fail: %w", err)
	}

	log.Info().Msg("step 2: extracting keyframes")
	frames, err := extractor.ExtractKeyframes(ctx, videoPath, e.cfg.Processing.FrameRateFPS, tempDir)
	if err != nil {
		return nil, fmt.Errorf("keyframe extraction fail: %w", err)
	}

	if len(frames) == 0 {
		return nil, fmt.Errorf("koi keyframe nahi mila video mein")
	}

	tempVideoID := uuid.New()

	log.Info().Int("frame_count", len(frames)).Msg("step 3: dual pipeline (phash + embedding concurrent)")

	var phashes []models.FramePhash
	var embeddings []models.FrameEmbedding

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var pErr error
		phashes, pErr = hasher.GeneratePhashes(gCtx, frames, tempVideoID, e.cfg.Processing.MaxConcurrentFrame)
		if pErr != nil {
			return fmt.Errorf("phash pipeline fail: %w", pErr)
		}
		log.Info().Int("phash_count", len(phashes)).Msg("phash pipeline complete")
		return nil
	})

	g.Go(func() error {
		if e.cfg.Embedder.Mode == "http" {
			var eErr error
			embeddings, eErr = embedder.GenerateEmbeddings(gCtx, frames, tempVideoID, e.cfg.Embedder, e.cfg.Processing.MaxConcurrentFrame)
			if eErr != nil {
				log.Warn().Err(eErr).Msg("embedding pipeline fail, placeholder use karenge")
				embeddings = embedder.GeneratePlaceholderEmbeddings(frames, tempVideoID, e.cfg.Embedder.EmbeddingDim)
			}
		} else {
			embeddings = embedder.GeneratePlaceholderEmbeddings(frames, tempVideoID, e.cfg.Embedder.EmbeddingDim)
		}
		log.Info().Int("embedding_count", len(embeddings)).Msg("embedding pipeline complete")
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("dual pipeline fail: %w", err)
	}

	log.Info().Msg("step 4: similarity comparison shuru")

	var allPhashMatches []repository.PhashMatch
	for _, ph := range phashes {
		matches, err := e.videoRepo.GetPhashMatches(ctx, ph.PhashValue, tempVideoID, e.cfg.Similarity.PhashThreshold)
		if err != nil {
			log.Error().Err(err).Int("frame", ph.FrameIndex).Msg("phash query fail")
			continue
		}
		allPhashMatches = append(allPhashMatches, matches...)
	}

	vectorMatches, err := e.vectorRepo.FindSimilarBatch(ctx, embeddings, tempVideoID, e.cfg.Similarity.VectorThreshold, e.cfg.Similarity.VectorSearchLimit)
	if err != nil {
		log.Error().Err(err).Msg("vector search fail")
	}

	result := e.aggregateResults(scanURL, allPhashMatches, vectorMatches)

	if err := e.videoRepo.InsertScanResult(ctx, result); err != nil {
		log.Error().Err(err).Msg("scan result save fail")
	}

	log.Info().
		Bool("copyright_flag", result.IsCopyrightFlag).
		Float64("max_phash_score", result.MaxPhashScore).
		Float64("max_vector_score", result.MaxVectorScore).
		Msg("scan pipeline complete")

	return result, nil
}

func (e *SimilarityEngine) RegisterProtectedContent(ctx context.Context, video *models.ProtectedVideo) error {
	log.Info().Str("url", video.SourceURL).Msg("protected content registration shuru")

	if err := e.videoRepo.InsertVideo(ctx, video); err != nil {
		return fmt.Errorf("video insert fail: %w", err)
	}

	if err := e.videoRepo.UpdateVideoStatus(ctx, video.ID, "processing"); err != nil {
		return err
	}

	tempDir := filepath.Join(e.cfg.Processing.TempDir, video.ID.String())
	defer extractor.CleanupDir(tempDir)

	videoPath, err := extractor.DownloadVideo(ctx, video.SourceURL, tempDir)
	if err != nil {
		e.videoRepo.UpdateVideoStatus(ctx, video.ID, "failed")
		return fmt.Errorf("download fail: %w", err)
	}

	frames, err := extractor.ExtractKeyframes(ctx, videoPath, e.cfg.Processing.FrameRateFPS, tempDir)
	if err != nil {
		e.videoRepo.UpdateVideoStatus(ctx, video.ID, "failed")
		return fmt.Errorf("keyframe extraction fail: %w", err)
	}

	var phashes []models.FramePhash
	var embeddings []models.FrameEmbedding

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var pErr error
		phashes, pErr = hasher.GeneratePhashes(gCtx, frames, video.ID, e.cfg.Processing.MaxConcurrentFrame)
		return pErr
	})

	g.Go(func() error {
		embeddings = embedder.GeneratePlaceholderEmbeddings(frames, video.ID, e.cfg.Embedder.EmbeddingDim)
		return nil
	})

	if err := g.Wait(); err != nil {
		e.videoRepo.UpdateVideoStatus(ctx, video.ID, "failed")
		return fmt.Errorf("processing fail: %w", err)
	}

	if err := e.videoRepo.InsertPhashes(ctx, phashes); err != nil {
		e.videoRepo.UpdateVideoStatus(ctx, video.ID, "failed")
		return fmt.Errorf("phash store fail: %w", err)
	}

	if err := e.vectorRepo.InsertEmbeddings(ctx, embeddings); err != nil {
		e.videoRepo.UpdateVideoStatus(ctx, video.ID, "failed")
		return fmt.Errorf("embedding store fail: %w", err)
	}

	if err := e.videoRepo.UpdateVideoStatus(ctx, video.ID, "done"); err != nil {
		return err
	}

	log.Info().
		Str("video_id", video.ID.String()).
		Int("phash_count", len(phashes)).
		Int("embedding_count", len(embeddings)).
		Msg("protected content registered")

	return nil
}

func (e *SimilarityEngine) aggregateResults(scannedURL string, phashMatches []repository.PhashMatch, vectorMatches map[int][]repository.VectorMatch) *models.ScanResult {
	result := &models.ScanResult{
		ScannedURL: scannedURL,
	}

	var matchDetails []models.MatchDetail
	videoMatchCount := make(map[uuid.UUID]int)

	maxPhashSim := 0.0
	for _, pm := range phashMatches {
		if pm.Similarity > maxPhashSim {
			maxPhashSim = pm.Similarity
		}
		videoMatchCount[pm.VideoID]++
		matchDetails = append(matchDetails, models.MatchDetail{
			FrameIndex:      pm.FrameIndex,
			TimestampSec:    pm.TimestampSec,
			MatchType:       "phash",
			Similarity:      pm.Similarity,
			MatchedVideoID:  pm.VideoID.String(),
			MatchedFrameIdx: pm.FrameIndex,
		})
	}
	result.PhashMatchCount = len(phashMatches)
	result.MaxPhashScore = maxPhashSim

	maxVectorSim := 0.0
	totalVectorMatches := 0
	for frameIdx, vms := range vectorMatches {
		for _, vm := range vms {
			if vm.Similarity > maxVectorSim {
				maxVectorSim = vm.Similarity
			}
			videoMatchCount[vm.VideoID]++
			totalVectorMatches++
			matchDetails = append(matchDetails, models.MatchDetail{
				FrameIndex:      frameIdx,
				TimestampSec:    vm.TimestampSec,
				MatchType:       "vector",
				Similarity:      vm.Similarity,
				MatchedVideoID:  vm.VideoID.String(),
				MatchedFrameIdx: vm.FrameIndex,
			})
		}
	}
	result.VectorMatchCount = totalVectorMatches
	result.MaxVectorScore = maxVectorSim

	if maxPhashSim >= 0.9 || maxVectorSim >= e.cfg.Similarity.VectorThreshold {
		result.IsCopyrightFlag = true
	}

	var bestMatchID uuid.UUID
	bestCount := 0
	for vid, count := range videoMatchCount {
		if count > bestCount {
			bestCount = count
			bestMatchID = vid
		}
	}
	if bestCount > 0 {
		result.MatchedVideoID = &bestMatchID
	}

	detailsJSON, _ := json.Marshal(matchDetails)
	result.MatchDetails = detailsJSON

	return result
}
