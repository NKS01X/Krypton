package handler

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/auth"
	"github.com/nikhil/vid-piracy-backend/internal/engine"
	"github.com/nikhil/vid-piracy-backend/internal/models"
	"github.com/nikhil/vid-piracy-backend/internal/queue"
	"github.com/nikhil/vid-piracy-backend/internal/repository"
)

type Handler struct {
	engine    *engine.SimilarityEngine
	publisher *queue.Publisher
	videoRepo *repository.VideoRepo
	authSvc   *auth.Service
}

func NewHandler(eng *engine.SimilarityEngine, pub *queue.Publisher, vr *repository.VideoRepo, authSvc *auth.Service) *Handler {
	return &Handler{
		engine:    eng,
		publisher: pub,
		videoRepo: vr,
		authSvc:   authSvc,
	}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	// Public
	api.Get("/health", h.HealthCheck)

	// Protected — require valid JWT
	protected := api.Group("/", auth.Middleware(h.authSvc))
	protected.Post("/scan", h.SubmitScan)
	protected.Get("/scan/:id", h.GetScanResult)
	protected.Post("/scan/upload", h.SubmitScanUpload)
	protected.Post("/protected", h.RegisterProtected)
	protected.Post("/protected/upload", h.RegisterProtectedUpload)
}

func (h *Handler) RegisterProtectedUpload(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "video file required",
		})
	}

	// validate video type
	if !strings.HasPrefix(file.Header.Get("Content-Type"), "video/") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "only video files allowed",
		})
	}

	jobID := uuid.New()
	jobDir := filepath.Join("/tmp/vidpiracy", jobID.String())

	if err := os.MkdirAll(jobDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "dir create fail",
		})
	}

	videoPath := filepath.Join(jobDir, "source_video.mp4")

	if err := c.SaveFile(file, videoPath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "file save fail",
		})
	}

	// push to queue
	msg := models.QueueMessage{
		JobID:  jobID,
		URL:    videoPath,
		Action: "register_upload",
	}

	if err := h.publisher.PublishScanJob(c.Context(), msg); err != nil {
		log.Error().Err(err).Msg("register upload job publish fail")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "registration queue mein daalne mein dikkat",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"job_id": jobID.String(),
		"path":   videoPath,
		"status": "queued",
	})
}

// this function handles direct video uploads 
func (h *Handler) SubmitScanUpload(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "video file required",
		})
	}
	
	// Checks video type : Saves from unwanted .zip  .exes files
	if !strings.HasPrefix(file.Header.Get("Content-Type"), "video/") {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"error": "only video files allowed",
		})
	}

	jobID := uuid.New()
	jobDir := filepath.Join("/tmp/vidpiracy", jobID.String())

	if err := os.MkdirAll(jobDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "dir create fail",
		})
	}

	// SAME naming as downloader
	videoPath := filepath.Join(jobDir, "source_video.mp4")

	if err := c.SaveFile(file, videoPath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "file save fail",
		})
	}

	// push to queue
	msg := models.QueueMessage{
		JobID:  jobID,
		URL:    videoPath,     // now it's local path
		Action: "scan_upload", //  important
	}

	if err := h.publisher.PublishScanJob(c.Context(), msg); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "queue fail",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"job_id": jobID.String(),
		"path":   videoPath, // returning saved location
		"status": "queued",
	})
}

func (h *Handler) SubmitScan(c *fiber.Ctx) error {
	var req models.ScanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.URL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "url field required hai",
		})
	}

	jobID := uuid.New()

	msg := models.QueueMessage{
		JobID:  jobID,
		URL:    req.URL,
		Action: "scan",
	}

	if err := h.publisher.PublishScanJob(c.Context(), msg); err != nil {
		log.Error().Err(err).Msg("scan job publish fail")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "job queue mein daalne mein dikkat",
		})
	}

	log.Info().Str("job_id", jobID.String()).Str("url", req.URL).Msg("scan job queued")

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"job_id":  jobID.String(),
		"status":  "queued",
		"message": "scan job queue mein daal diya, GET /api/v1/scan/:id se result check karo",
	})
}

func (h *Handler) GetScanResult(c *fiber.Ctx) error {
	idStr := c.Params("id")
	resultID, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid scan ID format",
		})
	}

	result, err := h.videoRepo.GetScanResult(c.Context(), resultID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":  "scan result nahi mila",
			"detail": err.Error(),
		})
	}

	response := models.ScanResponse{
		JobID:         result.ID,
		Status:        "done",
		CopyrightFlag: result.IsCopyrightFlag,
		PhashScore:    result.MaxPhashScore,
		VectorScore:   result.MaxVectorScore,
	}

	if result.MaxPhashScore > result.MaxVectorScore {
		response.Confidence = result.MaxPhashScore
	} else {
		response.Confidence = result.MaxVectorScore
	}

	response.MatchedVideoID = result.MatchedVideoID

	return c.Status(fiber.StatusOK).JSON(response)
}

func (h *Handler) RegisterProtected(c *fiber.Ctx) error {
	var req models.ProtectedVideoRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.URL == "" || req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "url aur title required hai",
		})
	}

	jobID := uuid.New()
	msg := models.QueueMessage{
		JobID:  jobID,
		URL:    req.URL,
		Action: "register",
	}

	if err := h.publisher.PublishScanJob(c.Context(), msg); err != nil {
		log.Error().Err(err).Msg("register job publish fail")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "registration queue mein daalne mein dikkat",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"job_id":  jobID.String(),
		"status":  "queued",
		"message": "protected content registration queued",
	})
}

func (h *Handler) HealthCheck(c *fiber.Ctx) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "ok",
		"service": "vid-piracy-backend",
	})
}
