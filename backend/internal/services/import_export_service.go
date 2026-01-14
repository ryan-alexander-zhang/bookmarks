package services

import (
	"bytes"
	"context"
	"fmt"
	"html"
	"io"
	"sort"
	"strings"

	"bookmarks-backend/internal/models"

	htmlnode "golang.org/x/net/html"
)

type ImportExportService struct {
	Bookmarks *BookmarkService
}

type ImportedBookmark struct {
	URL         string
	Title       string
	Description string
	Category    string
	Tags        []string
}

func (service *ImportExportService) ImportHTML(ctx context.Context, reader io.Reader) ([]models.Bookmark, error) {
	parsed, err := ParseNetscapeHTML(reader)
	if err != nil {
		return nil, err
	}

	imported := []models.Bookmark{}
	for _, entry := range parsed {
		bookmark, err := service.Bookmarks.UpsertFromImport(ctx, BookmarkInput{
			URL:         entry.URL,
			Title:       entry.Title,
			Description: entry.Description,
			Category:    entry.Category,
			Tags:        entry.Tags,
		})
		if err != nil {
			return nil, err
		}
		imported = append(imported, *bookmark)
	}

	return imported, nil
}

func (service *ImportExportService) ExportHTML(ctx context.Context) (string, error) {
	bookmarks, err := service.Bookmarks.ListAll(ctx)
	if err != nil {
		return "", err
	}

	grouped := map[string][]models.Bookmark{}
	for _, bookmark := range bookmarks {
		category := "Uncategorized"
		if bookmark.CategoryName != nil && *bookmark.CategoryName != "" {
			category = *bookmark.CategoryName
		}
		grouped[category] = append(grouped[category], bookmark)
	}

	categories := make([]string, 0, len(grouped))
	for category := range grouped {
		categories = append(categories, category)
	}
	sort.Strings(categories)

	buffer := &bytes.Buffer{}
	buffer.WriteString("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n")
	buffer.WriteString("<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n")
	buffer.WriteString("<TITLE>Bookmarks</TITLE>\n")
	buffer.WriteString("<H1>Bookmarks</H1>\n")
	buffer.WriteString("<DL><p>\n")

	for _, category := range categories {
		buffer.WriteString(fmt.Sprintf("\t<DT><H3>%s</H3>\n", html.EscapeString(category)))
		buffer.WriteString("\t<DL><p>\n")
		items := grouped[category]
		for _, bookmark := range items {
			addDate := bookmark.CreatedAt.Unix()
			tags := []string{}
			for _, tag := range bookmark.Tags {
				tags = append(tags, tag.Name)
			}
			tagAttr := ""
			if len(tags) > 0 {
				tagAttr = fmt.Sprintf(" TAGS=\"%s\"", html.EscapeString(strings.Join(tags, ",")))
			}
			buffer.WriteString(fmt.Sprintf("\t\t<DT><A HREF=\"%s\" ADD_DATE=\"%d\"%s>%s</A>\n",
				html.EscapeString(bookmark.URL), addDate, tagAttr, html.EscapeString(bookmark.Title)))
			if bookmark.Description != "" {
				buffer.WriteString(fmt.Sprintf("\t\t<DD>%s\n", html.EscapeString(bookmark.Description)))
			}
		}
		buffer.WriteString("\t</DL><p>\n")
	}

	buffer.WriteString("</DL><p>\n")

	return buffer.String(), nil
}

func ParseNetscapeHTML(reader io.Reader) ([]ImportedBookmark, error) {
	root, err := htmlnode.Parse(reader)
	if err != nil {
		return nil, err
	}

	entries := []ImportedBookmark{}
	var walkDL func(node *htmlnode.Node, category string)
	walkDL = func(node *htmlnode.Node, category string) {
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if child.Type != htmlnode.ElementNode {
				continue
			}
			if child.Data == "dt" {
				if titleNode := findFirstElement(child, "h3"); titleNode != nil {
					folderName := strings.TrimSpace(extractText(titleNode))
					if next := findNextElement(child, "dl"); next != nil {
						walkDL(next, folderName)
					}
					continue
				}
				if linkNode := findFirstElement(child, "a"); linkNode != nil {
					entry := ImportedBookmark{
						URL:      getAttribute(linkNode, "href"),
						Title:    strings.TrimSpace(extractText(linkNode)),
						Category: category,
					}
					if tags := getAttribute(linkNode, "tags"); tags != "" {
						entry.Tags = strings.Split(tags, ",")
					}
					if descNode := findNextElement(child, "dd"); descNode != nil {
						entry.Description = strings.TrimSpace(extractText(descNode))
					}
					if entry.URL != "" {
						entries = append(entries, entry)
					}
				}
			}
		}
	}

	if rootDL := findFirstElement(root, "dl"); rootDL != nil {
		walkDL(rootDL, "")
	}

	return entries, nil
}

func findFirstElement(node *htmlnode.Node, tag string) *htmlnode.Node {
	if node.Type == htmlnode.ElementNode && node.Data == tag {
		return node
	}
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if descendant := findFirstElement(child, tag); descendant != nil {
			return descendant
		}
	}
	return nil
}

func findNextElement(node *htmlnode.Node, tag string) *htmlnode.Node {
	for sibling := node.NextSibling; sibling != nil; sibling = sibling.NextSibling {
		if sibling.Type == htmlnode.ElementNode && sibling.Data == tag {
			return sibling
		}
	}
	return nil
}

func extractText(node *htmlnode.Node) string {
	if node.Type == htmlnode.TextNode {
		return node.Data
	}
	text := ""
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		text += extractText(child)
	}
	return text
}

func getAttribute(node *htmlnode.Node, key string) string {
	for _, attr := range node.Attr {
		if strings.EqualFold(attr.Key, key) {
			return strings.TrimSpace(attr.Val)
		}
	}
	return ""
}
