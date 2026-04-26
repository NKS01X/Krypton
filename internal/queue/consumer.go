package queue

import (
	"context"
	"encoding/json"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/config"
	"github.com/nikhil/vid-piracy-backend/internal/engine"
	"github.com/nikhil/vid-piracy-backend/internal/models"
)

type Consumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	cfg     config.RabbitMQConfig
	engine  *engine.SimilarityEngine
}

func NewConsumer(cfg config.RabbitMQConfig, eng *engine.SimilarityEngine) (*Consumer, error) {
	conn, err := amqp.Dial(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("rabbitmq connect fail: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("rabbitmq channel fail: %w", err)
	}

	_, err = ch.QueueDeclare(
		cfg.QueueName,
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("queue declare fail: %w", err)
	}

	if err := ch.Qos(cfg.PrefetchCount, 0, false); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("qos set fail: %w", err)
	}

	return &Consumer{
		conn:    conn,
		channel: ch,
		cfg:     cfg,
		engine:  eng,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) error {
	msgs, err := c.channel.Consume(
		c.cfg.QueueName,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("consume start fail: %w", err)
	}

	log.Info().Str("queue", c.cfg.QueueName).Msg("consumer started, messages ka wait")

	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("consumer shutting down")
			return nil

		case msg, ok := <-msgs:
			if !ok {
				return fmt.Errorf("message channel closed")
			}

			c.handleMessage(ctx, msg)
		}
	}
}

func (c *Consumer) handleMessage(ctx context.Context, msg amqp.Delivery) {
	var queueMsg models.QueueMessage
	if err := json.Unmarshal(msg.Body, &queueMsg); err != nil {
		log.Error().Err(err).Msg("message unmarshal fail, nack with no requeue")
		msg.Nack(false, false)
		return
	}

	log.Info().
		Str("job_id", queueMsg.JobID.String()).
		Str("action", queueMsg.Action).
		Msg("processing queue message")

	switch queueMsg.Action {
	case "scan":
		result, err := c.engine.ProcessAndScan(ctx, queueMsg.URL, queueMsg.JobID)
		if err != nil {
			log.Error().Err(err).Str("job_id", queueMsg.JobID.String()).Msg("scan fail")
			if msg.Redelivered {
				msg.Nack(false, false)
			} else {
				msg.Nack(false, true)
			}
			return
		}

		log.Info().
			Str("job_id", queueMsg.JobID.String()).
			Bool("copyright", result.IsCopyrightFlag).
			Msg("scan complete")

	// This part handles the new scan upload part
	case "scan_upload":
		result, err := c.engine.ProcessUploadedVideo(ctx, queueMsg.URL, queueMsg.JobID)
		if err != nil {
			log.Error().Err(err).Str("job_id", queueMsg.JobID.String()).Msg("upload scan fail")
			if msg.Redelivered {
				msg.Nack(false, false)
			} else {
				msg.Nack(false, true)
			}
			return
		}

		log.Info().
			Str("job_id", queueMsg.JobID.String()).
			Bool("copyright", result.IsCopyrightFlag).
			Msg("upload scan complete")

	case "register":
		video := &models.ProtectedVideo{
			SourceURL: queueMsg.URL,
			Title:     "Auto-registered",
			Status:    "pending",
		}
		if err := c.engine.RegisterProtectedContent(ctx, video); err != nil {
			log.Error().Err(err).Msg("registration fail")
			msg.Nack(false, !msg.Redelivered)
			return
		}

	default:
		log.Warn().Str("action", queueMsg.Action).Msg("unknown action, skip")
	}

	msg.Ack(false)
}

func (c *Consumer) Close() error {
	if err := c.channel.Close(); err != nil {
		return err
	}
	return c.conn.Close()
}
