# Deployment — Docker & Infrastructure

The application is containerized with Docker Compose. Five services run in separate
containers, connected through Docker networking and shared volumes.

## Services

Service order matches `docker-compose.yml`.

### db (port 5432)

PostgreSQL 16 Alpine with a health check.

```yaml
image: postgres:16-alpine
environment:
  POSTGRES_USER: resume_builder
  POSTGRES_PASSWORD: resume_builder
  POSTGRES_DB: resume_builder
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U resume_builder"]
  interval: 5s
  timeout: 5s
  retries: 5
```

- Port `5432:5432` exposed to the host
- Persistent data stored in the `postgres_data` named volume (`/var/lib/postgresql/data`)
- Health check interval: 5 seconds, timeout 5 seconds, 5 retries. Backend waits for healthy status before starting.

### redis (port 6379)

Redis 7 Alpine. Used for rate limiting and caching.

- Port `6379:6379` exposed to the host
- Data stored in the `redis_data` named volume (`/data`)
- No health check — backend only checks that the service started

### latex (internal port 9777)

Full TeX Live distribution running a custom HTTP compilation server.

```dockerfile
FROM texlive/texlive:latest-full
RUN mkdir -p /work && chmod 777 /work
WORKDIR /work
COPY compile_server.py /compile_server.py
EXPOSE 9777
CMD ["python3", "/compile_server.py"]
```

- Built from `./docker/latex`, mounts the `latex_work` volume at `/work`
- Runs `compile_server.py` — a single-threaded `http.server` bound to `0.0.0.0:9777` that accepts POST requests at `/compile` with JSON body `{"tex_source": "...", "document_id": "..."}`
- Writes the source to `/work/<document_id>/resume.tex`, invokes `latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=/work/<document_id>`, and returns the PDF bytes
- Compilation subprocess timeout: 30 seconds (returns 408 on timeout, 400 with compiler output on failure, 500 on other errors)
- Internal-only service, not exposed to the host

### backend (port 8000)

FastAPI running on Uvicorn with `--reload` enabled.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install poetry
COPY pyproject.toml poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi --no-root
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- Port `8000:8000` exposed to the host
- Source mounted at `./backend:/app` for hot reload
- Depends on `db` (must be healthy) and `redis` (must be started)
- Shares `latex_work:/work` volume with the latex service
- Reads environment from `./backend/.env`
- Talks to the latex container at `http://latex:9777/compile` (the `LatexCompiler` default service URL, with a 60-second client read timeout)

### frontend (port 3000)

Next.js 15 development server running on Node 22 Alpine.

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

- Port `3000:3000` exposed to the host; dev script runs `next dev --port 3000`
- Source mounted at `./frontend:/app` for hot reload
- `node_modules` excluded from the volume mount (`/app/node_modules` preserved as an anonymous volume)
- Depends on the backend service
- Reads environment from `./frontend/.env.local`
- `next.config.js` sets `output: "standalone"` for production builds

## Volumes

| Volume        | Purpose                                               |
| ------------- | ----------------------------------------------------- |
| postgres_data | Persistent database storage across container restarts |
| redis_data    | Persistent Redis data                                 |
| latex_work    | Shared between backend and latex for .tex/.pdf files  |

The `latex_work` volume is the integration point: the backend writes `tex_source` via the compiler client (`backend/app/services/latex/compiler.py`), the latex container writes `.tex` to disk and compiles it, then the backend receives the PDF bytes in the HTTP response.

## Environment Variables

**Backend** (`backend/.env`, loaded by `env_file` in compose):

- `DATABASE_URL` (required) — asyncpg connection string. In Docker: `postgresql+asyncpg://resume_builder:resume_builder@db:5432/resume_builder`; local dev connects to `localhost:5432`
- `REDIS_URL` (required) — e.g. `redis://redis:6379/0` in Docker; `localhost:6379` in local dev
- `LATEX_WORK_DIR` — path to the shared work directory (default `/work`)
- `SECRET_KEY` (required) — used for JWT signing and API key encryption. Must be at least 32 characters or the backend raises on startup
- `FRONTEND_ORIGIN` — CORS allowlist origin and OAuth redirect base (default `http://localhost:3000`)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth, optional (empty default)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth, optional (empty default)

**Frontend** (`frontend/.env.local`, loaded by `env_file` in compose):

- `NEXT_PUBLIC_API_BASE_URL` — backend URL reachable from the browser, e.g. `http://localhost:8000`
- `INTERNAL_API_URL` — optional; used by the `/api/auth` rewrite in `next.config.js`, defaults to `NEXT_PUBLIC_API_BASE_URL`

## Development Workflow

```bash
# Start all services
docker compose up -d

# Rebuild a specific service after dependency changes
docker compose build backend

# Run database migrations
docker compose exec backend alembic upgrade head

# Create a new migration
docker compose exec backend alembic revision --autogenerate -m "description"

# Stop everything
docker compose down

# Tear down including volumes
docker compose down -v
```

Backend code changes are picked up automatically (Uvicorn `--reload`).
Frontend changes are picked up automatically (Next.js dev server hot module replacement).

## Production Considerations

1. **Web server**: Replace `uvicorn --reload` with gunicorn + uvicorn workers for multi-process handling.
2. **Reverse proxy**: Add nginx in front of frontend (3000) and backend (8000) for SSL termination, static asset caching, and routing.
3. **Secrets**: Move from `.env` files to a proper secret manager (Docker secrets, HashiCorp Vault, or cloud provider secret manager).
4. **Database**: Enable connection pooling (remove `NullPool`, currently set in `backend/app/db.py`), add replication for read-heavy workloads.
5. **LaTeX compilation**: The single-threaded `http.server` in the latex container can only handle one compilation at a time. For concurrent compilations, replace with a multi-threaded or async server (gunicorn, or rewrite as a FastAPI service).
6. **Frontend**: Build the Next.js app (`next build && next start`) instead of running the dev server. `next.config.js` already sets `output: "standalone"`.
7. **Redis**: Add authentication password and persistence configuration (AOF/RDB).
8. **Health checks**: Add health check endpoints to backend and frontend services.
9. **Logging**: Ship logs to a centralized system (e.g. Loki, CloudWatch).
