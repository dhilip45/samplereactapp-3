# Changelog

## 1.1.0
- Frontend: multi-stage Dockerfile (Node 22 build -> Nginx), `nginx.conf` with SPA fallback and `/api` proxy
- Frontend: API base URL is now relative (`/api/applications`); Vite dev proxy added
- Backend: Node 22 Alpine image, `npm ci --omit=dev`, runs as non-root, listens on 0.0.0.0:PORT
- Backend: `DB_PORT`/`PORT` env support, `/api/health`, error handler, exit on DB failure
- Compose: fixed frontend indentation, env-based secrets, healthcheck, restart policies
- Fixed corrupted `Server/.dockerignore`; moved `.dockerignore` from `Client/src` to `Client`
- Added `.env.example`, root `.gitignore`, README, CHANGELOG

## 1.0.0
- Job application form with CRUD, Express API, MySQL, animated UI
