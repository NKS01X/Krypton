package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/engine"
	"github.com/nikhil/vid-piracy-backend/internal/models"
	"github.com/nikhil/vid-piracy-backend/internal/queue"
	"github.com/nikhil/vid-piracy-backend/internal/repository"
)

type Handler struct {
	engine    *engine.SimilarityEngine
	publisher *queue.Publisher
	videoRepo *repository.VideoRepo
}

func NewHandler(eng *engine.SimilarityEngine, pub *queue.Publisher, vr *repository.VideoRepo) *Handler {
	return &Handler{
		engine:    eng,
		publisher: pub,
		videoRepo: vr,
	}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Post("/scan", h.SubmitScan)
	api.Get("/scan/:id", h.GetScanResult)
	api.Post("/protected", h.RegisterProtected)
	api.Get("/health", h.HealthCheck)
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
