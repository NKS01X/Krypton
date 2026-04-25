package config

import (
	"time"

	"github.com/spf13/viper"
)

type AppConfig struct {
	Server     ServerConfig     `mapstructure:"server"`
	Database   DatabaseConfig   `mapstructure:"database"`
	RabbitMQ   RabbitMQConfig   `mapstructure:"rabbitmq"`
	Processing ProcessingConfig `mapstructure:"processing"`
	Similarity SimilarityConfig `mapstructure:"similarity"`
	Embedder   EmbedderConfig   `mapstructure:"embedder"`
}

type ServerConfig struct {
	Port         int           `mapstructure:"port"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
	MaxConns int32  `mapstructure:"max_conns"`
}

func (d *DatabaseConfig) DSN() string {
	return "postgres://" + d.User + ":" + d.Password + "@" +
		d.Host + ":" + itoa(d.Port) + "/" + d.DBName + "?sslmode=" + d.SSLMode
}

type RabbitMQConfig struct {
	URL           string `mapstructure:"url"`
	QueueName     string `mapstructure:"queue_name"`
	PrefetchCount int    `mapstructure:"prefetch_count"`
}

type ProcessingConfig struct {
	FrameRateFPS       float64 `mapstructure:"frame_rate_fps"`
	MaxConcurrentFrame int     `mapstructure:"max_concurrent_frames"`
	TempDir            string  `mapstructure:"temp_dir"`
}

type SimilarityConfig struct {
	PhashThreshold    int     `mapstructure:"phash_threshold"`
	VectorThreshold   float64 `mapstructure:"vector_threshold"`
	VectorSearchLimit int     `mapstructure:"vector_search_limit"`
}

type EmbedderConfig struct {
	APIKey       string `mapstructure:"api_key"`
	Model        string `mapstructure:"model"`
	EmbeddingDim int    `mapstructure:"embedding_dim"`
}

func Load(path string) (*AppConfig, error) {
	viper.SetConfigFile(path)
	viper.SetConfigType("yaml")

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, err
	}

	var cfg AppConfig
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	result := ""
	for n > 0 {
		result = string(rune('0'+n%10)) + result
		n /= 10
	}
	return result
}
