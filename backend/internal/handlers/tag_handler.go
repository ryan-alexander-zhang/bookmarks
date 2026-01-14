package handlers

import (
	"net/http"

	"bookmarks-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func RegisterTagRoutes(router *gin.RouterGroup, service *services.TagService) {
	routes := router.Group("/tags")

	routes.GET("", func(ctx *gin.Context) {
		tags, err := service.List(ctx)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, tags)
	})

	routes.POST("", func(ctx *gin.Context) {
		var req nameRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		tag, err := service.Create(ctx, req.Name)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusCreated, tag)
	})

	routes.PUT(":id", func(ctx *gin.Context) {
		var req nameRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		tag, err := service.Rename(ctx, ctx.Param("id"), req.Name)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, tag)
	})

	routes.DELETE(":id", func(ctx *gin.Context) {
		if err := service.Delete(ctx, ctx.Param("id")); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.Status(http.StatusNoContent)
	})
}
