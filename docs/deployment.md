# Deployment — Docker & Infrastructure

The application is containerized with Docker Compose. Six services run in separate
containers, connected through Docker networking and shared volumes.

## Services

### frontend (port 3000)
Next.js 15 development server running on Node 22 Alpine.

```dockerfile
FROM node:22-alpine
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

- Source mounted at `./frontend:/app` for hot reload
- `node_modules` excluded from the volume mount (`/app/node_modules` preserved as an anonymous volume)
- Reads environment from `./frontend/.env.local` (needs `NEXT_PUBLIC_API_URL`)

### backend (port 8000)
FastAPI running on Uvicorn with `--reload` enabled.

```dockerfile
FROM python:3.11-slim
RUN pip install poetry
COPY pyproject.toml poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- Source mounted at `./backend:/app` for hot reload
- Depends on `db` (must be healthy) and `redis` (must be started)
- Shares `latex_work:/work` volume with the latex service
- Reads environment from `./backend/.env`

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
```

- Persistent data stored in the `postgres_data` named volume
- Health check interval: 5 seconds. Backend waits for healthy status before starting.

### redis (port 6379)
Redis 7 Alpine. Used for rate limiting and caching.

- Data stored in the `redis_data` named volume
- No health check — backend only checks that the service started

### latex (internal port 9777)
Full TeX Live distribution running a custom HTTP compilation server.

```dockerfile
FROM texlive/texlive:latest-full
RUN mkdir -p /work && chmod 777 /work
COPY compile_server.py /compile_server.py
EXPOSE 9777
CMD ["python3", "/compile_server.py"]
```

- Runs `compile_server.py` — a minimal `http.server` that accepts POST requests at `/compile` with JSON body `{"tex_source": "...", "document_id": "..."}`
- Writes `.tex` to `/work/<document_id>/resume.tex`, invokes `latexmk -pdf`, and returns the PDF bytes
- Compilation timeout: 30 seconds
- Internal-only service, not exposed to the host

### mailhog (ports 1025, 8025)
Development email catcher. All outgoing SMTP email is intercepted.

- SMTP on port 1025
- Web UI on port 8025 (open `http://localhost:8025` to view caught emails)

## Volumes

| Volume        | Purpose                                              |
|---------------|------------------------------------------------------|
| postgres_data | Persistent database storage across container restarts |
| redis_data    | Persistent Redis data                                 |
| latex_work    | Shared between backend and latex for .tex/.pdf files  |

The `latex_work` volume is the integration point: the backend writes `tex_source` via the compiler client (`backend/app/services/latex/compiler.py`), the latex container writes `.tex` to disk and compiles it, then the backend receives the PDF bytes in the HTTP response.

## Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL` — asyncpg connection string, e.g. `postgresql+asyncpg://resume_builder:resume_builder@db:5432/resume_builder`
- `SECRET_KEY` — used for JWT signing and API key encryption
- `REDIS_URL` — e.g. `redis://redis:6379/0`
- `LATEX_WORK_DIR` — path to the shared work directory (`/work`)
- `SMTP_*` variables for Mailhog (host=mailhog, port=1025)

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_API_URL` — backend URL, e.g. `http://localhost:8000`

## Development Workflow

```bash
# Start all services
docker compose up -d

# Rebuild a specific service after dependency changes
docker compose build backend

# Run database migrations
docker exec resume_builder-backend-1 alembic upgrade head

# Create a new migration
docker exec resume_builder-backend-1 alembic revision --autogenerate -m "description"

# View caught emails
open http://localhost:8025

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
4. **Database**: Enable connection pooling (remove `NullPool`), add replication for read-heavy workloads.
5. **LaTeX compilation**: The single-threaded `http.server` in the latex container can only handle one compilation at a time. For concurrent compilations, replace with a multi-threaded or async server (gunicorn, or rewrite as a FastAPI service).
6. **Frontend**: Build the Next.js app (`next build && next start`) instead of running the dev server.
7. **Redis**: Add authentication password and persistence configuration (AOF/RDB).
8. **Health checks**: Add health check endpoints to backend and frontend services.
9. **Logging**: Ship logs to a centralized system (e.g. Loki, CloudWatch).
