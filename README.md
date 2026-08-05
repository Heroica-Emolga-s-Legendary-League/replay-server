# Replay Server

NestJS service for ingesting and serving replay JSON files from `data/replays`.

## Local Development

```bash
npm install
npm run start:dev
```

App listens on `PORT` (default `3000`).

## Production Build

```bash
npm ci
npm run build
npm run start:prod
```

## Coolify Deployment

This repository is ready for **Dockerfile-based deployment** in Coolify.

### 1) Create the service

- In Coolify, create a **New Resource** from your Git repository.
- Choose **Dockerfile** build type.
- Keep Dockerfile path as `./Dockerfile`.

### 2) Configure networking

- Exposed container port: `3000`
- Public domain: set your desired domain in Coolify.

### 3) Configure environment variables

- `PORT=3000` (or any port, if your Coolify setup requires a custom internal port)
- `NODE_ENV=production`

### 4) Persist replay data

Replay files are written to `/app/data/replays` inside the container.

Add a persistent volume in Coolify:

- **Container path:** `/app/data/replays`
- **Host path / managed volume:** any persistent location/volume managed by Coolify

Without this volume, replay files are lost on redeploy.

### 5) Deploy

Trigger deployment from Coolify. Health check is built into the image and checks `GET /health`.

## Notes

- Views are served from `/app/views` in production image.
- Existing seeded data in `data/replays` is copied into the image at build time.
- Container ensures `/app/data/replays` exists and is writable at startup image build time.
- For host bind mounts, ensure the host directory mapped to `/app/data/replays` is writable by the container.
- Do not commit secrets; use Coolify environment variables for sensitive values.
