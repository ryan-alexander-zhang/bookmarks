package services

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsService struct {
	Pool *pgxpool.Pool
}

func (service *SettingsService) ClearData(ctx context.Context) error {
	_, err := service.Pool.Exec(ctx, `
		DELETE FROM bookmark_tags;
		DELETE FROM rule_tags;
		DELETE FROM bookmarks;
		DELETE FROM tags;
		DELETE FROM categories;
	`)
	return err
}
