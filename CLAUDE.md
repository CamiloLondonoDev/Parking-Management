# Parking-Management

Parking-management web app: a static HTML/JS frontend, being migrated from `localStorage` to a Node + TypeScript API backed by SQL Server. Its end-to-end tests live in the sibling repo `Autos-Colombia-E2E`.

## Current state
- Frontend: plain HTML in `HTML/` and scripts in `JS/` (no build step). Entry point is `index.html`, which redirects to `HTML/login.html`.
- Data: still stored in the browser (`localStorage`). A real API and database are being added (see Planned).
- Deployment: GitHub Pages via `.github/workflows/deploy-pages.yml`. After a successful deploy it dispatches an `app-deployed` event to the E2E repo.

## Planned layout
- `api/` — Node + TypeScript API (routes, services, db, middleware), plain SQL with versioned migrations
- `docker-compose.yml` — SQL Server 2022 for local development and CI
- `migrations/` and a seed script (idempotent)
- `openapi.yaml` — API contract
- `JS/api.js` — thin `fetch` wrapper that replaces `localStorage` access, with a configurable `API_BASE_URL`

## Commands
Frontend (serve statically, no build):
- `npx http-server . -p 8080` — serve the app locally

API and database (once `api/` exists, update this section):
- `docker compose up -d` — start SQL Server
- `npm run migrate` and `npm run seed` — apply migrations and seed data
- `npm run dev` — start the API

## Business rules
- Fee per hour / per day: Car and Pickup 3000 / 25000, Motorcycle 2000 / 15000, Van 4000 / 30000 (COP).
- Hours are rounded up (`Math.ceil`).
- Once the API exists, the fee is calculated on the server; the client only displays it.
- Roles: Administrator and Operator. Only an Administrator manages users.
- Seed users: Carlos (Administrator), María (Operator).

## Conventions
- All code, comments, commit messages and docs are in English.
- Do not rename or remove any `data-testid`. The E2E repo depends on them. Naming is `<page>-<element>-<type>` (sidebar elements are unprefixed). If you add UI, add `data-testid` attributes following that pattern.
- Never put secrets in the repo. Use `.env` (ignored) and commit `.env.example`.
- SQL must be parameterized; never build queries by string concatenation.
- Passwords are stored hashed, never in clear text.
- `NODE_ENV=test`-only endpoints (for example a data reset) must be disabled in any deployed environment.

## Environments
- Local and CI: docker compose, ephemeral data.
- Demo: GitHub Pages (frontend), Render free tier (API), Azure SQL free offer (database). The API can take about a minute to wake up after idling.
- CI never runs against the demo; only a post-deploy smoke test does.

## Git
- Work on feature branches and open a pull request; do not push directly to `main`.
- Keep commits small, in the imperative mood (for example `Add login endpoint`).
- Do not mix frontend migration changes with unrelated refactors in the same pull request.
