# Job Registration Application (React + Express + MySQL + Docker Compose)

Full-stack Job Registration application with complete CRUD (Create, Read, Update, Delete), containerized with Docker Compose (compatible with Docker Compose standalone `1.29.2` and Compose format `3.8`).

## Architecture & Ports

| Service | Container Name | Tech | Container Port | Host Port |
|---|---|---|---:|---:|
| `frontend` | `frontend-app` | React (Vite) + Nginx | 80 | **3000** |
| `backend` | `backend-app` | Node.js 22 + Express 5 | 5000 | **5000** |
| `mysql` | `mysql-db` | MySQL 8.0 | 3306 | **3306** |

```text
Browser ──> frontend-app (Nginx :80) ──/api/*──> backend-app (Express :5000) ──> mysql-db (:3306)
             serves React dist/                    connects to host "mysql"       DB: docker_practice
```

- The React frontend calls **relative** API paths (`/api/applications`), never `localhost`.
- Nginx serves the production Vite `dist/` bundle, handles React SPA routing (`try_files $uri $uri/ /index.html;`), and proxies `/api/` requests to `http://backend:5000`.
- The Express backend waits for the `mysql` health check, retries database connections until MySQL is ready, automatically creates the `applications` table in `docker_practice`, and then listens on `0.0.0.0:5000`.

## Project Structure (Case-Sensitive on Linux)

```text
samplereactapp-3/
├── Client/
│   ├── Dockerfile          # Multi-stage build: Node 22 -> Nginx (port 80)
│   ├── nginx.conf          # SPA fallback + /api/ reverse proxy
│   ├── .dockerignore
│   ├── package.json
│   ├── package-lock.json
│   └── src/
├── Server/
│   ├── Dockerfile          # Node 22 Alpine production image (port 5000)
│   ├── .dockerignore
│   ├── index.js            # Express API + MySQL pool & retry logic
│   ├── package.json
│   └── package-lock.json
├── docker-compose.yaml     # Compose v3.8 (compatible with 1.29.2)
├── .env.example            # Template environment variables
├── .gitignore
├── README.md
└── CHANGELOG.md
```

## Quick Start (Docker Compose 1.29.2 / Killercoda / Ubuntu)

```bash
# 1. Verify Docker and Docker Compose versions
docker --version
docker-compose --version

# 2. Extract uploaded ZIP and enter project directory
unzip samplereactapp-3.zip
cd samplereactapp-3
ls -la   # Verify Client/, Server/, docker-compose.yaml, .env.example

# 3. Create .env from .env.example and customize passwords
cp .env.example .env
nano .env   # Set strong MYSQL_ROOT_PASSWORD and MYSQL_PASSWORD

# 4. Validate Compose YAML
docker-compose config

# 5. Build and start all containers in detached mode
docker-compose up -d --build

# 6. Check container status and logs
docker-compose ps
docker-compose logs mysql
docker-compose logs backend
docker-compose logs frontend
```

## API Endpoints

- `GET /api/health` — Database connectivity & API health check
- `POST /api/applications` — Create a job application (`full_name`, `email`, `position` required)
- `GET /api/applications` — List all applications (newest first)
- `GET /api/applications/:id` — Get a single application by ID
- `PUT /api/applications/:id` — Update an application by ID
- `DELETE /api/applications/:id` — Delete an application by ID

## Verify Endpoints & Persistence

```bash
# Test frontend served by Nginx
curl -I http://localhost:3000

# Test backend health directly and through Nginx
curl http://localhost:5000/api/health
curl http://localhost:3000/api/health

# Test CRUD through Nginx
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Arun Kumar","email":"arun@example.com","phone":"9876543210","position":"DevOps Engineer","experience":3,"cover_letter":"Excited to apply."}'

curl http://localhost:3000/api/applications
curl http://localhost:3000/api/applications/1

curl -X PUT http://localhost:3000/api/applications/1 \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Arun Kumar","email":"arun@example.com","phone":"9876543210","position":"Senior DevOps Engineer","experience":4,"cover_letter":"Updated letter."}'

curl -X DELETE http://localhost:3000/api/applications/1

# Inspect MySQL database and applications table
docker exec -it mysql-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES; USE docker_practice; SHOW TABLES; SELECT * FROM applications;"'

# Stop and restart while keeping database volume intact
docker-compose down
docker-compose up -d
```

## Local Development (Without Docker)

```bash
# 1. Start local MySQL and create database `docker_practice`
# 2. Configure Server/.env with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=docker_practice
cd Server && npm install && npm run dev

# 3. Start Vite dev server (proxies /api to http://localhost:5000)
cd Client && npm install && npm run dev
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `build path ./client either does not exist` | Linux is case-sensitive | Ensure folders are `Client/` and `Server/` matching `docker-compose.yaml` |
| `Warning: The "MYSQL_..." variable is not set` | `.env` file missing | Run `cp .env.example .env` in the project root |
| `ER_ACCESS_DENIED_ERROR` in backend logs | MySQL volume initialized with older credentials | Run `docker-compose down -v && docker-compose up -d --build` (warning: resets DB volume) |
| `502 Bad Gateway` on `/api/*` | Backend still starting or crashed | Check `docker-compose logs backend` |
| Port `3000`, `5000`, or `3306` already allocated | Another service uses the port | Stop conflicting service or change the host port (left side) in `docker-compose.yaml` |
| `http+docker` / `URLSchemeUnknown` in `docker-compose` 1.29.2 | Python `requests >= 2.32` incompatibility | Run `pip install "requests<2.32"` or upgrade `docker-compose` |
