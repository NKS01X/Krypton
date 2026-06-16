package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/google/uuid"
)

// UserRecord maps a row from the users table.
type UserRecord struct {
	ID           uuid.UUID
	Username     string
	Email        string
	PasswordHash string
	CreatedAt    time.Time
}

// UserRepo handles database operations for users and refresh tokens.
type UserRepo struct {
	pool *pgxpool.Pool
}

// NewUserRepo creates a new UserRepo.
func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

// CreateUser inserts a new user and returns their UUID.
func (r *UserRepo) CreateUser(ctx context.Context, username, email, passwordHash string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
		username, email, passwordHash,
	).Scan(&id)
	return id, err
}

// GetUserByEmail fetches a user record by email.
// Returns pgx.ErrNoRows if not found.
func (r *UserRepo) GetUserByEmail(ctx context.Context, email string) (*UserRecord, error) {
	u := &UserRecord{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

// GetUserByID fetches a user record by primary key.
func (r *UserRepo) GetUserByID(ctx context.Context, id uuid.UUID) (*UserRecord, error) {
	u := &UserRecord{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, username, email, password_hash, created_at FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

// StoreRefreshToken inserts a hashed refresh token tied to a user.
func (r *UserRepo) StoreRefreshToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	return err
}

// GetUserByRefreshToken looks up a user via their hashed refresh token.
// Returns (nil, nil) if the token doesn't exist or is expired.
func (r *UserRepo) GetUserByRefreshToken(ctx context.Context, tokenHash string) (*UserRecord, error) {
	u := &UserRecord{}
	err := r.pool.QueryRow(ctx,
		`SELECT u.id, u.username, u.email, u.password_hash, u.created_at
		 FROM users u
		 JOIN refresh_tokens rt ON rt.user_id = u.id
		 WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
		tokenHash,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

// DeleteRefreshToken removes a specific hashed refresh token (logout).
func (r *UserRepo) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM refresh_tokens WHERE token_hash = $1`,
		tokenHash,
	)
	return err
}

// DeleteAllRefreshTokensForUser removes all refresh tokens for a user (logout-all).
func (r *UserRepo) DeleteAllRefreshTokensForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM refresh_tokens WHERE user_id = $1`,
		userID,
	)
	return err
}
