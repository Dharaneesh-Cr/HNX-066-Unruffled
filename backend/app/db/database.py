from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from ..core.config import DATABASE_PATH, DEMO_MODE

logger = logging.getLogger(__name__)

JSON_COLUMNS = {
    "persons": {"languages"},
    "candidate_matches": {"evidence", "warnings"},
}
BOOLEAN_COLUMNS = {
    "missing_cases": {"consented"},
    "affected_person_records": {"consented"},
    "notifications": {"is_read"},
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization_type TEXT NOT NULL CHECK (organization_type IN
        ('HOSPITAL','SHELTER','RESCUE_CENTER','RELIEF_CAMP','NGO','EMERGENCY_RESPONSE','OTHER')),
    contact_person_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('SEARCHER','FINDER','COMMAND_CENTER')),
    organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS photo_uploads (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS persons (
    id TEXT PRIMARY KEY,
    full_name TEXT,
    alias TEXT,
    age INTEGER CHECK (
        age IS NULL OR (typeof(age) = 'integer' AND age BETWEEN 0 AND 125)
    ),
    date_of_birth TEXT,
    gender TEXT,
    blood_group TEXT,
    languages TEXT,
    photo_path TEXT,
    height_cm REAL,
    weight_kg REAL,
    skin_tone TEXT,
    hair_color TEXT,
    hair_style TEXT,
    eye_color TEXT,
    body_build TEXT,
    scars TEXT,
    birthmarks TEXT,
    tattoos TEXT,
    distinguishing_marks TEXT,
    clothing_description TEXT,
    footwear TEXT,
    accessories TEXT,
    belongings TEXT,
    additional_description TEXT,
    medical_condition_summary TEXT,
    medication_information TEXT,
    immediate_care_required TEXT,
    accessibility_needs TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS missing_cases (
    id TEXT PRIMARY KEY,
    case_number TEXT NOT NULL UNIQUE,
    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    relationship_to_person TEXT NOT NULL,
    reporter_name TEXT NOT NULL,
    reporter_email TEXT,
    reporter_phone TEXT NOT NULL,
    preferred_contact_method TEXT NOT NULL DEFAULT 'Phone',
    last_seen_date TEXT NOT NULL,
    last_seen_time TEXT,
    last_seen_location TEXT NOT NULL,
    last_seen_circumstances TEXT,
    consented INTEGER NOT NULL DEFAULT 0 CHECK (consented IN (0,1)),
    status TEXT NOT NULL DEFAULT 'NEW',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS affected_person_records (
    id TEXT PRIMARY KEY,
    record_number TEXT NOT NULL UNIQUE,
    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    found_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    found_by_name TEXT NOT NULL,
    consented INTEGER NOT NULL DEFAULT 0 CHECK (consented IN (0,1)),
    facility_name TEXT,
    found_date TEXT NOT NULL,
    found_time TEXT,
    found_location TEXT NOT NULL,
    current_location TEXT NOT NULL,
    condition_status TEXT NOT NULL,
    additional_notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS candidate_matches (
    id TEXT PRIMARY KEY,
    missing_case_id TEXT NOT NULL REFERENCES missing_cases(id) ON DELETE CASCADE,
    affected_person_record_id TEXT NOT NULL REFERENCES affected_person_records(id) ON DELETE CASCADE,
    overall_similarity INTEGER NOT NULL CHECK (overall_similarity BETWEEN 0 AND 100),
    name_similarity INTEGER,
    age_similarity INTEGER,
    location_similarity INTEGER,
    description_similarity INTEGER,
    physical_similarity INTEGER,
    clothing_similarity INTEGER,
    image_similarity INTEGER,
    evidence TEXT NOT NULL DEFAULT '[]',
    warnings TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'POTENTIAL_MATCH',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (missing_case_id, affected_person_record_id)
);
CREATE TABLE IF NOT EXISTS case_updates (
    id TEXT PRIMARY KEY,
    missing_case_id TEXT NOT NULL REFERENCES missing_cases(id) ON DELETE CASCADE,
    updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    candidate_match_id TEXT NOT NULL REFERENCES candidate_matches(id) ON DELETE CASCADE,
    verifier_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    decision TEXT NOT NULL CHECK (decision IN ('VERIFIED','REJECTED')),
    notes TEXT,
    verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    missing_case_id TEXT REFERENCES missing_cases(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_missing_cases_reporter_created
    ON missing_cases(reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affected_org_created
    ON affected_person_records(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_case ON candidate_matches(missing_case_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_case ON case_updates(missing_case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
"""
AGE_INTEGER_GUARD_MIGRATION = """
CREATE TRIGGER IF NOT EXISTS persons_age_insert_guard
BEFORE INSERT ON persons
WHEN NEW.age IS NOT NULL
 AND (typeof(NEW.age) != 'integer' OR NEW.age < 0 OR NEW.age > 125)
BEGIN
    SELECT RAISE(ABORT, 'persons_age_check');
END;

CREATE TRIGGER IF NOT EXISTS persons_age_update_guard
BEFORE UPDATE OF age ON persons
WHEN NEW.age IS NOT NULL
 AND (typeof(NEW.age) != 'integer' OR NEW.age < 0 OR NEW.age > 125)
BEGIN
    SELECT RAISE(ABORT, 'persons_age_check');
END;
"""
MIGRATIONS = ((1, SCHEMA), (2, AGE_INTEGER_GUARD_MIGRATION))


@contextmanager
def _connection():
    path = Path(DATABASE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 15000")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with _connection() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )"""
        )
        applied = {
            row["version"]
            for row in connection.execute("SELECT version FROM schema_migrations")
        }
        for version, sql in MIGRATIONS:
            if version in applied:
                continue
            connection.executescript(sql)
            connection.execute(
                "INSERT INTO schema_migrations (version) VALUES (?)",
                (version,),
            )
            connection.execute(f"PRAGMA user_version = {version}")


def approve_pending_demo_finder_organizations() -> int:
    if not DEMO_MODE:
        return 0

    with _connection() as connection:
        cursor = connection.execute(
            """
            UPDATE organizations
            SET approval_status = 'APPROVED'
            WHERE approval_status = 'PENDING'
              AND id IN (
                  SELECT organization_id
                  FROM profiles
                  WHERE role = 'FINDER'
                    AND organization_id IS NOT NULL
              )
            """
        )
        approved_count = cursor.rowcount

    if approved_count:
        logger.info(
            "Local demo startup approval demo_mode=%s role=FINDER pending_organizations_approved=%s",
            DEMO_MODE,
            approved_count,
        )
    return approved_count


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _encode(table: str, key: str, value: Any) -> Any:
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if key in JSON_COLUMNS.get(table, set()) and value is not None:
        return json.dumps(value)
    if isinstance(value, bool):
        return int(value)
    return value


def _decode(table: str, row: dict[str, Any]) -> dict[str, Any]:
    for key in JSON_COLUMNS.get(table, set()):
        if row.get(key) is not None:
            try:
                row[key] = json.loads(row[key])
            except (TypeError, json.JSONDecodeError):
                row[key] = []
    for key in BOOLEAN_COLUMNS.get(table, set()):
        if key in row and row[key] is not None:
            row[key] = bool(row[key])
    return row


@dataclass
class QueryResult:
    data: list[dict[str, Any]]


class SQLiteQuery:
    def __init__(self, table: str):
        self.table = table
        self.operation = "select"
        self.columns = "*"
        self.values: dict[str, Any] = {}
        self.conditions: list[tuple[str, str, Any]] = []
        self.sort: list[tuple[str, bool]] = []
        self.row_limit: int | None = None

    def select(self, columns: str = "*") -> SQLiteQuery:
        self.operation, self.columns = "select", columns
        return self

    def insert(self, values: dict[str, Any]) -> SQLiteQuery:
        self.operation, self.values = "insert", values
        return self

    def update(self, values: dict[str, Any]) -> SQLiteQuery:
        self.operation, self.values = "update", values
        return self

    def delete(self) -> SQLiteQuery:
        self.operation = "delete"
        return self

    def eq(self, column: str, value: Any) -> SQLiteQuery:
        self.conditions.append((column, "=", value))
        return self

    def in_(self, column: str, values: list[Any]) -> SQLiteQuery:
        self.conditions.append((column, "IN", values))
        return self

    def order(self, column: str, *, desc: bool = False) -> SQLiteQuery:
        self.sort.append((column, desc))
        return self

    def limit(self, value: int) -> SQLiteQuery:
        self.row_limit = max(0, value)
        return self

    @staticmethod
    def _identifier(value: str) -> str:
        if not value.replace("_", "").isalnum():
            raise ValueError("Invalid database identifier")
        return f'"{value}"'

    def _where(self) -> tuple[str, list[Any]]:
        clauses: list[str] = []
        parameters: list[Any] = []
        for column, operator, value in self.conditions:
            quoted = self._identifier(column)
            if operator == "IN":
                items = list(value)
                if not items:
                    clauses.append("0")
                else:
                    clauses.append(f"{quoted} IN ({','.join('?' for _ in items)})")
                    parameters.extend(items)
            else:
                clauses.append(f"{quoted} {operator} ?")
                parameters.append(value)
        return (f" WHERE {' AND '.join(clauses)}" if clauses else ""), parameters

    def execute(self) -> QueryResult:
        table = self._identifier(self.table)
        with _connection() as connection:
            if self.operation == "insert":
                values = dict(self.values)
                values.setdefault("id", str(uuid4()))
                if "created_at" in _table_columns(connection, self.table):
                    values.setdefault("created_at", now())
                columns = list(values)
                sql = (
                    f"INSERT INTO {table} ({','.join(self._identifier(c) for c in columns)}) "
                    f"VALUES ({','.join('?' for _ in columns)})"
                )
                connection.execute(
                    sql, [_encode(self.table, key, values[key]) for key in columns]
                )
                row = connection.execute(
                    f"SELECT * FROM {table} WHERE id = ?", (values["id"],)
                ).fetchone()
                return QueryResult([_decode(self.table, dict(row))] if row else [])

            where, parameters = self._where()
            if self.operation == "select":
                selected = "*" if self.columns.strip() == "*" else ",".join(
                    self._identifier(column.strip()) for column in self.columns.split(",")
                )
                order = ""
                if self.sort:
                    order = " ORDER BY " + ",".join(
                        f"{self._identifier(column)} {'DESC' if descending else 'ASC'}"
                        for column, descending in self.sort
                    )
                limit = " LIMIT ?" if self.row_limit is not None else ""
                if self.row_limit is not None:
                    parameters.append(self.row_limit)
                rows = connection.execute(
                    f"SELECT {selected} FROM {table}{where}{order}{limit}", parameters
                ).fetchall()
                return QueryResult([_decode(self.table, dict(row)) for row in rows])

            if self.operation == "delete":
                returning = connection.execute(
                    f"SELECT * FROM {table}{where}", parameters
                ).fetchall()
                connection.execute(f"DELETE FROM {table}{where}", parameters)
                return QueryResult([_decode(self.table, dict(row)) for row in returning])

            if self.operation == "update":
                columns = list(self.values)
                if not columns:
                    return QueryResult([])
                assignments = [f"{self._identifier(key)} = ?" for key in columns]
                update_values = [
                    _encode(self.table, key, self.values[key]) for key in columns
                ]
                if "updated_at" in _table_columns(connection, self.table) and "updated_at" not in columns:
                    assignments.append('"updated_at" = ?')
                    update_values.append(now())
                connection.execute(
                    f"UPDATE {table} SET {','.join(assignments)}{where}",
                    [*update_values, *parameters],
                )
                returning = connection.execute(
                    f"SELECT * FROM {table}{where}", parameters
                ).fetchall()
                return QueryResult([_decode(self.table, dict(row)) for row in returning])
        raise ValueError("Unsupported database operation")


def _table_columns(connection: sqlite3.Connection, table: str) -> set[str]:
    return {
        row["name"]
        for row in connection.execute(f"PRAGMA table_info({SQLiteQuery._identifier(table)})")
    }


class SQLiteDatabase:
    def table(self, name: str) -> SQLiteQuery:
        return SQLiteQuery(name)


db = SQLiteDatabase()


def all_rows(table: str, *, columns: str = "*") -> list[dict[str, Any]]:
    return db.table(table).select(columns).execute().data


def get_row(table: str, row_id: str, *, columns: str = "*") -> dict[str, Any] | None:
    result = db.table(table).select(columns).eq("id", row_id).limit(1).execute().data
    return result[0] if result else None


def insert_row(table: str, value: dict[str, Any]) -> dict[str, Any]:
    result = db.table(table).insert(value).execute().data
    if not result:
        raise RuntimeError(f"SQLite insert returned no row for {table}")
    return result[0]


def update_row(table: str, row_id: str, value: dict[str, Any]) -> dict[str, Any]:
    result = db.table(table).update(value).eq("id", row_id).execute().data
    if not result:
        raise RuntimeError(f"SQLite update returned no row for {table}:{row_id}")
    return result[0]


def delete_row(table: str, row_id: str) -> None:
    db.table(table).delete().eq("id", row_id).execute()


def table_exists_and_readable(table: str) -> bool:
    db.table(table).select("id").limit(1).execute()
    return True
