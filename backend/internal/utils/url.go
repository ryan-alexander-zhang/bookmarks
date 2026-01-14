package utils

import (
	"fmt"
	"net/url"
	"strings"
)

func NormalizeURL(rawURL string) (string, error) {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return "", fmt.Errorf("url is required")
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return "", err
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("url must include scheme and host")
	}

	host := strings.ToLower(parsed.Hostname())
	port := parsed.Port()
	if (parsed.Scheme == "http" && port == "80") || (parsed.Scheme == "https" && port == "443") {
		port = ""
	}
	if port != "" {
		host = fmt.Sprintf("%s:%s", host, port)
	}

	path := strings.TrimRight(parsed.EscapedPath(), "/")
	if path == "/" {
		path = ""
	}

	parsed.Host = host
	parsed.Fragment = ""
	parsed.Path = path
	parsed.RawPath = path

	return parsed.String(), nil
}

func NormalizeName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}
