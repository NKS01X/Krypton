package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/auth"
	"github.com/nikhil/vid-piracy-backend/internal/config"
	"github.com/nikhil/vid-piracy-backend/internal/engine"
	"github.com/nikhil/vid-piracy-backend/internal/handler"
	"github.com/nikhil/vid-piracy-backend/internal/queue"
	"github.com/nikhil/vid-piracy-backend/internal/repository"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatal().Err(err).Msg("config load fail")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	poolCfg, err := pgxpool.ParseConfig(cfg.Database.DSN())
	if err != nil {
		log.Fatal().Err(err).Msg("db config parse fail")
	}
	poolCfg.MaxConns = cfg.Database.MaxConns

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		log.Fatal().Err(err).Msg("db connect fail")
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("db ping fail")
	}
	log.Info().Msg("database connected")

	videoRepo := repository.NewVideoRepo(pool)
	vectorRepo := repository.NewVectorRepo(pool)
	userRepo := repository.NewUserRepo(pool)

	// Auth service — reads JWT_SECRET from env (fallback to a dev default)
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "change-me-in-production-use-32-plus-bytes"
		log.Warn().Msg("JWT_SECRET not set — using insecure default (do NOT use in production)")
	}
	authSvc := auth.NewService(jwtSecret, 15*time.Minute, 7*24*time.Hour)

	eng := engine.NewSimilarityEngine(cfg, videoRepo, vectorRepo)

	pub, err := queue.NewPublisher(cfg.RabbitMQ)
	if err != nil {
		log.Fatal().Err(err).Msg("rabbitmq publisher init fail")
	}
	defer pub.Close()

	app := fiber.New(fiber.Config{
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		AppName:      "vid-piracy-backend",
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New())

	h := handler.NewHandler(eng, pub, videoRepo, authSvc)
	h.RegisterRoutes(app)

	authH := handler.NewAuthHandler(authSvc, userRepo)
	authH.RegisterAuthRoutes(app)

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		log.Info().Msg("shutdown signal received, graceful shutdown shuru")
		cancel()
		app.Shutdown()
	}()

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Info().Str("addr", addr).Msg("API server starting")
	if err := app.Listen(addr); err != nil {
		log.Fatal().Err(err).Msg("server start fail")
	}
}
