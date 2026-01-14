package handlers

import (
	"net/http"

	"bookmarks-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type nameRequest struct {
	Name string `json:"name"`
}

func RegisterCategoryRoutes(router *gin.RouterGroup, service *services.CategoryService) {
	routes := router.Group("/categories")

	routes.GET("", func(ctx *gin.Context) {
		categories, err := service.List(ctx)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, categories)
	})

	routes.POST("", func(ctx *gin.Context) {
		var req nameRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		category, err := service.Create(ctx, req.Name)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusCreated, category)
	})

	routes.PUT(":id", func(ctx *gin.Context) {
		var req nameRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		category, err := service.Rename(ctx, ctx.Param("id"), req.Name)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, category)
	})

	routes.DELETE(":id", func(ctx *gin.Context) {
		if err := service.Delete(ctx, ctx.Param("id")); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.Status(http.StatusNoContent)
	})
}
