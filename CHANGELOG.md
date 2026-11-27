# Changelog

## 1.2.0
- **Compose (`docker-compose.yaml`)**: Added `version: "3.8"` for Docker Compose 1.29.2 compatibility; fixed frontend port mapping from `3000:3000` to `3000:80`; removed hardcoded `root123` passwords in favor of `.env` variables; improved MySQL TCP health check (`127.0.0.1` + `start_period: 30s`); added backend and frontend health checks and `service_healthy` dependency ordering; added explicit `app-network` bridge network.
- **Environment (`.env.example`, `.env`)**: Aligned `MYSQL_DATABASE` to `docker_practice` and standardized placeholder credentials.
- **Frontend Docker (`Client/Dockerfile`)**: Fixed `EXPOSE 3000` to `EXPOSE 80` to match Nginx's listening port.
- **Frontend Nginx (`Client/nginx.conf`)**: Added explicit proxy connect/read timeouts for `/api/`.
- **Backend (`Server/index.js`)**: Added input normalization & ID validation across CRUD endpoints (fixing MySQL strict-mode failures on empty numeric fields in `PUT` and missing 404 checks on `PUT`/`DELETE` for non-existent IDs); upgraded `/api/health` to verify live MySQL connectivity; added malformed JSON error handling and graceful `SIGTERM`/`SIGINT` shutdown; removed unused helper.
- **Frontend (`Client/src/App.jsx`)**: Fixed ESLint `react-hooks/set-state-in-effect` error; added HTTP `res.ok` validation and JSON error parsing via `requestJson`; prevented app crash if API returns non-array error responses; prevented form reset on failed submissions; fixed delete error handling and toast timer cleanup.
- **Docs (`README.md`, `CHANGELOG.md`)**: Updated container names (`mysql-db`, `backend-app`, `frontend-app`), database name (`docker_practice`), and Killercoda Docker Compose 1.29.2 workflow.

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
