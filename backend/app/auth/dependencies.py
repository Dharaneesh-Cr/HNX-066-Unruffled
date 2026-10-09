from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Callable

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..core.config import DEMO_MODE
from ..db.database import db, get_row
from .local_auth import decode_access_token

bearer_scheme = HTTPBearer(auto_error=True)
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CurrentPrincipal:
    user_id: str
    email: str | None
    profile: dict[str, Any]


def get_authenticated_principal(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentPrincipal:
    user_id = decode_access_token(credentials.credentials)
    user = get_row("users", user_id, columns="id, email")
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
    profile = get_row(
        "profiles",
        user_id,
        columns="id, role, organization_id, full_name, phone",
    )
    if not profile:
        raise HTTPException(status_code=403, detail="Application profile not found")

    role = profile.get("role")
    if role not in {"SEARCHER", "FINDER", "COMMAND_CENTER"}:
        raise HTTPException(status_code=403, detail="User role is not authorized")
    return CurrentPrincipal(user_id=user_id, email=user["email"], profile=profile)


def get_current_principal(
    principal: CurrentPrincipal = Depends(get_authenticated_principal),
) -> CurrentPrincipal:
    if principal.profile.get("role") == "FINDER":
        _require_approved_finder_organization(
            principal.profile.get("organization_id"),
            role=principal.profile["role"],
        )
    return principal


def resolve_finder_organization_status(organization_id: str | None) -> str | None:
    if not organization_id:
        return None

    organization = get_row("organizations", organization_id, columns="approval_status")
    if organization is None:
        return None

    status = str(organization.get("approval_status") or "").strip().upper()
    if DEMO_MODE and status == "PENDING":
        updated = (
            db.table("organizations")
            .update({"approval_status": "APPROVED"})
            .eq("id", organization_id)
            .eq("approval_status", "PENDING")
            .execute()
            .data
        )
        if updated:
            status = str(updated[0].get("approval_status") or "").strip().upper()
        else:
            current = get_row("organizations", organization_id, columns="approval_status")
            status = str((current or {}).get("approval_status") or "").strip().upper()
        logger.info(
            "Finder demo approval resolved demo_mode=%s role=FINDER organization_id=%s organization_status=%s reason=%s",
            DEMO_MODE,
            organization_id,
            status or "MISSING",
            "pending_organization_approved" if status == "APPROVED" else "approval_update_not_applied",
        )
    return status or None


def _require_approved_finder_organization(
    organization_id: str | None,
    *,
    role: str,
) -> None:
    status = resolve_finder_organization_status(organization_id)
    if status == "APPROVED":
        return

    if not organization_id:
        reason = "organization_id_missing"
        detail = "Finder account has no organization"
    elif status == "REJECTED":
        reason = "organization_rejected"
        detail = "Organization registration was not approved"
    elif status == "PENDING":
        reason = "organization_pending"
        detail = "Organization registration is pending approval"
    else:
        reason = "organization_not_found"
        detail = "Finder organization profile was not found"

    logger.warning(
        "Finder authorization denied demo_mode=%s role=%s organization_id=%s organization_status=%s reason=%s",
        DEMO_MODE,
        role,
        organization_id or "MISSING",
        status or "MISSING",
        reason,
    )
    raise HTTPException(status_code=403, detail=detail)


def require_roles(*allowed_roles: str) -> Callable[..., CurrentPrincipal]:
    allowed = set(allowed_roles)

    def dependency(
        principal: CurrentPrincipal = Depends(get_current_principal),
    ) -> CurrentPrincipal:
        if principal.profile.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient role permissions")
        return principal

    return dependency


require_searcher = require_roles("SEARCHER", "COMMAND_CENTER")
require_finder = require_roles("FINDER", "COMMAND_CENTER")
require_command_center = require_roles("COMMAND_CENTER")
