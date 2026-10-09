# Sahayaa Backend

FastAPI backend with local SQLite persistence, local password authentication, and private filesystem photo uploads. Supabase is not required at runtime.

## Windows PowerShell setup

From the repository root:

```powershell
Set-Location D:\Dharaneesh\Hackathons\UNX-066\backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -c "from app.db.database import initialize_database; initialize_database()"
uvicorn app.main:app --reload
```

The database initializes automatically on backend startup at `backend\sahayaa.db`; the explicit initialization command is optional and safe to repeat. API docs: <http://localhost:8000/docs>. Health: <http://localhost:8000/health> and <http://localhost:8000/api/health/database>.

## Local Finder demo mode

By default, newly registered Finder organizations remain `PENDING` and require approval with the local operator command below. For isolated local hackathon testing with synthetic accounts only, opt in explicitly:

```powershell
Set-Location D:\Dharaneesh\Hackathons\UNX-066\backend
Copy-Item .env.example .env
# Edit backend\.env and set SAHAYAA_DEMO_MODE=true
uvicorn app.main:app --reload
```

The backend loads `backend\.env` from the backend directory at startup. With `SAHAYAA_DEMO_MODE=true`, newly registered organizations are saved as `APPROVED`; existing `PENDING` organizations attached to Finder profiles are also persisted as `APPROVED` during startup. As a fallback for organizations made pending while the server is already running, an authenticated Finder login/profile refresh promotes that organization's `PENDING` status in SQLite. The frontend then refreshes the displayed organization profile, and protected routes read the persisted status. `REJECTED` organizations are never auto-approved. This does not create administrator accounts or allow unauthenticated users to approve organizations. To return to the normal workflow, set the value back to `false` and restart the backend. Demo mode is off by default and must only be used on a local test server with fictional data; do not enable it on a public or production server.

## Local storage and schema upgrades

SQLite uses only Python's built-in `sqlite3`. Tables, indexes, foreign keys, checks, and the `schema_migrations` ledger are initialized by `app/db/database.py`. The initializer is idempotent and records schema versions 1 and 2; version 2 adds insert/update triggers to enforce integer ages from 0 through 125 on databases created with the earlier range-only CHECK. Future schema changes must be appended as new ordered entries in `MIGRATIONS`. These upgrades do not drop tables or remove data. Keep `backend\sahayaa.db`, its journal files, `backend\uploads\`, and `backend\.jwt_secret` private and out of source control.

Created tables:

- `users` and `profiles` for account credentials and role profiles.
- `organizations` for Finder organization details and approval status.
- `persons`, `missing_cases`, and `affected_person_records` for reunification records.
- `photo_uploads` for local image path and upload metadata.
- `candidate_matches`, `verifications`, `case_updates`, and `notifications` for matching and workflow history.
- `schema_migrations` for local schema version tracking.

Person age is constrained to 0–125 inclusive, matching the frontend and Pydantic request validation. `lastSeenDate`, `foundDate`, and date-like record fields use ISO `YYYY-MM-DD` strings after request validation. SQLite foreign keys are enabled on every application connection.

## Authentication and authorization

`POST /api/auth/register/searcher` and `POST /api/auth/register/organization` create local accounts. A newly registered Searcher can sign in immediately. A Finder can sign in immediately after applying; in the default mode, its `PENDING` status is shown while protected Finder API operations remain blocked until approval. Local demo mode, described above, approves only newly registered organizations. Rejected organizations cannot access protected Finder operations. Passwords are hashed with the standard library's scrypt key derivation function (random per-password salt and fixed work parameters); plaintext passwords are never persisted. `POST /api/auth/login` issues an HS256 JWT valid for one hour. The signing key is generated locally at `backend\.jwt_secret` and is ignored by Git. Losing this key invalidates existing sessions; users must sign in again.

Role and record ownership are checked by FastAPI for every protected request. Outside explicit local demo mode, public organization registration creates a `PENDING` organization, and protected Finder requests are denied until a trusted local operator approves it. There is no public role-selection or approval API.

Use trusted local administrative commands from `backend`:

```powershell
python -m app.admin create-command-center
python -m app.admin approve-organization ORGANIZATION_ID
```

The first command prompts securely for a password and creates a fixed `COMMAND_CENTER` role; it does not accept a user-selected role. The second displays the organization and requires typing `APPROVE`. Run these only on the machine where the SQLite database is stored. Finder approval enables the Finder role only for the approved organization's own records.

After creating a coordinator account, sign in at `/command/login`. That login is not linked from the public portal selector; command-center accounts can only be created by the local administrative command.

This local setup is intended for development or a controlled single-host deployment. JWTs are bearer credentials; use HTTPS if exposed beyond localhost, protect the database and signing-key files with OS permissions, back them up securely, and do not commit them. There is no password-reset/email-confirmation flow, token revocation, rate limiting, multi-host coordination, or production hardened browser session support.

## Photos and sensitive data

`POST /api/photos` validates supported image content and file signatures, limits uploads to 10 MB, and stores image files below `backend\uploads\persons\<owner-id>\`. SQLite stores the relative path, owner ID, MIME type, and byte size; image bytes are not placed in SQLite. `/api/photos/signed-url` checks record authorization before returning a one-hour HMAC-signed local URL. Medical/accessibility fields are omitted from ordinary collection responses and returned only by authorized affected-person detail routes.

## Frontend

The frontend defaults to `http://localhost:8000/api`. To override this, create `frontend\.env.local` with:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

Vite variables are public; do not place secrets there.

From another PowerShell window:

```powershell
Set-Location D:\Dharaneesh\Hackathons\UNX-066\frontend
npm ci
npm run dev
```

Open <http://localhost:5173>.

## Tests

From `backend` with its virtual environment activated:

```powershell
python -m unittest discover -s tests -v
python -m compileall -q app tests
```

Tests use temporary SQLite files and fictional records; they do not touch a production or existing database.

## Existing Supabase data

Switching the application to SQLite does not delete or modify Supabase data, and the new local database starts empty. No remote data or passwords are imported automatically. Preserve the Supabase project until a separately reviewed migration is complete.

For an explicit manual data export, use the Supabase Dashboard's Table Editor export-to-CSV for `organizations`, `users`/`profiles` metadata as applicable, `persons`, `missing_cases`, `affected_person_records`, `candidate_matches`, `case_updates`, `verifications`, and `notifications`. Keep the export in a private encrypted location, restrict access, and never export password material or service-role credentials. Import parent records before dependent records in this order: organizations; local user accounts and profiles; persons; missing cases and affected-person records; matches; updates, verifications, and notifications. Preserve IDs only after reconciling Supabase Auth user IDs to newly registered local accounts; replace `reporter_user_id`, `found_by_user_id`, profile IDs and verifier IDs with the corresponding local IDs. Re-upload images through the local photo endpoint rather than copying cloud storage URLs into `photo_path`. Review required fields, age constraints, and each row before importing; test first against a separate copy of the SQLite file. Do not use `INSERT OR REPLACE`, which can overwrite local records or cascade-delete linked rows. Existing Supabase passwords cannot be transferred as local scrypt hashes; users must register or receive a separately designed password-reset process.
