# Replay Server

NestJS service for ingesting and serving replays from MongoDB.

## Local Development

```bash
npm install
npm run build
npm run migrate:replays
npm run start:dev
```

App listens on `PORT` (default `3000`).

Set `MONGODB_URI` before starting the app. `MONGODB_DATABASE` defaults to
`replay-server`, and `MONGODB_REPLAYS_COLLECTION` defaults to `replays`.

## Migrating existing replay files

After building, run `npm run migrate:replays`. It imports every JSON file in
`data/replays` with insert-only writes. Imported files are copied and byte-verified
in `data/replays-migrated` before the originals are removed.

The migration is safe to run repeatedly:

- An identical replay already in MongoDB is archived without writing to MongoDB.
- A different replay with the same ID is reported as a conflict; neither copy is changed.
- Existing archive files are never overwritten. A byte-identical archive permits
  resuming an interrupted migration; a different archive stops the operation.
- Invalid JSON files remain in `data/replays` and cause a non-zero exit code.

## Replay ID collisions

`POST /replays` first attempts the submitted `id`. If that ID already exists, the
server compares the ordered `players` array. Matching players identify the same
replay, so the existing ID is returned without another write. Different players
cause the server to increment the numeric suffix until it finds either the same
players or an unused ID (for example, `battle-12`, `battle-13`, `battle-14`).
MongoDB's unique `_id` constraint makes this safe even when uploads arrive
concurrently. The response contains the final saved `id` and `path_name`; callers
must use that returned ID when constructing the replay URL.

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
- `MONGODB_URI=mongodb://...` (store credentials as a secret)
- `MONGODB_DATABASE=replay-server` (optional)
- `MONGODB_REPLAYS_COLLECTION=replays` (optional)

MongoDB settings are runtime variables and are not needed to compile the image.
In Coolify, keep `MONGODB_URI` secret and **disable Available at Buildtime** so the
connection string is not injected into Docker build arguments or build metadata.

### 4) Migrate replay data

Point the service at MongoDB, deploy it, then run `npm run migrate:replays` once
inside the application container. Keep a volume mounted at `/app/data` until the
migration completes and its result has no conflicts or invalid files.

### 5) Deploy

Trigger deployment from Coolify. Health check is built into the image and checks `GET /health`.

## Notes

- Views are served from `/app/views` in production image.
- Existing seeded data in `data/replays` is copied into the image for migration.
- Do not commit secrets; use Coolify environment variables for sensitive values.
