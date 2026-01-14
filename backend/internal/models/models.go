package models

import "time"

type Bookmark struct {
	ID            string    `json:"id"`
	URL           string    `json:"url"`
	NormalizedURL string    `json:"normalizedUrl"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	CategoryID    *string   `json:"categoryId"`
	CategoryName  *string   `json:"categoryName"`
	Tags          []Tag     `json:"tags"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type Tag struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Category struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Pagination struct {
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	Total    int `json:"total"`
}

type BookmarkListResponse struct {
	Items      []Bookmark `json:"items"`
	Pagination Pagination `json:"pagination"`
}

type Rule struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	HostPrefix    string    `json:"hostPrefix"`
	URLPrefix     string    `json:"urlPrefix"`
	PathPrefix    string    `json:"pathPrefix"`
	TitleContains string    `json:"titleContains"`
	CategoryID    *string   `json:"categoryId"`
	CategoryName  *string   `json:"categoryName"`
	Tags          []Tag     `json:"tags"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
