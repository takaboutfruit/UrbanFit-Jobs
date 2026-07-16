# UrbanFit Jobs (by Learn2Work)

A hybrid commute-aware job search app: a FastAPI + PostGIS backend that ranks
and prices job postings by commute cost/time, and a React (Vite) frontend
that lets users search, filter, and visualize the results on a map.

```
full_code_v3/
├── docker-compose.yml   PostGIS/Postgres database container
├── backend/             FastAPI app, PostGIS models, CSV data loader
├── frontend/            React + Vite + Tailwind client
└── datasets/            CSVs loaded into the database (companies, stations, jobs, demo routes)
```

This guide covers everything needed to run the project locally: database
setup, backend `.env`, frontend `.env`, and starting both servers.

## Prerequisites

- **Python 3.11+** (backend)
- **Node.js 18+** and **npm** (frontend)
- **Docker** and **Docker Compose** (for the PostGIS database) — install [Docker Desktop](https://www.docker.com/products/docker-desktop/) on Windows/macOS, or `docker` + `docker-compose-plugin` on Linux.
- (Optional) A **Google Distance Matrix API key** — only required if you want live commute estimates for the "fallback" (non-demo) search path. Without it, the app still works in **Booth Demo Mode** using a pre-computed route cache (see below).

## 1. Clone and inspect the project

```
git clone <repo-url>
cd full_code_v3
```

The two apps (`backend/`, `frontend/`) are independent and run as separate
processes on separate ports (backend on `8000`, frontend on `5173`).

## 2. Database setup (PostgreSQL + PostGIS via Docker)

### 2.1 Start the database container

A `docker-compose.yml` is provided at the repo root. It spins up a
PostGIS-enabled Postgres instance with sensible local defaults (user
`postgres` / password `postgres` / database `hybrid_routing`, exposed on port
`5432`).

From the repo root:

```
docker compose up -d
```

Check it's healthy:

```
docker compose ps
```

You should see `urbanfit_jobs_db` with a status of `healthy` (may take a few
seconds on first start). Data persists across restarts in a named Docker
volume (`db_data`), so you won't lose your loaded dataset just by stopping
the container.

Useful commands:

```
docker compose stop        # stop the container, keep data
docker compose up -d       # start it again
docker compose down        # stop and remove the container (keeps the volume/data)
docker compose down -v     # stop and remove the container AND wipe the data volume
```

You do **not** need to manually create the PostGIS extension or tables — the
bootstrap script (step 2.3) does that for you.

> If port `5432` is already in use on your machine (e.g. a local Postgres
> install), edit the `ports` mapping in `docker-compose.yml` (e.g.
> `"5433:5432"`) and update `DATABASE_URL` in `backend/.env` accordingly.

### 2.2 Configure the backend environment

```
cd backend
copy .env.example .env
```

Edit `backend/.env`:

```dotenv
# Async SQLAlchemy URL (asyncpg driver) pointing at the PostGIS-enabled
# database. These defaults match docker-compose.yml exactly — only change
# this if you edited the compose file's credentials/port.
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/hybrid_routing

# Google Distance Matrix API — only required for the live "fallback" commute
# estimation path. Leave blank to rely on Booth Demo Mode instead (see below).
GOOGLE_DISTANCE_MATRIX_API_KEY=
GOOGLE_DISTANCE_MATRIX_URL=https://maps.googleapis.com/maps/api/distancematrix/json

# Google Directions API — only used by the offline
# scripts/generate_route_cache.py script, not by the running app.
GOOGLE_API_KEY=

# Booth Demo Mode — when true, GET /search serves commute estimates from the
# pre-computed booth_route_cache.json instead of calling the live Google API.
# Set to true if you don't have a Google API key, or want deterministic/offline results.
BOOTH_DEMO_MODE=true
BOOTH_ROUTE_CACHE_PATH=booth_route_cache.json
```

> **Note:** `backend/.env` is git-ignored and never committed. If your friend
> is copying this project from you directly (rather than cloning fresh from
> git), make sure any real API key you share stays private — don't paste it
> into chats, issues, or commits.

### 2.3 Create a virtual environment and install dependencies

Still inside `backend/`:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2.4 Create tables and load the CSV datasets

With the venv active and `backend/.env` configured, run the bootstrap script
from the `backend/` directory:

```
python -m scripts.bootstrap_db
```

This will:
1. Run `CREATE EXTENSION IF NOT EXISTS postgis` on your database.
2. Create the four tables (`companies`, `job_postings`, `stations`, `demo_origins`) with their spatial (geography) columns.
3. Load the four CSVs from `datasets/` (companies, stations, mock job postings, demo routes), skipping any rows with invalid coordinates or dangling foreign keys.

You should see output like:

```
Loaded row counts:
  companies: <N>
  stations: <N>
  job_postings: <N>
  demo_origins: <N>
```

If you ever need to reset the schema and reload from scratch (**destructive —
drops all tables**):

```
python -m scripts.bootstrap_db --drop
```

## 3. Run the backend

From `backend/`, with the venv active:

```
uvicorn app.main:app --reload --port 8000
```

- API base URL: `http://127.0.0.1:8000`
- Health check: `http://127.0.0.1:8000/health`
- Interactive docs: `http://127.0.0.1:8000/docs`

CORS is pre-configured to allow the Vite dev server origins
(`http://localhost:5173`, `http://127.0.0.1:5173`, and a couple of common
alternates), so no changes are needed there for local development.

## 4. Configure and run the frontend

Open a **second terminal** (leave the backend running in the first):

```
cd frontend
copy .env.example .env
```

Edit `frontend/.env` if your backend runs somewhere other than the default:

```dotenv
# Base URL of the backend API used by the client. Defaults to
# http://localhost:8000 when unset.
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Install dependencies and start the dev server:

```
npm install
npm run dev
```

Vite will print the local URL (default `http://localhost:5173`). Open that in
your browser — the app should now be able to reach the backend at
`VITE_API_BASE_URL`.

## 5. Verifying everything works

1. Backend health check: visit `http://127.0.0.1:8000/health` and confirm `{"status":"ok"}`.
2. Backend search: visit `http://127.0.0.1:8000/docs`, try `GET /search` with a `lat`/`lng` inside Bangkok (e.g. `lat=13.7563&lng=100.5018`), and confirm you get job results back.
3. Frontend: open the app in the browser, perform a search, and confirm job results and the map render correctly.

## Environment variable reference

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Async Postgres connection string (`postgresql+asyncpg://user:pass@host:port/dbname`). |
| `GOOGLE_DISTANCE_MATRIX_API_KEY` | No | Enables live commute estimation for the fallback search path. Without it, fallback searches return HTTP 502 (exact-match/demo searches still work). Not needed if `BOOTH_DEMO_MODE=true`. |
| `GOOGLE_DISTANCE_MATRIX_URL` | No | Override for the Distance Matrix endpoint. Defaults to the standard Google endpoint. |
| `GOOGLE_API_KEY` | No | Used only by the offline `scripts/generate_route_cache.py` script (Directions API), not by the running app. |
| `BOOTH_DEMO_MODE` | No | `true`/`false`. When `true`, `/search` serves commute data from `booth_route_cache.json` instead of calling Google live. Defaults to `false`. |
| `BOOTH_ROUTE_CACHE_PATH` | No | Path to the pre-computed route cache JSON, relative to `backend/`. Defaults to `booth_route_cache.json`. |

### `frontend/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | Base URL the frontend uses to call the backend API. Defaults to `http://localhost:8000` if unset. |

## Troubleshooting

- **`connection refused` / database errors on bootstrap or startup** — confirm the container is up with `docker compose ps` (status should be `healthy`), and that `DATABASE_URL` in `backend/.env` matches the port/credentials in `docker-compose.yml`.
- **Port `5432` already in use when running `docker compose up -d`** — you likely have a local Postgres install or another container using that port. Either stop it, or remap the port in `docker-compose.yml` (e.g. `"5433:5432"`) and update `DATABASE_URL` to match.
- **`scripts.bootstrap_db` can't connect right after `docker compose up -d`** — the container may still be initializing; wait a few seconds for the healthcheck to pass (`docker compose ps`) and retry.
- **Need a clean slate** — `docker compose down -v` removes the container and its data volume, then `docker compose up -d` followed by `python -m scripts.bootstrap_db` recreates everything from scratch.
- **Frontend can't reach the backend (CORS or network errors)** — make sure the backend is running on the port referenced by `VITE_API_BASE_URL`, and that you're accessing the frontend from `http://localhost:5173` or `http://127.0.0.1:5173` (the origins allowed by backend CORS).
- **Fallback (non-demo) searches return HTTP 502** — either set `BOOTH_DEMO_MODE=true` in `backend/.env`, or supply a valid `GOOGLE_DISTANCE_MATRIX_API_KEY`.
