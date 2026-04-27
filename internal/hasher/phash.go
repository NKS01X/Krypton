package hasher

import (
	"context"
	"fmt"
	"image"
	_ "image/jpeg" // JPEG decoder register karo
	_ "image/png"  // PNG decoder register karo
	"os"
	"sync"

	"github.com/corona10/goimagehash"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/extractor"
	"github.com/nikhil/vid-piracy-backend/internal/models"

	"github.com/google/uuid"
)

type PhashResult struct {
	FrameIndex   int
	TimestampSec float64
	PhashValue   uint64
	DhashValue   uint64
	Err          error
}

func GeneratePhashes(ctx context.Context, frames []extractor.KeyframeResult, videoID uuid.UUID, maxConcurrent int) ([]models.FramePhash, error) {
	if len(frames) == 0 {
		return nil, fmt.Errorf("koi frame nahi mila hash karne ke liye")
	}

	sem := make(chan struct{}, maxConcurrent)
	resultCh := make(chan PhashResult, len(frames))

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

			result := PhashResult{
				FrameIndex:   f.FrameIndex,
				TimestampSec: f.TimestampSec,
			}

			file, err := os.Open(f.Path)
			if err != nil {
				result.Err = fmt.Errorf("frame open fail [%d]: %w", f.FrameIndex, err)
				resultCh <- result
				return
			}
			defer file.Close()

			img, _, err := image.Decode(file)
			if err != nil {
				result.Err = fmt.Errorf("frame decode fail [%d]: %w", f.FrameIndex, err)
				resultCh <- result
				return
			}

			phash, err := goimagehash.PerceptionHash(img)
			if err != nil {
				result.Err = fmt.Errorf("phash compute fail [%d]: %w", f.FrameIndex, err)
				resultCh <- result
				return
			}
			result.PhashValue = phash.GetHash()

			dhash, err := goimagehash.DifferenceHash(img)
			if err != nil {
				log.Warn().Int("frame", f.FrameIndex).Err(err).Msg("dhash fail, skip dhash")
			} else {
				result.DhashValue = dhash.GetHash()
			}

			resultCh <- result
		}(frame)
	}

	go func() {
		wg.Wait()
		close(resultCh)
	}()

	var phashes []models.FramePhash
	var errors []error

	for result := range resultCh {
		if result.Err != nil {
			errors = append(errors, result.Err)
			log.Error().Err(result.Err).Msg("phash generation error")
			continue
		}

		var dhashPtr *int64
		if result.DhashValue != 0 {
			v := int64(result.DhashValue)
			dhashPtr = &v
		}
		phashes = append(phashes, models.FramePhash{
			VideoID:      videoID,
			FrameIndex:   result.FrameIndex,
			TimestampSec: result.TimestampSec,
			PhashValue:   int64(result.PhashValue),
			DhashValue:   dhashPtr,
		})
	}

	if len(phashes) == 0 && len(errors) > 0 {
		return nil, fmt.Errorf("saare frames ka phash fail: %v", errors[0])
	}

	log.Info().
		Int("total_frames", len(frames)).
		Int("success", len(phashes)).
		Int("errors", len(errors)).
		Msg("phash generation complete")

	return phashes, nil
}

func HammingDistance(hash1, hash2 uint64) int {
	xor := hash1 ^ hash2
	distance := 0
	for xor != 0 {
		distance++
		xor &= xor - 1
	}
	return distance
}
