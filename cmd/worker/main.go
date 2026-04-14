package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/config"
	"github.com/nikhil/vid-piracy-backend/internal/engine"
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

	consumer, err := queue.NewConsumer(cfg.RabbitMQ, eng)
	if err != nil {
		log.Fatal().Err(err).Msg("rabbitmq consumer init fail")
	}
	defer consumer.Close()

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		log.Info().Msg("shutdown signal, worker band ho raha hai")
		cancel()
	}()

	log.Info().Msg("worker started, queue se jobs consume ho rahe hain")
	if err := consumer.Start(ctx); err != nil {
		log.Fatal().Err(err).Msg("consumer fail")
	}

	log.Info().Msg("worker shutdown complete")
}
