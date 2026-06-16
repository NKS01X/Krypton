package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

const claimsKey = "user_claims"

// Middleware returns a Fiber handler that validates the Bearer JWT on every
// request. On success it stores the *Claims in the context under claimsKey.
func Middleware(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authorization header missing",
			})
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authorization header format must be: Bearer <token>",
			})
		}

		claims, err := svc.ValidateAccessToken(parts[1])
		if err != nil {
			if err == ErrTokenExpired {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "access token expired",
					"code":  "TOKEN_EXPIRED",
				})
			}
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid access token",
			})
		}

		c.Locals(claimsKey, claims)
		return c.Next()
	}
}

// GetClaims retrieves the authenticated user claims from a Fiber context.
// Returns nil if the middleware has not run or authentication failed.
func GetClaims(c *fiber.Ctx) *Claims {
	v := c.Locals(claimsKey)
	if v == nil {
		return nil
	}
	claims, _ := v.(*Claims)
	return claims
}
