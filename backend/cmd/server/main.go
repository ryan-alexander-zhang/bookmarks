package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"bookmarks-backend/internal/config"
	"bookmarks-backend/internal/db"
	"bookmarks-backend/internal/handlers"
	"bookmarks-backend/internal/services"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection error: %v", err)
	}
	defer pool.Close()

	migrationsDir := filepath.Join(".", "migrations")
	if _, err := os.Stat(migrationsDir); err == nil {
		if err := db.ApplyMigrations(ctx, pool, migrationsDir); err != nil {
			log.Fatalf("migration error: %v", err)
		}
	}

	bookmarkService := &services.BookmarkService{Pool: pool}
	categoryService := &services.CategoryService{Pool: pool}
	tagService := &services.TagService{Pool: pool}
	ruleService := &services.RuleService{Pool: pool}
	settingsService := &services.SettingsService{Pool: pool}
	importExportService := &services.ImportExportService{Bookmarks: bookmarkService}

	router := &handlers.Router{
		Bookmarks:      bookmarkService,
		Categories:     categoryService,
		Tags:           tagService,
		Rules:          ruleService,
		Settings:       settingsService,
		ImportExport:   importExportService,
		FrontendURL:    cfg.FrontendURL,
		AllowedOrigins: cfg.AllowedOrigins,
	}

	engine := router.Register()

	log.Printf("server listening on :%s", cfg.Port)
	if err := engine.Run("0.0.0.0:" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
