package services

import (
	"context"
	"errors"
	"strings"

	"bookmarks-backend/internal/models"
	"bookmarks-backend/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RuleService struct {
	Pool *pgxpool.Pool
}

type RuleInput struct {
	Name          string
	HostPrefix    string
	URLPrefix     string
	PathPrefix    string
	TitleContains string
	Category      string
	Tags          []string
}

func (service *RuleService) List(ctx context.Context) ([]models.Rule, error) {
	rows, err := service.Pool.Query(ctx, `
		SELECT r.id, r.name, r.host_prefix, r.url_prefix, r.path_prefix, r.title_contains,
		r.category_id, c.name, r.created_at, r.updated_at
		FROM rules r
		LEFT JOIN categories c ON c.id = r.category_id
		ORDER BY r.created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rules := []models.Rule{}
	for rows.Next() {
		var rule models.Rule
		if err := rows.Scan(&rule.ID, &rule.Name, &rule.HostPrefix, &rule.URLPrefix, &rule.PathPrefix, &rule.TitleContains, &rule.CategoryID, &rule.CategoryName, &rule.CreatedAt, &rule.UpdatedAt); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}

	for index := range rules {
		tags, err := service.fetchRuleTags(ctx, rules[index].ID)
		if err != nil {
			return nil, err
		}
		rules[index].Tags = tags
	}

	return rules, nil
}

func (service *RuleService) Create(ctx context.Context, input RuleInput) (*models.Rule, error) {
	if strings.TrimSpace(input.Name) == "" {
		return nil, errors.New("name is required")
	}
	if !hasAnyRuleCondition(input) {
		return nil, errors.New("at least one matching rule is required")
	}

	categoryName := utils.NormalizeName(input.Category)
	cleanTags := normalizeTags(input.Tags)

	tx, err := service.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var categoryID *string
	var categoryNamePtr *string
	if categoryName != "" {
		id, err := upsertCategory(ctx, tx, categoryName)
		if err != nil {
			return nil, err
		}
		categoryID = &id
		categoryNamePtr = &categoryName
	}

	var rule models.Rule
	if err := tx.QueryRow(ctx, `
		INSERT INTO rules (name, host_prefix, url_prefix, path_prefix, title_contains, category_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, host_prefix, url_prefix, path_prefix, title_contains, category_id, created_at, updated_at
	`, strings.TrimSpace(input.Name), strings.TrimSpace(input.HostPrefix), strings.TrimSpace(input.URLPrefix), strings.TrimSpace(input.PathPrefix), strings.TrimSpace(input.TitleContains), categoryID).
		Scan(&rule.ID, &rule.Name, &rule.HostPrefix, &rule.URLPrefix, &rule.PathPrefix, &rule.TitleContains, &rule.CategoryID, &rule.CreatedAt, &rule.UpdatedAt); err != nil {
		return nil, err
	}

	tags, err := upsertTags(ctx, tx, cleanTags)
	if err != nil {
		return nil, err
	}
	if err := attachRuleTags(ctx, tx, rule.ID, tags); err != nil {
		return nil, err
	}

	rule.CategoryName = categoryNamePtr
	rule.Tags = tags

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &rule, nil
}

func (service *RuleService) Update(ctx context.Context, id string, input RuleInput) (*models.Rule, error) {
	if strings.TrimSpace(input.Name) == "" {
		return nil, errors.New("name is required")
	}
	if !hasAnyRuleCondition(input) {
		return nil, errors.New("at least one matching rule is required")
	}

	categoryName := utils.NormalizeName(input.Category)
	cleanTags := normalizeTags(input.Tags)

	tx, err := service.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var categoryID *string
	var categoryNamePtr *string
	if categoryName != "" {
		id, err := upsertCategory(ctx, tx, categoryName)
		if err != nil {
			return nil, err
		}
		categoryID = &id
		categoryNamePtr = &categoryName
	}

	var rule models.Rule
	if err := tx.QueryRow(ctx, `
		UPDATE rules
		SET name = $1,
			host_prefix = $2,
			url_prefix = $3,
			path_prefix = $4,
			title_contains = $5,
			category_id = $6,
			updated_at = NOW()
		WHERE id = $7
		RETURNING id, name, host_prefix, url_prefix, path_prefix, title_contains, category_id, created_at, updated_at
	`, strings.TrimSpace(input.Name), strings.TrimSpace(input.HostPrefix), strings.TrimSpace(input.URLPrefix), strings.TrimSpace(input.PathPrefix), strings.TrimSpace(input.TitleContains), categoryID, id).
		Scan(&rule.ID, &rule.Name, &rule.HostPrefix, &rule.URLPrefix, &rule.PathPrefix, &rule.TitleContains, &rule.CategoryID, &rule.CreatedAt, &rule.UpdatedAt); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, "DELETE FROM rule_tags WHERE rule_id = $1", id); err != nil {
		return nil, err
	}
	tags, err := upsertTags(ctx, tx, cleanTags)
	if err != nil {
		return nil, err
	}
	if err := attachRuleTags(ctx, tx, id, tags); err != nil {
		return nil, err
	}

	rule.CategoryName = categoryNamePtr
	rule.Tags = tags

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &rule, nil
}

func (service *RuleService) Delete(ctx context.Context, id string) error {
	commandTag, err := service.Pool.Exec(ctx, "DELETE FROM rules WHERE id = $1", id)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return errors.New("rule not found")
	}
	return nil
}

func (service *RuleService) fetchRuleTags(ctx context.Context, ruleID string) ([]models.Tag, error) {
	rows, err := service.Pool.Query(ctx, `
		SELECT t.id, t.name
		FROM tags t
		INNER JOIN rule_tags rt ON rt.tag_id = t.id
		WHERE rt.rule_id = $1
		ORDER BY t.name ASC
	`, ruleID)
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

func attachRuleTags(ctx context.Context, tx pgx.Tx, ruleID string, tags []models.Tag) error {
	for _, tag := range tags {
		if _, err := tx.Exec(ctx, `
			INSERT INTO rule_tags (rule_id, tag_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, ruleID, tag.ID); err != nil {
			return err
		}
	}
	return nil
}

func hasAnyRuleCondition(input RuleInput) bool {
	return strings.TrimSpace(input.HostPrefix) != "" ||
		strings.TrimSpace(input.URLPrefix) != "" ||
		strings.TrimSpace(input.PathPrefix) != "" ||
		strings.TrimSpace(input.TitleContains) != ""
}
