package extractor

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/rs/zerolog/log"
)

type KeyframeResult struct {
	Path         string
	FrameIndex   int
	TimestampSec float64
}

func ExtractKeyframes(ctx context.Context, videoPath string, fps float64, outputDir string) ([]KeyframeResult, error) {
	framesDir := filepath.Join(outputDir, "frames")
	if err := os.MkdirAll(framesDir, 0755); err != nil {
		return nil, fmt.Errorf("frames dir create fail: %w", err)
	}

	outputPattern := filepath.Join(framesDir, "frame_%06d.jpg")

	fpsFilter := fmt.Sprintf("fps=%s", strconv.FormatFloat(fps, 'f', 2, 64))
	args := []string{
		"-i", videoPath,
		"-vf", fpsFilter,
		"-q:v", "2",
		"-vsync", "vfr",
		outputPattern,
	}

	log.Info().
		Str("video", videoPath).
		Float64("fps", fps).
		Str("output_dir", framesDir).
		Msg("keyframe extraction shuru")

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg fail: %w", err)
	}

	entries, err := os.ReadDir(framesDir)
	if err != nil {
		return nil, fmt.Errorf("frames dir read fail: %w", err)
	}

	var results []KeyframeResult
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".jpg") {
			continue
		}

		name := strings.TrimSuffix(entry.Name(), ".jpg")
		name = strings.TrimPrefix(name, "frame_")
		frameNum, err := strconv.Atoi(name)
		if err != nil {
			log.Warn().Str("file", entry.Name()).Msg("frame number parse fail, skip")
			continue
		}

		frameIndex := frameNum - 1
		timestampSec := float64(frameIndex) / fps

		results = append(results, KeyframeResult{
			Path:         filepath.Join(framesDir, entry.Name()),
			FrameIndex:   frameIndex,
			TimestampSec: timestampSec,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].FrameIndex < results[j].FrameIndex
	})

	log.Info().Int("frame_count", len(results)).Msg("keyframe extraction complete")
	return results, nil
}
