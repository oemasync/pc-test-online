# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Build the static app
COPY . .
RUN npm run build

# Serve the built assets with nginx (unprivileged, non-root) on port 8080
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "--spider", "-q", "http://127.0.0.1:8080/healthz"]
