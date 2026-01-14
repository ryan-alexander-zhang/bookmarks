package handlers

import (
	"net/http"

	"bookmarks-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func RegisterSettingsRoutes(router *gin.RouterGroup, service *services.SettingsService) {
	routes := router.Group("/settings")

	routes.POST("/clear", func(ctx *gin.Context) {
		if err := service.ClearData(ctx); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ctx.Status(http.StatusNoContent)
	})
}
