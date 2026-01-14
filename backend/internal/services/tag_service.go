package services

import (
	"context"
	"errors"

	"bookmarks-backend/internal/models"
	"bookmarks-backend/internal/utils"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TagService struct {
	Pool *pgxpool.Pool
}

func (service *TagService) List(ctx context.Context) ([]models.Tag, error) {
	rows, err := service.Pool.Query(ctx, `
		SELECT id, name
		FROM tags
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := []models.Tag{}
	for rows.Next() {
		var tag models.Tag
		if err := rows.Scan(&tag.ID, &tag.Name); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (service *TagService) Create(ctx context.Context, name string) (*models.Tag, error) {
	cleaned := utils.NormalizeName(name)
	if cleaned == "" {
		return nil, errors.New("name is required")
	}

	var tag models.Tag
	if err := service.Pool.QueryRow(ctx, `
		INSERT INTO tags (name)
		VALUES ($1)
		ON CONFLICT (name)
		DO UPDATE SET updated_at = NOW()
		RETURNING id, name
	`, cleaned).Scan(&tag.ID, &tag.Name); err != nil {
		return nil, err
	}

	return &tag, nil
}

func (service *TagService) Rename(ctx context.Context, id string, name string) (*models.Tag, error) {
	cleaned := utils.NormalizeName(name)
	if cleaned == "" {
		return nil, errors.New("name is required")
	}

	var tag models.Tag
	if err := service.Pool.QueryRow(ctx, `
		UPDATE tags
		SET name = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, name
	`, cleaned, id).Scan(&tag.ID, &tag.Name); err != nil {
		return nil, err
	}

	return &tag, nil
}

func (service *TagService) Delete(ctx context.Context, id string) error {
	commandTag, err := service.Pool.Exec(ctx, "DELETE FROM tags WHERE id = $1", id)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return errors.New("tag not found")
	}
	return nil
}
