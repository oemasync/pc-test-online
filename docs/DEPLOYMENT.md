# Deployment

## Coolify

Use the **Dockerfile** build pack.

1. Create a new application in Coolify and connect this repository.
2. Build pack: **Dockerfile** (path `Dockerfile`).
3. Port: **8080**.
4. Health check: **GET /healthz** (expects HTTP 200).
5. No environment variables are required; the app is fully static.

> The old Coolify settings must be changed: previously the app used the NodeJS build pack,
> published `frontend/dist` on port 80. Switch to the Dockerfile build pack, port 8080,
> and `/healthz`.

## Plain Docker

```bash
docker build -t pc-test-online .
docker run --rm -p 8080:8080 pc-test-online
# open http://localhost:8080
```

## Notes

- The image is multi-stage: `node:24-alpine` builds, `nginxinc/nginx-unprivileged:alpine` serves.
- The app is a single-page application; nginx falls back to `index.html`.
- `/healthz` returns `200 ok`.
