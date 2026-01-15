package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"bookmarks-backend/internal/services"
	"bookmarks-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type bookmarkRequest struct {
	URL         string   `json:"url"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Tags        []string `json:"tags"`
}

type bookmarkUpdateRequest struct {
	URL         *string   `json:"url"`
	Title       *string   `json:"title"`
	Description *string   `json:"description"`
	Category    *string   `json:"category"`
	Tags        *[]string `json:"tags"`
}

func RegisterBookmarkRoutes(router *gin.RouterGroup, service *services.BookmarkService) {
	routes := router.Group("/bookmarks")

	routes.POST("", func(ctx *gin.Context) {
		var req bookmarkRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		bookmark, err := service.Create(ctx, services.BookmarkInput{
			URL:         req.URL,
			Title:       req.Title,
			Description: req.Description,
			Category:    req.Category,
			Tags:        req.Tags,
		})
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusCreated, bookmark)
	})

	routes.GET("", func(ctx *gin.Context) {
		page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "20"))
		query := strings.TrimSpace(ctx.DefaultQuery("q", ""))
		category := strings.TrimSpace(ctx.DefaultQuery("category", ""))
		categoryParam := strings.TrimSpace(ctx.DefaultQuery("categories", ""))
		tagParam := strings.TrimSpace(ctx.DefaultQuery("tags", ""))
		var tags []string
		if tagParam != "" {
			tags = strings.Split(tagParam, ",")
		}
		var categories []string
		if categoryParam != "" {
			categories = strings.Split(categoryParam, ",")
		}

		list, err := service.List(ctx, services.BookmarkFilters{
			Category:   category,
			Categories: categories,
			Tags:       tags,
			Query:      query,
			Page:       page,
			PageSize:   pageSize,
		})
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, list)
	})

	routes.GET("/lookup", func(ctx *gin.Context) {
		rawURL := strings.TrimSpace(ctx.Query("url"))
		if rawURL == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
			return
		}

		normalizedURL, err := utils.NormalizeURL(rawURL)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		bookmark, err := service.GetByNormalizedURL(ctx, normalizedURL)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				metadata, metaErr := utils.FetchMetadata(ctx, normalizedURL)
				if metaErr != nil {
					ctx.JSON(http.StatusBadRequest, gin.H{"error": metaErr.Error()})
					return
				}

				category, tags, ruleErr := service.SuggestForURL(ctx, normalizedURL, metadata.Title)
				if ruleErr != nil {
					ctx.JSON(http.StatusInternalServerError, gin.H{"error": ruleErr.Error()})
					return
				}

				structuredTags := []gin.H{}
				for _, tag := range tags {
					structuredTags = append(structuredTags, gin.H{"name": tag})
				}

				ctx.JSON(http.StatusOK, gin.H{
					"found":         false,
					"normalizedUrl": normalizedURL,
					"title":         metadata.Title,
					"description":   metadata.Description,
					"category":      category,
					"tags":          structuredTags,
				})
				return
			}
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"found":         true,
			"normalizedUrl": bookmark.NormalizedURL,
			"title":         bookmark.Title,
			"description":   bookmark.Description,
			"category":      bookmark.CategoryName,
			"tags":          bookmark.Tags,
			"bookmarkId":    bookmark.ID,
		})
	})

	routes.GET(":id", func(ctx *gin.Context) {
		bookmark, err := service.Get(ctx, ctx.Param("id"))
		if err != nil {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, bookmark)
	})

	routes.PUT(":id", func(ctx *gin.Context) {
		var req bookmarkUpdateRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		bookmark, err := service.Update(ctx, ctx.Param("id"), services.BookmarkUpdateInput{
			URL:         req.URL,
			Title:       req.Title,
			Description: req.Description,
			Category:    req.Category,
			Tags:        req.Tags,
		})
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, bookmark)
	})

	routes.DELETE(":id", func(ctx *gin.Context) {
		if err := service.Delete(ctx, ctx.Param("id")); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.Status(http.StatusNoContent)
	})
}
