package services

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"bookmarks-backend/internal/models"
	"bookmarks-backend/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BookmarkService struct {
	Pool *pgxpool.Pool
}

type BookmarkInput struct {
	URL         string
	Title       string
	Description string
	Category    string
	Tags        []string
}

type BookmarkUpdateInput struct {
	URL         *string
	Title       *string
	Description *string
	Category    *string
	Tags        *[]string
}

type BookmarkFilters struct {
	Category string
	Tags     []string
	Query    string
	Page     int
	PageSize int
}

func (service *BookmarkService) Create(ctx context.Context, input BookmarkInput) (*models.Bookmark, error) {
	normalizedURL, err := utils.NormalizeURL(input.URL)
	if err != nil {
		return nil, err
	}

	if input.Title == "" || input.Description == "" {
		metadata, err := utils.FetchMetadata(ctx, normalizedURL)
		if err == nil && metadata != nil {
			if input.Title == "" {
				input.Title = strings.TrimSpace(metadata.Title)
			}
			if input.Description == "" {
				input.Description = strings.TrimSpace(metadata.Description)
			}
		}
	}

	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" {
		return nil, errors.New("title is required")
	}

	input.Description = strings.TrimSpace(input.Description)

	ruleCategory, ruleTags, err := service.matchRules(ctx, normalizedURL, input.Title)
	if err != nil {
		return nil, err
	}
	if input.Category == "" {
		input.Category = ruleCategory
	}
	if len(ruleTags) > 0 {
		input.Tags = append(input.Tags, ruleTags...)
	}

	existing, err := service.GetByNormalizedURL(ctx, normalizedURL)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if existing != nil {
		if input.Title == "" {
			input.Title = existing.Title
		}
		if input.Description == "" {
			input.Description = existing.Description
		}

		title := input.Title
		description := input.Description
		category := input.Category
		tags := input.Tags
		url := input.URL
		return service.Update(ctx, existing.ID, BookmarkUpdateInput{
			URL:         &url,
			Title:       &title,
			Description: &description,
			Category:    &category,
			Tags:        &tags,
		})
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

	var bookmarkID string
	var createdAt time.Time
	var updatedAt time.Time

	err = tx.QueryRow(ctx, `
		INSERT INTO bookmarks (url, normalized_url, title, description, category_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`, input.URL, normalizedURL, input.Title, input.Description, categoryID).Scan(&bookmarkID, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	tags, err := upsertTags(ctx, tx, cleanTags)
	if err != nil {
		return nil, err
	}

	if len(tags) > 0 {
		if err := attachTags(ctx, tx, bookmarkID, tags); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &models.Bookmark{
		ID:            bookmarkID,
		URL:           input.URL,
		NormalizedURL: normalizedURL,
		Title:         input.Title,
		Description:   input.Description,
		CategoryID:    categoryID,
		CategoryName:  categoryNamePtr,
		Tags:          tags,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
	}, nil
}

func (service *BookmarkService) Get(ctx context.Context, id string) (*models.Bookmark, error) {
	row := service.Pool.QueryRow(ctx, `
		SELECT b.id, b.url, b.normalized_url, b.title, b.description, b.category_id,
		c.name, b.created_at, b.updated_at
		FROM bookmarks b
		LEFT JOIN categories c ON c.id = b.category_id
		WHERE b.id = $1
	`, id)

	bookmark := models.Bookmark{}
	if err := row.Scan(&bookmark.ID, &bookmark.URL, &bookmark.NormalizedURL, &bookmark.Title, &bookmark.Description, &bookmark.CategoryID, &bookmark.CategoryName, &bookmark.CreatedAt, &bookmark.UpdatedAt); err != nil {
		return nil, err
	}

	tags, err := service.fetchTags(ctx, bookmark.ID)
	if err != nil {
		return nil, err
	}
	bookmark.Tags = tags

	return &bookmark, nil
}

func (service *BookmarkService) GetByNormalizedURL(ctx context.Context, normalizedURL string) (*models.Bookmark, error) {
	row := service.Pool.QueryRow(ctx, `
		SELECT b.id, b.url, b.normalized_url, b.title, b.description, b.category_id,
		c.name, b.created_at, b.updated_at
		FROM bookmarks b
		LEFT JOIN categories c ON c.id = b.category_id
		WHERE b.normalized_url = $1
	`, normalizedURL)

	bookmark := models.Bookmark{}
	if err := row.Scan(&bookmark.ID, &bookmark.URL, &bookmark.NormalizedURL, &bookmark.Title, &bookmark.Description, &bookmark.CategoryID, &bookmark.CategoryName, &bookmark.CreatedAt, &bookmark.UpdatedAt); err != nil {
		return nil, err
	}

	tags, err := service.fetchTags(ctx, bookmark.ID)
	if err != nil {
		return nil, err
	}
	bookmark.Tags = tags

	return &bookmark, nil
}

func (service *BookmarkService) List(ctx context.Context, filters BookmarkFilters) (*models.BookmarkListResponse, error) {
	page := max(filters.Page, 1)
	pageSize := max(filters.PageSize, 1)
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	whereClauses := []string{"1=1"}
	args := []any{}

	if filters.Query != "" {
		args = append(args, "%"+filters.Query+"%")
		index := len(args)
		whereClauses = append(whereClauses, fmt.Sprintf("(b.title ILIKE $%d OR b.description ILIKE $%d OR b.url ILIKE $%d)", index, index, index))
	}
	if filters.Category != "" {
		args = append(args, utils.NormalizeName(filters.Category))
		whereClauses = append(whereClauses, fmt.Sprintf("c.name = $%d", len(args)))
	}
	if len(filters.Tags) > 0 {
		normalized := normalizeTags(filters.Tags)
		args = append(args, normalized)
		whereClauses = append(whereClauses, fmt.Sprintf("t.name = ANY($%d)", len(args)))
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT b.id)
		FROM bookmarks b
		LEFT JOIN categories c ON c.id = b.category_id
		LEFT JOIN bookmark_tags bt ON bt.bookmark_id = b.id
		LEFT JOIN tags t ON t.id = bt.tag_id
		WHERE %s
	`, whereSQL)

	var total int
	if err := service.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	args = append(args, pageSize, offset)
	listQuery := fmt.Sprintf(`
		SELECT DISTINCT b.id, b.url, b.normalized_url, b.title, b.description, b.category_id,
		c.name, b.created_at, b.updated_at
		FROM bookmarks b
		LEFT JOIN categories c ON c.id = b.category_id
		LEFT JOIN bookmark_tags bt ON bt.bookmark_id = b.id
		LEFT JOIN tags t ON t.id = bt.tag_id
		WHERE %s
		ORDER BY b.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, len(args)-1, len(args))

	rows, err := service.Pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bookmarks := []models.Bookmark{}
	for rows.Next() {
		bookmark := models.Bookmark{}
		if err := rows.Scan(&bookmark.ID, &bookmark.URL, &bookmark.NormalizedURL, &bookmark.Title, &bookmark.Description, &bookmark.CategoryID, &bookmark.CategoryName, &bookmark.CreatedAt, &bookmark.UpdatedAt); err != nil {
			return nil, err
		}
		bookmarks = append(bookmarks, bookmark)
	}

	for index := range bookmarks {
		tags, err := service.fetchTags(ctx, bookmarks[index].ID)
		if err != nil {
			return nil, err
		}
		bookmarks[index].Tags = tags
	}

	return &models.BookmarkListResponse{
		Items: bookmarks,
		Pagination: models.Pagination{
			Page:     page,
			PageSize: pageSize,
			Total:    total,
		},
	}, nil
}

func (service *BookmarkService) ListAll(ctx context.Context) ([]models.Bookmark, error) {
	rows, err := service.Pool.Query(ctx, `
		SELECT b.id, b.url, b.normalized_url, b.title, b.description, b.category_id,
		c.name, b.created_at, b.updated_at
		FROM bookmarks b
		LEFT JOIN categories c ON c.id = b.category_id
		ORDER BY b.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bookmarks := []models.Bookmark{}
	for rows.Next() {
		bookmark := models.Bookmark{}
		if err := rows.Scan(&bookmark.ID, &bookmark.URL, &bookmark.NormalizedURL, &bookmark.Title, &bookmark.Description, &bookmark.CategoryID, &bookmark.CategoryName, &bookmark.CreatedAt, &bookmark.UpdatedAt); err != nil {
			return nil, err
		}
		bookmarks = append(bookmarks, bookmark)
	}

	for index := range bookmarks {
		tags, err := service.fetchTags(ctx, bookmarks[index].ID)
		if err != nil {
			return nil, err
		}
		bookmarks[index].Tags = tags
	}

	return bookmarks, nil
}

func (service *BookmarkService) Update(ctx context.Context, id string, input BookmarkUpdateInput) (*models.Bookmark, error) {
	bookmark, err := service.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	if input.URL != nil {
		if *input.URL == "" {
			return nil, errors.New("url is required")
		}
		normalizedURL, err := utils.NormalizeURL(*input.URL)
		if err != nil {
			return nil, err
		}
		bookmark.URL = *input.URL
		bookmark.NormalizedURL = normalizedURL
	}

	if input.Title != nil {
		cleaned := strings.TrimSpace(*input.Title)
		if cleaned == "" {
			return nil, errors.New("title is required")
		}
		bookmark.Title = cleaned
	}
	if input.Description != nil {
		bookmark.Description = strings.TrimSpace(*input.Description)
	}

	tx, err := service.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var categoryID *string
	var categoryName *string
	if input.Category != nil {
		name := utils.NormalizeName(*input.Category)
		if name == "" {
			categoryID = nil
			categoryName = nil
		} else {
			id, err := upsertCategory(ctx, tx, name)
			if err != nil {
				return nil, err
			}
			categoryID = &id
			categoryName = &name
		}
	} else {
		categoryID = bookmark.CategoryID
		categoryName = bookmark.CategoryName
	}

	_, err = tx.Exec(ctx, `
		UPDATE bookmarks
		SET url = $1, normalized_url = $2, title = $3, description = $4, category_id = $5, updated_at = NOW()
		WHERE id = $6
	`, bookmark.URL, bookmark.NormalizedURL, bookmark.Title, bookmark.Description, categoryID, id)
	if err != nil {
		return nil, err
	}

	if input.Tags != nil {
		cleanTags := normalizeTags(*input.Tags)
		if _, err := tx.Exec(ctx, "DELETE FROM bookmark_tags WHERE bookmark_id = $1", id); err != nil {
			return nil, err
		}
		tags, err := upsertTags(ctx, tx, cleanTags)
		if err != nil {
			return nil, err
		}
		if err := attachTags(ctx, tx, id, tags); err != nil {
			return nil, err
		}
		bookmark.Tags = tags
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	bookmark.CategoryID = categoryID
	bookmark.CategoryName = categoryName
	bookmark.UpdatedAt = time.Now()

	return bookmark, nil
}

func (service *BookmarkService) Delete(ctx context.Context, id string) error {
	_, err := service.Pool.Exec(ctx, "DELETE FROM bookmarks WHERE id = $1", id)
	return err
}

func (service *BookmarkService) UpsertFromImport(ctx context.Context, input BookmarkInput) (*models.Bookmark, error) {
	normalizedURL, err := utils.NormalizeURL(input.URL)
	if err != nil {
		return nil, err
	}

	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	categoryName := utils.NormalizeName(input.Category)
	cleanTags := normalizeTags(input.Tags)

	tx, err := service.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var existingID string
	var existingTitle string
	var existingDescription string
	var existingCategoryID *string
	var existingCategoryName *string
	var existingCreatedAt time.Time
	row := tx.QueryRow(ctx, `
		SELECT b.id, b.title, b.description, b.category_id, c.name, b.created_at
		FROM bookmarks b
		LEFT JOIN categories c ON c.id = b.category_id
		WHERE b.normalized_url = $1
	`, normalizedURL)
	if err := row.Scan(&existingID, &existingTitle, &existingDescription, &existingCategoryID, &existingCategoryName, &existingCreatedAt); err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}

	var categoryID *string
	var categoryNamePtr *string
	if categoryName != "" {
		id, err := upsertCategory(ctx, tx, categoryName)
		if err != nil {
			return nil, err
		}
		categoryID = &id
		categoryNamePtr = &categoryName
	} else if existingID != "" {
		categoryID = existingCategoryID
		categoryNamePtr = existingCategoryName
	}

	var bookmarkID string
	var createdAt time.Time
	var updatedAt time.Time

	if existingID == "" {
		if input.Title == "" || input.Description == "" {
			metadata, err := utils.FetchMetadata(ctx, normalizedURL)
			if err == nil && metadata != nil {
				if input.Title == "" {
					input.Title = strings.TrimSpace(metadata.Title)
				}
				if input.Description == "" {
					input.Description = strings.TrimSpace(metadata.Description)
				}
			}
		}
		if input.Title == "" {
			return nil, errors.New("title is required")
		}
		if err := tx.QueryRow(ctx, `
			INSERT INTO bookmarks (url, normalized_url, title, description, category_id)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, created_at, updated_at
		`, input.URL, normalizedURL, input.Title, input.Description, categoryID).Scan(&bookmarkID, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
	} else {
		bookmarkID = existingID
		if input.Title == "" {
			input.Title = existingTitle
		}
		if input.Description == "" {
			input.Description = existingDescription
		}
		if err := tx.QueryRow(ctx, `
			UPDATE bookmarks
			SET url = $1, normalized_url = $2, title = $3, description = $4, category_id = $5, updated_at = NOW()
			WHERE id = $6
			RETURNING created_at, updated_at
		`, input.URL, normalizedURL, input.Title, input.Description, categoryID, bookmarkID).Scan(&createdAt, &updatedAt); err != nil {
			return nil, err
		}
		if createdAt.IsZero() {
			createdAt = existingCreatedAt
		}
	}

	mergedTags := cleanTags
	if existingID != "" {
		existingTags, err := service.fetchTags(ctx, bookmarkID)
		if err != nil {
			return nil, err
		}
		mergedTags = unionTags(existingTags, cleanTags)
	}

	tags, err := upsertTags(ctx, tx, mergedTags)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, "DELETE FROM bookmark_tags WHERE bookmark_id = $1", bookmarkID); err != nil {
		return nil, err
	}
	if err := attachTags(ctx, tx, bookmarkID, tags); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &models.Bookmark{
		ID:            bookmarkID,
		URL:           input.URL,
		NormalizedURL: normalizedURL,
		Title:         input.Title,
		Description:   input.Description,
		CategoryID:    categoryID,
		CategoryName:  categoryNamePtr,
		Tags:          tags,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
	}, nil
}

func (service *BookmarkService) fetchTags(ctx context.Context, bookmarkID string) ([]models.Tag, error) {
	rows, err := service.Pool.Query(ctx, `
		SELECT t.id, t.name
		FROM tags t
		INNER JOIN bookmark_tags bt ON bt.tag_id = t.id
		WHERE bt.bookmark_id = $1
		ORDER BY t.name ASC
	`, bookmarkID)
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

func normalizeTags(tags []string) []string {
	unique := map[string]struct{}{}
	result := []string{}
	for _, tag := range tags {
		cleaned := utils.NormalizeName(tag)
		if cleaned == "" {
			continue
		}
		if _, exists := unique[cleaned]; !exists {
			unique[cleaned] = struct{}{}
			result = append(result, cleaned)
		}
	}
	return result
}

func unionTags(existing []models.Tag, incoming []string) []string {
	unique := map[string]struct{}{}
	merged := []string{}
	for _, tag := range existing {
		unique[tag.Name] = struct{}{}
		merged = append(merged, tag.Name)
	}
	for _, tag := range incoming {
		if _, exists := unique[tag]; !exists {
			unique[tag] = struct{}{}
			merged = append(merged, tag)
		}
	}
	return merged
}

func attachTags(ctx context.Context, tx pgx.Tx, bookmarkID string, tags []models.Tag) error {
	for _, tag := range tags {
		if _, err := tx.Exec(ctx, `
			INSERT INTO bookmark_tags (bookmark_id, tag_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, bookmarkID, tag.ID); err != nil {
			return err
		}
	}
	return nil
}

func upsertCategory(ctx context.Context, tx pgx.Tx, name string) (string, error) {
	var id string
	if err := tx.QueryRow(ctx, `
		INSERT INTO categories (name)
		VALUES ($1)
		ON CONFLICT (name)
		DO UPDATE SET updated_at = NOW()
		RETURNING id
	`, name).Scan(&id); err != nil {
		return "", err
	}
	return id, nil
}

func upsertTags(ctx context.Context, tx pgx.Tx, names []string) ([]models.Tag, error) {
	if len(names) == 0 {
		return []models.Tag{}, nil
	}

	tags := []models.Tag{}
	for _, name := range names {
		var id string
		if err := tx.QueryRow(ctx, `
			INSERT INTO tags (name)
			VALUES ($1)
			ON CONFLICT (name)
			DO UPDATE SET updated_at = NOW()
			RETURNING id
		`, name).Scan(&id); err != nil {
			return nil, err
		}
		tags = append(tags, models.Tag{ID: id, Name: name})
	}
	return tags, nil
}

func max(value int, fallback int) int {
	if value <= 0 {
		return fallback
	}
	return value
}

type ruleMatch struct {
	ID            string
	HostPrefix    string
	URLPrefix     string
	PathPrefix    string
	TitleContains string
	CategoryName  *string
	Tags          []models.Tag
}

func (service *BookmarkService) SuggestForURL(ctx context.Context, normalizedURL string, title string) (string, []string, error) {
	return service.matchRules(ctx, normalizedURL, title)
}

func (service *BookmarkService) matchRules(ctx context.Context, normalizedURL string, title string) (string, []string, error) {
	rules, err := service.loadRules(ctx)
	if err != nil {
		return "", nil, err
	}

	parsed, err := url.Parse(normalizedURL)
	if err != nil {
		return "", nil, err
	}

	host := strings.ToLower(parsed.Hostname())
	path := parsed.EscapedPath()
	pathLower := strings.ToLower(path)
	urlLower := strings.ToLower(normalizedURL)
	titleLower := strings.ToLower(title)

	category := ""
	mergedTags := []string{}
	for _, rule := range rules {
		if rule.HostPrefix != "" && !strings.HasPrefix(host, strings.ToLower(rule.HostPrefix)) {
			continue
		}
		if rule.URLPrefix != "" && !strings.HasPrefix(urlLower, strings.ToLower(rule.URLPrefix)) {
			continue
		}
		if rule.PathPrefix != "" && !strings.HasPrefix(pathLower, strings.ToLower(rule.PathPrefix)) {
			continue
		}
		if rule.TitleContains != "" && !strings.Contains(titleLower, strings.ToLower(rule.TitleContains)) {
			continue
		}

		if category == "" && rule.CategoryName != nil {
			category = *rule.CategoryName
		}
		for _, tag := range rule.Tags {
			mergedTags = append(mergedTags, tag.Name)
		}
	}

	return category, normalizeTags(mergedTags), nil
}

func (service *BookmarkService) loadRules(ctx context.Context) ([]ruleMatch, error) {
	rows, err := service.Pool.Query(ctx, `
		SELECT r.id, r.host_prefix, r.url_prefix, r.path_prefix, r.title_contains, c.name
		FROM rules r
		LEFT JOIN categories c ON c.id = r.category_id
		ORDER BY r.created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rules := []ruleMatch{}
	for rows.Next() {
		var rule ruleMatch
		if err := rows.Scan(&rule.ID, &rule.HostPrefix, &rule.URLPrefix, &rule.PathPrefix, &rule.TitleContains, &rule.CategoryName); err != nil {
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

func (service *BookmarkService) fetchRuleTags(ctx context.Context, ruleID string) ([]models.Tag, error) {
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
