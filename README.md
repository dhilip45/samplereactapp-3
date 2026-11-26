# Job Application App (React + Express + MySQL) with Docker Compose

Job application form with full CRUD (Create, Read, Update, Delete).

| Service  | Tech                    | Container port | Host port |
|----------|-------------------------|----------------|-----------|
| frontend | React (Vite) + Nginx    | 80             | **3000**  |
| backend  | Node.js + Express 5     | 5000           | **5000**  |
| mysql    | MySQL 8.0               | 3306           | **3306**  |

```
Browser ──> frontend (Nginx :80) ──/api/*──> backend (Express :5000) ──> mysql (:3306)
                 serves React build            host "mysql" (service name)
```

The browser only calls **relative** URLs (`/api/applications`). Nginx forwards `/api/*` to the `backend` container, so no Docker-only hostname is ever used in the browser and CORS is not a problem.

## Project structure (names are case-sensitive on Linux)

```
04-Docker/
├── Client/                 React + Vite app
│   ├── Dockerfile          multi-stage: node build -> nginx
│   ├── nginx.conf          SPA routing + /api proxy
│   ├── .dockerignore
│   └── src/ ...
├── Server/                 Express API
│   ├── Dockerfile
│   ├── .dockerignore
│   └── index.js
├── docker-compose.yaml
├── .env.example            copy to .env (git-ignored)
├── .gitignore
└── README.md
```

## Run on Killercoda (Docker Compose V1)

Killercoda has `docker-compose` (with a hyphen). `docker compose` may not exist there.

```bash
# 1. Get the project
git clone <your-repo-url>
cd 04-Docker            # (or: unzip 04-Docker.zip && cd 04-Docker)

# 2. Check versions and folder names
docker --version
docker-compose --version
ls                      # must show: Client  Server  docker-compose.yaml

# 3. Create your env file and set passwords
cp .env.example .env
nano .env

# 4. Build and start everything
docker-compose up -d --build

# 5. Verify
docker ps
docker-compose ps
docker-compose logs backend     # expect: DB ready / API on 5000
```

### Open the app

- **Killercoda:** top-right menu **Traffic / Ports** -> enter port **3000** -> Access.
  (`localhost:3000` does not work in your own browser there.)
- **Local PC:** http://localhost:3000
- Test the API: `curl http://localhost:5000/api/health` and `curl http://localhost:3000/api/applications`
  (the second one goes through Nginx).

### Test CRUD from the terminal

```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Arun","email":"arun@test.com","position":"Developer","experience":2}'
curl http://localhost:3000/api/applications
curl -X DELETE http://localhost:3000/api/applications/1
```

### Inspect the database

```bash
docker exec -it jobapp-mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT * FROM applications;"'
```

## Useful commands

```bash
docker-compose logs                 # all logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs mysql
docker-compose logs -f backend      # follow (Ctrl+C to exit)
docker-compose restart backend
docker-compose up -d --build backend   # rebuild one service
docker-compose down                 # stop, keep data
docker-compose down -v              # stop AND delete MySQL data
```

On Docker Compose V2 (Docker Desktop on Windows/Mac) use `docker compose` (with a space) instead.

## Run without Docker (development)

```bash
# terminal 1 - needs a local MySQL; create Server/.env with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
cd Server && npm install && npm run dev
# terminal 2 - Vite proxies /api to localhost:5000
cd Client && npm install && npm run dev      # http://localhost:3000
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `failed to read dockerfile: open Dockerfile: no such file` | Built from the root folder | Run `docker-compose up -d --build` from the folder containing `docker-compose.yaml`; compose uses `./Client` and `./Server` |
| `build path .../server either does not exist` | Wrong capitalization | Folder is `Server` (capital S). Linux is case-sensitive |
| `unknown shorthand flag: 'd' in -d` | Used `docker compose` on a V1 machine | Use `docker-compose up -d --build` |
| `docker : The term 'docker' is not recognized` (Windows) | Docker Desktop not installed or not running | Install/start Docker Desktop, open a new terminal |
| Warning `variable MYSQL_PASSWORD is not set` | No `.env` file | `cp .env.example .env` |
| Backend log `ER_ACCESS_DENIED_ERROR` | MySQL volume was created with older passwords | `docker-compose down -v` then `docker-compose up -d --build` (deletes data) |
| Backend log `Waiting for DB... ECONNREFUSED` | MySQL still starting | Wait about 30 s; it retries. Check `docker-compose logs mysql` |
| `Bind for 0.0.0.0:3306 failed: port is already allocated` | Another MySQL uses 3306 | Change left side in compose, e.g. `"3307:3306"` (backend still uses 3306 internally) |
| `Bind ... 3000 / 5000 already allocated` | Local dev server running | Stop it, or change the host port |
| Page loads but list is empty / "Something went wrong" | Backend down or `/api` not proxied | `docker-compose ps`, `docker-compose logs backend`, then `curl localhost:5000/api/health` |
| `502 Bad Gateway` on `/api/...` | Backend crashed or not started | `docker-compose logs backend`, then `docker-compose restart backend` |
| Refreshing a page shows 404 | SPA fallback missing | `Client/nginx.conf` must contain `try_files $uri $uri/ /index.html;` |
| Code changes not showing | Old image | `docker-compose up -d --build` |
| `http+docker` / `URLSchemeUnknown` error from docker-compose | Old docker-compose 1.29.2 with newer Python `requests` | `pip install "requests<2.32"` (or use `docker compose` V2 if available) |

## Security

- Passwords live in `.env` (git-ignored). Only `.env.example` is committed.
- Do not publish port 3306 on a public server; remove the `3306:3306` mapping from `docker-compose.yaml` if you do not need external DB access.
