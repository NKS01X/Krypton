package extractor

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/rs/zerolog/log"
)

func DownloadVideo(ctx context.Context, url string, outputDir string) (string, error) {
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("output dir create fail: %w", err)
	}

	outputTemplate := filepath.Join(outputDir, "source_video.%(ext)s")

	args := []string{
		"--no-playlist",
		"-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
		"--merge-output-format", "mp4",
		"-o", outputTemplate,
		"--no-warnings",
		"--quiet",
		url,
	}

	log.Info().Str("url", url).Str("output_dir", outputDir).Msg("video download shuru")

	cmd := exec.CommandContext(ctx, "yt-dlp", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("yt-dlp fail: %w", err)
	}

	videoPath := filepath.Join(outputDir, "source_video.mp4")
	if _, err := os.Stat(videoPath); os.IsNotExist(err) {
		videoPath = filepath.Join(outputDir, "source_video.webm")
		if _, err := os.Stat(videoPath); os.IsNotExist(err) {
			return "", fmt.Errorf("downloaded video file nahi mili outputDir=%s", outputDir)
		}
	}

	log.Info().Str("path", videoPath).Msg("video download complete")
	return videoPath, nil
}

func CleanupDir(dir string) error {
	return os.RemoveAll(dir)
}
