package handler

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"

	"github.com/nikhil/vid-piracy-backend/internal/auth"
	"github.com/nikhil/vid-piracy-backend/internal/repository"
)

const refreshCookieName = "refresh_token"

// AuthHandler handles user registration, login, token refresh, and logout.
type AuthHandler struct {
	authSvc  *auth.Service
	userRepo *repository.UserRepo
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(svc *auth.Service, ur *repository.UserRepo) *AuthHandler {
	return &AuthHandler{authSvc: svc, userRepo: ur}
}

// RegisterAuthRoutes mounts auth routes on the given Fiber app.
func (h *AuthHandler) RegisterAuthRoutes(app *fiber.App) {
	a := app.Group("/api/v1/auth")
	a.Post("/register", h.Register)
	a.Post("/login", h.Login)
	a.Post("/refresh", h.Refresh)
	a.Post("/logout", h.Logout)
}

// ── Register ──────────────────────────────────────────────────────────────────

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Register creates a new user account.
// POST /api/v1/auth/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Username == "" || req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "username, email, and password are required"})
	}
	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password must be at least 8 characters"})
	}

	// Check duplicate email
	existing, err := h.userRepo.GetUserByEmail(c.Context(), req.Email)
	if err != nil {
		log.Error().Err(err).Msg("register: db lookup error")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}
	if existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email already registered"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	userID, err := h.userRepo.CreateUser(c.Context(), req.Username, req.Email, string(hash))
	if err != nil {
		log.Error().Err(err).Msg("register: create user error")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not create user"})
	}

	log.Info().Str("user_id", userID.String()).Str("email", req.Email).Msg("user registered")
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "account created successfully",
		"user_id": userID.String(),
	})
}

// ── Login ─────────────────────────────────────────────────────────────────────

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login authenticates a user and returns a JWT access token.
// A refresh token is set as an httpOnly cookie.
// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email and password required"})
	}

	user, err := h.userRepo.GetUserByEmail(c.Context(), req.Email)
	if err != nil {
		log.Error().Err(err).Msg("login: db error")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}
	if user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid email or password"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid email or password"})
	}

	accessToken, err := h.authSvc.GenerateAccessToken(user.ID, user.Username, user.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not generate token"})
	}

	rawRefresh, hashedRefresh, expiresAt, err := h.authSvc.GenerateRefreshToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not generate refresh token"})
	}

	if err := h.userRepo.StoreRefreshToken(c.Context(), user.ID, hashedRefresh, expiresAt); err != nil {
		log.Error().Err(err).Msg("login: store refresh token error")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	// Set httpOnly cookie
	c.Cookie(&fiber.Cookie{
		Name:     refreshCookieName,
		Value:    rawRefresh,
		HTTPOnly: true,
		Secure:   false, // set true behind HTTPS in prod
		SameSite: "Lax",
		Expires:  expiresAt,
		Path:     "/api/v1/auth",
	})

	log.Info().Str("user_id", user.ID.String()).Msg("user logged in")
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_in":   int(15 * time.Minute / time.Second),
		"user": fiber.Map{
			"id":       user.ID.String(),
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

// ── Refresh ───────────────────────────────────────────────────────────────────

// Refresh issues a new access token using the refresh cookie.
// POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	rawToken := c.Cookies(refreshCookieName)
	if rawToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "refresh token missing"})
	}

	hashed := auth.HashToken(rawToken)
	user, err := h.userRepo.GetUserByRefreshToken(c.Context(), hashed)
	if err != nil {
		log.Error().Err(err).Msg("refresh: db error")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}
	if user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired refresh token"})
	}

	accessToken, err := h.authSvc.GenerateAccessToken(user.ID, user.Username, user.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not generate token"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_in":   int(15 * time.Minute / time.Second),
	})
}

// ── Logout ────────────────────────────────────────────────────────────────────

// Logout deletes the refresh token and clears the cookie.
// POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	rawToken := c.Cookies(refreshCookieName)
	if rawToken != "" {
		hashed := auth.HashToken(rawToken)
		if err := h.userRepo.DeleteRefreshToken(c.Context(), hashed); err != nil {
			log.Error().Err(err).Msg("logout: delete refresh token error")
		}
	}

	// Clear the cookie
	c.Cookie(&fiber.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		HTTPOnly: true,
		Secure:   false,
		SameSite: "Lax",
		Expires:  time.Unix(0, 0),
		Path:     "/api/v1/auth",
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "logged out successfully"})
}
