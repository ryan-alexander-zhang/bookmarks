FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . ./
RUN go build -o server ./cmd/server

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/server ./server
COPY --from=builder /app/migrations ./migrations

EXPOSE 8083

CMD ["./server"]
