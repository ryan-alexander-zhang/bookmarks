# Bookmarks Manager

A modern, self-hosted bookmarks manager with automatic metadata, flexible tagging, and HTML import/export.

## Features

- Add bookmarks with automatic title/description fetching
- Organize with lowercase categories and tags (renamable and deletable)
- Fast search by title, description, URL, category, or tag
- Pagination with newest-first sorting
- Import and export Netscape HTML bookmarks
- Docker-first deployment with PostgreSQL

## Architecture

- **Backend**: Go + Gin REST API
- **Database**: PostgreSQL with SQL migrations
- **Frontend**: Next.js + React + shadcn/ui + Tailwind CSS + lucide-react
- **Deployment**: Docker Compose with env-driven configuration

## Tech Stack

- Go 1.23, Gin 1.10
- PostgreSQL 16
- Next.js 15, React 19
- Tailwind CSS 3.4, shadcn/ui patterns

## Quick Start (Docker)

1. Copy environment template:

```bash
cp .env.example .env
```

2. Start services:

```bash
docker compose up --build
```

3. Open the UI:

- Frontend: `http://localhost:3002`
- Backend: `http://localhost:8083/api/health`

## Local Development

### Backend

```bash
cd backend
cp ../.env.example .env
export $(cat .env | xargs)
go mod tidy
go run ./cmd/server
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Chrome Extension

### Install (Chrome)

1. Make sure the backend is running at `http://localhost:8083/api`.
2. Open `chrome://extensions` and enable Developer mode.
3. Click **Load unpacked** and select `chrome-extension`.
4. Copy the extension ID shown under the card (needed for `ALLOWED_ORIGINS`).

### Usage

- Click the extension icon to open the popup and auto-fill URL/title/description.
- Set category and tags (comma separated) and press **Save bookmark**.
- Use **Settings** to edit the blacklist (one entry per line).
- Default blacklist blocks Google and Chrome internal URLs.
- Set `ALLOWED_ORIGINS` if you want to pin access to a specific extension ID.

## Environment Variables

| Name | Description | Example |
| --- | --- | --- |
| `POSTGRES_USER` | DB username | `bookmarks` |
| `POSTGRES_PASSWORD` | DB password | `bookmarks` |
| `POSTGRES_DB` | DB name | `bookmarks` |
| `DATABASE_URL` | DB URL for backend | `postgres://bookmarks:bookmarks@postgres:5432/bookmarks?sslmode=disable` |
| `FRONTEND_URL` | CORS origin | `http://localhost:3002` |
| `NEXT_PUBLIC_API_URL` | API base for frontend | `http://localhost:8083/api` |
| `ALLOWED_ORIGINS` | Extra CORS origins (comma separated) | `http://localhost:3002,chrome-extension://<id>` |

Add `ALLOWED_ORIGINS` to `.env` if you want to restrict extension access. Example:

```
ALLOWED_ORIGINS=http://localhost:3002,chrome-extension://your-extension-id
```

## API Overview

Base URL: `/api`

### Bookmarks

- `POST /bookmarks` create (auto-fill title/description if empty)
- `GET /bookmarks` list with filters: `q`, `category`, `tags`, `page`, `page_size`
- `GET /bookmarks/lookup` prefill metadata and existing tags/categories
- `GET /bookmarks/:id` detail
- `PUT /bookmarks/:id` update (category/tag rename/delete supported)
- `DELETE /bookmarks/:id` delete

### Categories

- `GET /categories`
- `POST /categories`
- `PUT /categories/:id` rename (lowercase enforced)
- `DELETE /categories/:id` delete and detach

### Tags

- `GET /tags`
- `POST /tags`
- `PUT /tags/:id` rename (lowercase enforced)
- `DELETE /tags/:id` delete and detach

### Rules

- `GET /rules` list automation rules
- `POST /rules` create a rule
- `PUT /rules/:id` update a rule
- `DELETE /rules/:id` delete a rule

### Settings

- `POST /settings/clear` delete all bookmarks, tags, and categories

### Import/Export

- `POST /import/html` upload a Netscape HTML file
- `GET /export/html` download a Netscape HTML file

## Data Model Summary

- `bookmarks` contains URL, normalized URL, title, description, category, timestamps
- `categories` and `tags` are unique lowercase values
- `bookmark_tags` connects bookmarks to tags (many-to-many)

## URL Normalization

- Lowercase host
- Remove trailing slash
- Remove default ports (80/443)
- Remove fragment
- Preserve query string

## Import/Export Behavior

- Import upserts by normalized URL
- Categories/tags are merged (union)
- Title/description overwrite existing values when provided

## Project Structure

```
backend/            Go + Gin API
frontend/           Next.js UI
backend/migrations/ SQL migrations
```

## License

MIT
