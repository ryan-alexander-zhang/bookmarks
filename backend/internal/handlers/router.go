package handlers

import (
	"net/http"
	"strings"

	"bookmarks-backend/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Router struct {
	Bookmarks      *services.BookmarkService
	Categories     *services.CategoryService
	Tags           *services.TagService
	Rules          *services.RuleService
	Settings       *services.SettingsService
	ImportExport   *services.ImportExportService
	FrontendURL    string
	AllowedOrigins []string
}

func (router *Router) Register() *gin.Engine {
	engine := gin.Default()
	allowedOrigins := append([]string{router.FrontendURL}, router.AllowedOrigins...)
	allowedMap := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		if origin != "" {
			allowedMap[origin] = struct{}{}
		}
	}

	engine.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			if origin == "" {
				return true
			}
			if strings.HasPrefix(origin, "chrome-extension://") {
				return true
			}
			_, ok := allowedMap[origin]
			return ok
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Disposition"},
		AllowCredentials: true,
	}))

	engine.GET("/api/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := engine.Group("/api")
	RegisterBookmarkRoutes(api, router.Bookmarks)
	RegisterCategoryRoutes(api, router.Categories)
	RegisterTagRoutes(api, router.Tags)
	RegisterRuleRoutes(api, router.Rules)
	RegisterSettingsRoutes(api, router.Settings)
	RegisterImportExportRoutes(api, router.ImportExport)

	return engine
}
