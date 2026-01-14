package handlers

import (
	"net/http"

	"bookmarks-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func RegisterImportExportRoutes(router *gin.RouterGroup, service *services.ImportExportService) {
	routes := router.Group("")

	routes.POST("/import/html", func(ctx *gin.Context) {
		file, err := ctx.FormFile("file")
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
			return
		}

		upload, err := file.Open()
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		defer upload.Close()

		imported, err := service.ImportHTML(ctx, upload)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{"count": len(imported)})
	})

	routes.GET("/export/html", func(ctx *gin.Context) {
		content, err := service.ExportHTML(ctx)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.Header("Content-Disposition", "attachment; filename=bookmarks.html")
		ctx.Data(http.StatusOK, "text/html; charset=utf-8", []byte(content))
	})
}
