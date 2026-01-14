package utils

import (
	"context"
	"net/http"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type Metadata struct {
	Title       string
	Description string
}

func FetchMetadata(ctx context.Context, targetURL string) (*Metadata, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	metadata := &Metadata{}
	metadata.Title = doc.Find("title").First().Text()
	metadata.Description = doc.Find("meta[name=description]").AttrOr("content", "")

	return metadata, nil
}
