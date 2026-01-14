package handlers

import (
	"net/http"

	"bookmarks-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func RegisterMetadataRoutes(router *gin.RouterGroup) {
	routes := router.Group("")

	routes.GET("/metadata", func(ctx *gin.Context) {
		rawURL := ctx.Query("url")
		if rawURL == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
			return
		}

		normalizedURL, err := utils.NormalizeURL(rawURL)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		metadata, err := utils.FetchMetadata(ctx, normalizedURL)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"normalizedUrl": normalizedURL,
			"title":         metadata.Title,
			"description":   metadata.Description,
		})
	})
}
