package handlers

import (
	"net/http"

	"bookmarks-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type ruleRequest struct {
	Name          string   `json:"name"`
	HostPrefix    string   `json:"hostPrefix"`
	URLPrefix     string   `json:"urlPrefix"`
	PathPrefix    string   `json:"pathPrefix"`
	TitleContains string   `json:"titleContains"`
	Category      string   `json:"category"`
	Tags          []string `json:"tags"`
}

func RegisterRuleRoutes(router *gin.RouterGroup, service *services.RuleService) {
	routes := router.Group("/rules")

	routes.GET("", func(ctx *gin.Context) {
		rules, err := service.List(ctx)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, rules)
	})

	routes.POST("", func(ctx *gin.Context) {
		var req ruleRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		rule, err := service.Create(ctx, services.RuleInput(req))
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusCreated, rule)
	})

	routes.PUT(":id", func(ctx *gin.Context) {
		var req ruleRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		rule, err := service.Update(ctx, ctx.Param("id"), services.RuleInput(req))
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, rule)
	})

	routes.DELETE(":id", func(ctx *gin.Context) {
		if err := service.Delete(ctx, ctx.Param("id")); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.Status(http.StatusNoContent)
	})
}
