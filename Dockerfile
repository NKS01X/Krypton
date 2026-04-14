# Multi-stage build — small final image
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Dependencies pehle copy karo — cache layer
COPY go.mod go.sum ./
RUN go mod download

# Source code copy karo
COPY . .

# Dono binaries build karo
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/worker ./cmd/worker

# --- Final stage — minimal image ---
FROM alpine:3.19

RUN apk add --no-cache ca-certificates ffmpeg python3 py3-pip

# yt-dlp install karo
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /app

# Binaries copy karo builder se
COPY --from=builder /bin/api /bin/api
COPY --from=builder /bin/worker /bin/worker

# Config aur migrations copy karo
COPY config.yaml .
COPY migrations/ ./migrations/

# Temp dir banao
RUN mkdir -p /tmp/vidpiracy

EXPOSE 8080

# Default command — API server
CMD ["/bin/api"]
