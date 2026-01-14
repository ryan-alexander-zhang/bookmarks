package services

import (
	"context"
	"errors"
	"strings"

	"bookmarks-backend/internal/models"
	"bookmarks-backend/internal/utils"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CategoryService struct {
	Pool *pgxpool.Pool
}

func (service *CategoryService) List(ctx context.Context) ([]models.Category, error) {
	rows, err := service.Pool.Query(ctx, `
		SELECT id, name
		FROM categories
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var category models.Category
		if err := rows.Scan(&category.ID, &category.Name); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}

	return categories, nil
}

func (service *CategoryService) Create(ctx context.Context, name string) (*models.Category, error) {
	cleaned := utils.NormalizeName(name)
	if cleaned == "" {
		return nil, errors.New("name is required")
	}

	var category models.Category
	if err := service.Pool.QueryRow(ctx, `
		INSERT INTO categories (name)
		VALUES ($1)
		ON CONFLICT (name)
		DO UPDATE SET updated_at = NOW()
		RETURNING id, name
	`, cleaned).Scan(&category.ID, &category.Name); err != nil {
		return nil, err
	}

	return &category, nil
}

func (service *CategoryService) Rename(ctx context.Context, id string, name string) (*models.Category, error) {
	cleaned := utils.NormalizeName(name)
	if cleaned == "" {
		return nil, errors.New("name is required")
	}

	var category models.Category
	if err := service.Pool.QueryRow(ctx, `
		UPDATE categories
		SET name = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, name
	`, cleaned, id).Scan(&category.ID, &category.Name); err != nil {
		return nil, err
	}

	return &category, nil
}

func (service *CategoryService) Delete(ctx context.Context, id string) error {
	commandTag, err := service.Pool.Exec(ctx, "DELETE FROM categories WHERE id = $1", id)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return errors.New("category not found")
	}
	return nil
}

func ValidateCategoryName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("name is required")
	}
	return nil
}
