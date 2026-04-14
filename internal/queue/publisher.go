package queue

import (
	"context"
	"encoding/json"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"

	"github.com/nikhil/vid-piracy-backend/internal/config"
	"github.com/nikhil/vid-piracy-backend/internal/models"
)

type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	queue   amqp.Queue
	cfg     config.RabbitMQConfig
}

func NewPublisher(cfg config.RabbitMQConfig) (*Publisher, error) {
	conn, err := amqp.Dial(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("rabbitmq connect fail: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("rabbitmq channel fail: %w", err)
	}

	q, err := ch.QueueDeclare(
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

	log.Info().Str("queue", cfg.QueueName).Msg("publisher ready")

	return &Publisher{
		conn:    conn,
		channel: ch,
		queue:   q,
		cfg:     cfg,
	}, nil
}

func (p *Publisher) PublishScanJob(ctx context.Context, msg models.QueueMessage) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("message marshal fail: %w", err)
	}

	err = p.channel.PublishWithContext(ctx,
		"",
		p.queue.Name,
		false,
		false,
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "application/json",
			Body:         body,
		},
	)
	if err != nil {
		return fmt.Errorf("publish fail: %w", err)
	}

	log.Info().
		Str("job_id", msg.JobID.String()).
		Str("action", msg.Action).
		Msg("job published to queue")

	return nil
}

func (p *Publisher) Close() error {
	if err := p.channel.Close(); err != nil {
		return err
	}
	return p.conn.Close()
}
