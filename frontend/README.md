# Sahayaa Frontend

React, TypeScript, and Vite client for the local Sahayaa FastAPI service.

## Run on Windows

Start the backend first as described in [backend/README.md](../backend/README.md), then from a second PowerShell window:

```powershell
Set-Location D:\Dharaneesh\Hackathons\UNX-066\frontend
npm ci
npm run dev
```

Vite serves the app at <http://localhost:5173>. The API defaults to `http://localhost:8000/api`; optionally set `VITE_API_BASE_URL` in `frontend\.env.local` to change it. Do not put secrets in Vite variables.

## Authentication and data

Login and registration use the local FastAPI API. Access tokens are stored in `sessionStorage` for the current tab. The backend stores only one-way password hashes in SQLite. Finder organization applications remain unavailable to Finder APIs until a local operator approves them using `python -m app.admin approve-organization ORGANIZATION_ID` from `backend`.

Photos upload to the backend's private local uploads directory and are referenced by SQLite metadata. The frontend does not store database records or credentials in `localStorage`.
