package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port           string
	DatabaseURL    string
	FrontendURL    string
	AllowedOrigins []string
}

func Load() (*Config, error) {
	port := getEnv("PORT", "8083")
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	allowedOrigins := parseList(os.Getenv("ALLOWED_ORIGINS"))

	return &Config{
		Port:           port,
		DatabaseURL:    databaseURL,
		FrontendURL:    getEnv("FRONTEND_URL", "http://localhost:3002"),
		AllowedOrigins: allowedOrigins,
	}, nil
}

func parseList(value string) []string {
	if value == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	results := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			results = append(results, trimmed)
		}
	}
	return results
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
