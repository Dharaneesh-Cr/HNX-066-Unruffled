from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import jwt
from fastapi import HTTPException
from jwt import InvalidTokenError

from ..core.config import (
    JWT_ALGORITHM,
    JWT_LIFETIME_SECONDS,
    JWT_SECRET_PATH,
)
from ..db.database import db, get_row, insert_row

_SCRYPT_N = 2**15
_SCRYPT_R = 8
_SCRYPT_P = 1
logger = logging.getLogger(__name__)


def _signing_key() -> str:
    path = Path(JWT_SECRET_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        return path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        key = secrets.token_urlsafe(48)
        try:
            with path.open("x", encoding="utf-8") as secret_file:
                secret_file.write(key)
        except FileExistsError:
            return path.read_text(encoding="utf-8").strip()
        return key


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=64,
        maxmem=64 * 1024 * 1024,
    )
    return "scrypt${}${}${}${}${}".format(
        _SCRYPT_N,
        _SCRYPT_R,
        _SCRYPT_P,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def verify_password(password_hash: str, password: str) -> bool:
    try:
        algorithm, n, r, p, salt_value, expected_value = password_hash.split("$")
        if (
            algorithm != "scrypt"
            or int(n) != _SCRYPT_N
            or int(r) != _SCRYPT_R
            or int(p) != _SCRYPT_P
        ):
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
        expected = base64.urlsafe_b64decode(expected_value.encode("ascii"))
        if len(salt) != 16 or len(expected) != 64:
            return False
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
            maxmem=64 * 1024 * 1024,
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError, MemoryError):
        return False


def register_local_user(email: str, password: str) -> str:
    user_id = str(uuid4())
    insert_row(
        "users",
        {
            "id": user_id,
            "email": email.strip().lower(),
            "password_hash": hash_password(password),
        },
    )
    return user_id


def issue_access_token(user_id: str) -> tuple[str, int]:
    issued = datetime.now(timezone.utc)
    expires = issued + timedelta(seconds=JWT_LIFETIME_SECONDS)
    token = jwt.encode(
        {"sub": user_id, "iat": issued, "exp": expires},
        _signing_key(),
        algorithm=JWT_ALGORITHM,
    )
    return token, int(expires.timestamp())


def decode_access_token(token: str) -> str:
    try:
        claims = jwt.decode(token, _signing_key(), algorithms=[JWT_ALGORITHM])
        subject = claims.get("sub")
        if not isinstance(subject, str) or not subject:
            raise InvalidTokenError("Missing subject")
        return subject
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token") from exc


def authenticate_local_user(email: str, password: str) -> tuple[dict, dict]:
    normalized_email = email.strip().lower()
    user = (
        db.table("users")
        .select("*")
        .eq("email", normalized_email)
        .limit(1)
        .execute()
        .data
    )
    if not user:
        logger.info("Local authentication rejected: stage=account_not_found")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    password_hash = user[0]["password_hash"]
    if not password_hash.startswith("scrypt$"):
        logger.warning("Local authentication rejected: stage=unsupported_password_hash")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(password_hash, password):
        logger.info("Local authentication rejected: stage=password_verification_failed")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    profile = get_row("profiles", user[0]["id"])
    if not profile:
        logger.warning("Local authentication rejected: stage=profile_not_found")
        raise HTTPException(status_code=403, detail="Application profile not found")
    logger.info("Local authentication accepted: stage=credentials_and_profile_valid")
    return user[0], profile
