
from pathlib import Path
import sqlite3

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASES = {
    "searcher": DATA_DIR / "searcher.db",
    "finder": DATA_DIR / "finder.db",
}

SCHEMAS = {
    "searcher": """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'searcher',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS missing_cases (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            missing_person_name TEXT NOT NULL,
            age INTEGER,
            description TEXT,
            last_seen_date TEXT,
            last_seen_location TEXT,
            contact_phone TEXT,
            photo_path TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """,
    "finder": """
        CREATE TABLE IF NOT EXISTS organizations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            organization_type TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            approval_status TEXT NOT NULL DEFAULT 'approved',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            organization_id TEXT,
            role TEXT NOT NULL DEFAULT 'finder',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id)
                REFERENCES organizations(id)
        );

        CREATE TABLE IF NOT EXISTS affected_person_records (
            id TEXT PRIMARY KEY,
            organization_id TEXT,
            person_name TEXT,
            age INTEGER,
            description TEXT,
            location TEXT,
            photo_path TEXT,
            verification_status TEXT NOT NULL DEFAULT 'unverified',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id)
                REFERENCES organizations(id)
        );

        CREATE TABLE IF NOT EXISTS case_updates (
            id TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            finder_user_id TEXT NOT NULL,
            update_text TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (finder_user_id) REFERENCES users(id)
        );
    """,
}

def main():
    for name, db_path in DATABASES.items():
        with sqlite3.connect(db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.executescript(SCHEMAS[name])
        print(f"{name.capitalize()} database ready: {db_path}")

if __name__ == "__main__":
    main()
