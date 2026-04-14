package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

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

	h := handler.NewHandler(eng, pub, videoRepo)
	h.RegisterRoutes(app)

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
