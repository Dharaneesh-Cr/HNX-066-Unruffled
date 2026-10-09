from __future__ import annotations
import re
import logging
import sqlite3
from typing import Any
from ..core.config import DEMO_MODE, AUTO_APPROVE_FINDER_ORGS

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from ..auth.dependencies import (
    CurrentPrincipal,
    get_authenticated_principal,
    get_current_principal,
    resolve_finder_organization_status,
    require_command_center,
    require_finder,
    require_searcher,
)
from ..auth.local_auth import authenticate_local_user, issue_access_token, register_local_user
from ..core.config import DEMO_MODE
from ..db.database import db, delete_row, get_row, insert_row, now, update_row
from ..schemas import (
    AffectedPersonCreate,
    FinderOrganizationRegistrationRequest,
    LoginRequest,
    MissingCaseCreate,
    SearcherRegistrationRequest,
)
from ..services.photo_service import (
    content_type_for_photo,
    create_signed_url,
    upload_photo,
    verify_local_photo_signature,
)
from ..services.matching_service import generate_candidate_matches_for_affected, generate_candidate_matches_for_case
from ..services.records_service import (
    affected_person_response,
    create_affected_person,
    create_missing_case,
    create_finder_organization_application,
    create_searcher_profile,
    get_affected_person,
    get_missing_case,
    list_affected_people,
    list_missing_cases,
    missing_case_response,
    update_affected_person,
    update_missing_case,
)

router = APIRouter()
logger = logging.getLogger(__name__)
PHOTO_PATH_PATTERN = re.compile(r"persons/[^/]+/[0-9a-f]{32}\.(?:jpg|jpeg|png|webp)")


def _database_write_error(exc: Exception, operation: str) -> HTTPException:
    logger.error("%s failed (%s)", operation, type(exc).__name__)
    if isinstance(exc, sqlite3.IntegrityError) and "UNIQUE constraint failed" in str(exc):
        return HTTPException(status_code=409, detail="A record with these details already exists")
    return HTTPException(
        status_code=500,
        detail="The local database could not save this request. Check the submitted data and database file permissions.",
    )


def _assert_finder_organization_identity(
    organization_id: str,
    organization_name: str,
    organization_type: str,
) -> dict[str, str]:
    try:
        result = (
            db.table("organizations")
            .select("name, organization_type, approval_status")
            .eq("id", organization_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.warning("Finder organization lookup failed: stage=database_read_failed")
        raise HTTPException(status_code=503, detail="Unable to verify Finder organization") from exc

    if not result.data:
        logger.info("Finder login rejected: stage=organization_not_found")
        raise HTTPException(status_code=403, detail="Finder organization profile was not found")

    organization = result.data[0]
    stored_name = " ".join(str(organization.get("name") or "").split()).casefold()
    submitted_name = " ".join(organization_name.split()).casefold()
    stored_type = re.sub(r"[^A-Z0-9]+", "_", str(organization.get("organization_type") or "").upper()).strip("_")
    if stored_name != submitted_name or stored_type != organization_type:
        logger.info(
            "Finder login rejected demo_mode=%s role=FINDER organization_id=%s organization_status=%s reason=organization_identity_mismatch",
            DEMO_MODE,
            organization_id,
            str(organization.get("approval_status") or "MISSING").strip().upper(),
        )
        raise HTTPException(status_code=403, detail="Organization details do not match this account")
    approval_status = resolve_finder_organization_status(organization_id) or "PENDING"
    if approval_status == "REJECTED":
        logger.info(
            "Finder login rejected demo_mode=%s role=FINDER organization_id=%s organization_status=%s reason=organization_rejected",
            DEMO_MODE,
            organization_id,
            approval_status,
        )
        raise HTTPException(status_code=403, detail="Organization registration was not approved")
    return {
        "approvalStatus": approval_status,
        "organizationName": str(organization.get("name") or ""),
        "organizationType": str(organization.get("organization_type") or ""),
    }


@router.post("/auth/register/searcher", status_code=201)
def register_searcher(payload: SearcherRegistrationRequest):
    try:
        user_id = register_local_user(payload.email, payload.password)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
    try:
        create_searcher_profile(user_id, payload.fullName)
    except Exception as exc:
        delete_row("users", user_id)
        raise HTTPException(
            status_code=500,
            detail="The account profile could not be saved. Please try again.",
        ) from exc
    return {
        "userId": user_id,
        "emailConfirmationRequired": False,
        "message": "Account created. You can now sign in.",
    }


@router.post("/auth/register/organization", status_code=201)
def register_finder_organization(payload: FinderOrganizationRegistrationRequest):
    try:
        user_id = register_local_user(payload.email, payload.password)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
    try:
        approval_status = (
        "APPROVED" if AUTO_APPROVE_FINDER_ORGS else "PENDING"
        )
        organization = create_finder_organization_application(
            user_id,
            organization_name=payload.organizationName,
            organization_type=payload.organizationType,
            contact_person_name=payload.contactPersonName,
            email=payload.email,
            phone=payload.phone,
            location=payload.location,
            approval_status=approval_status,
        )
    except Exception as exc:
        delete_row("users", user_id)
        raise _database_write_error(exc, "Finder organization registration") from exc
    return {
        "userId": user_id,
        "organizationId": organization["id"],
        "approvalStatus": approval_status,
        "emailConfirmationRequired": False,
        "message": (
            "Organization registered and approved for local demo mode."
            if DEMO_MODE
            else "Organization registration is pending approval."
        ),
    }


@router.post("/auth/login")
def auth_login(payload: LoginRequest):
    user, profile = authenticate_local_user(payload.email, payload.password)
    expected_role = {
        "searcher": "SEARCHER",
        "finder": "FINDER",
        "command_center": "COMMAND_CENTER",
    }[payload.portal]
    if profile.get("role") != expected_role:
        logger.info("Local login rejected: stage=portal_role_mismatch")
        raise HTTPException(status_code=403, detail="This account is not authorized for that portal")
    if expected_role == "FINDER" and not profile.get("organization_id"):
        logger.warning("Finder login rejected: stage=organization_profile_missing")
        raise HTTPException(status_code=403, detail="Finder account has no authorized organization")
    organization_details = None
    if expected_role == "FINDER":
        organization_details = _assert_finder_organization_identity(
            profile["organization_id"],
            payload.organizationName,
            payload.organizationType,
        )

    token, expires_at = issue_access_token(user["id"])
    return {
        "accessToken": token,
        "expiresAt": expires_at,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": profile.get("full_name") or user["email"],
            "role": profile["role"],
            "organizationId": profile.get("organization_id"),
            "approvalStatus": organization_details.get("approvalStatus") if organization_details else None,
            "organizationName": organization_details.get("organizationName") if organization_details else None,
            "organizationType": organization_details.get("organizationType") if organization_details else None,
        },
    }


@router.get("/auth/me")
def auth_me(principal: CurrentPrincipal = Depends(get_authenticated_principal)):
    approval_status = None
    if principal.profile.get("role") == "FINDER":
        organization = get_row(
            "organizations",
            principal.profile.get("organization_id") or "",
            columns="name, organization_type, approval_status",
        )
        approval_status = resolve_finder_organization_status(
            principal.profile.get("organization_id")
        )
        organization_name = organization.get("name") if organization else None
        organization_type = organization.get("organization_type") if organization else None
    else:
        organization_name = None
        organization_type = None
    return {
        "userId": principal.user_id,
        "email": principal.email,
        "name": principal.profile.get("full_name") or principal.email,
        "role": principal.profile.get("role"),
        "organizationId": principal.profile.get("organization_id"),
        "approvalStatus": approval_status,
        "organizationName": organization_name,
        "organizationType": organization_type,
    }



def require(table: str, row_id: str) -> dict[str, Any]:
    item = get_row(table, row_id)
    if not item:
        label = table.rstrip("s").replace("_", " ").title()
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return item


def can_access_missing_case(principal: CurrentPrincipal, case: dict[str, Any]) -> bool:
    role = principal.profile["role"]
    return role in {"FINDER", "COMMAND_CENTER"} or case.get("reporter_user_id") == principal.user_id


def can_access_affected_record(principal: CurrentPrincipal, record: dict[str, Any]) -> bool:
    role = principal.profile["role"]
    if role == "COMMAND_CENTER":
        return True
    return role == "FINDER" and (
        principal.profile.get("organization_id") is not None
        and record.get("organization_id") == principal.profile.get("organization_id")
    )


def require_match_reviewer(
    principal: CurrentPrincipal = Depends(get_current_principal),
) -> CurrentPrincipal:
    if principal.profile["role"] == "COMMAND_CENTER":
        return principal
    if principal.profile["role"] == "FINDER" and DEMO_MODE:
        return principal
    raise HTTPException(status_code=403, detail="Command Center access required to review candidate matches")


def _assert_missing_access(principal: CurrentPrincipal, case_id: str) -> dict[str, Any]:
    case = require("missing_cases", case_id)
    if not can_access_missing_case(principal, case):
        raise HTTPException(status_code=403, detail="You are not authorized to access this case")
    return case


def _assert_affected_access(principal: CurrentPrincipal, record_id: str) -> dict[str, Any]:
    record = require("affected_person_records", record_id)
    if not can_access_affected_record(principal, record):
        raise HTTPException(status_code=403, detail="You are not authorized to access this record")
    return record


def _assert_uploaded_photo_owner(payload: dict[str, Any], user_id: str) -> None:
    profile = payload.get("profile") or {}
    photo_path = profile.get("photoPath")
    if photo_path and (
        not PHOTO_PATH_PATTERN.fullmatch(photo_path)
        or not photo_path.startswith(f"persons/{user_id}/")
    ):
        raise HTTPException(status_code=403, detail="Photo was not uploaded by this account")


@router.get("/missing-cases")
def list_cases(principal: CurrentPrincipal = Depends(get_current_principal)):
    # SEARCHER sees only their own cases. FINDER and COMMAND_CENTER can access
    # network cases needed for coordination/matching.
    if principal.profile["role"] in {"FINDER", "COMMAND_CENTER"}:
        rows = (
            db.table("missing_cases")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        ).data or []
    else:
        rows = (
            db.table("missing_cases")
            .select("*")
            .eq("reporter_user_id", principal.user_id)
            .order("created_at", desc=True)
            .execute()
        ).data or []

    return [missing_case_response(row) for row in rows]


@router.get("/missing-cases/{id}")
def get_case(id: str, principal: CurrentPrincipal = Depends(get_current_principal)):
    case = _assert_missing_access(principal, id)
    return get_missing_case(case["id"])


@router.post("/missing-cases", status_code=201)
def create_case(
    payload: MissingCaseCreate,
    principal: CurrentPrincipal = Depends(require_searcher),
):
    try:
        data = payload.model_dump(exclude_none=True, mode="json")
        _assert_uploaded_photo_owner(data, principal.user_id)
        data["reporterEmail"] = principal.email
        result = create_missing_case(data, principal.user_id)
        try:
            generate_candidate_matches_for_case(result["id"])
        except Exception as matching_error:
            logger.warning(
                "Candidate generation failed after missing case creation (%s)",
                type(matching_error).__name__,
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise _database_write_error(exc, "Missing case creation") from exc


@router.patch("/missing-cases/{id}")
def update_case(
    id: str,
    payload: dict[str, Any],
    principal: CurrentPrincipal = Depends(get_current_principal),
):
    before = _assert_missing_access(principal, id)

    # SEARCHER may edit their own case. COMMAND_CENTER may update any case.
    # FINDER is not allowed to modify case ownership/reporter information.
    if principal.profile["role"] == "FINDER":
        raise HTTPException(status_code=403, detail="Finder accounts cannot edit missing cases")

    try:
        result = update_missing_case(id, payload)
        if result is None:
            raise HTTPException(status_code=404, detail="Missing case not found")

        old_status = before.get("status")
        new_status = result.get("status")
        if new_status != old_status:
            insert_row(
                "case_updates",
                {
                    "missing_case_id": id,
                    "updated_by_user_id": principal.user_id,
                    "event_type": "STATUS_CHANGED",
                    "title": "Case status updated",
                    "description": f"Status changed from {old_status or 'UNKNOWN'} to {new_status}",
                },
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to update missing case") from exc


@router.get("/affected-persons")
def list_affected(principal: CurrentPrincipal = Depends(get_current_principal)):
    if principal.profile["role"] == "COMMAND_CENTER":
        records = (
            db.table("affected_person_records")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        ).data or []
    elif principal.profile["role"] == "FINDER":
        if not principal.profile.get("organization_id"):
            raise HTTPException(status_code=403, detail="Finder account has no authorized organization")
        query = (
            db.table("affected_person_records")
            .select("*")
            .order("created_at", desc=True)
        )
        records = query.eq("organization_id", principal.profile["organization_id"]).execute().data or []
    else:
        raise HTTPException(status_code=403, detail="Searcher access to affected-person records is not permitted")

    return [affected_person_response(r) for r in records]


@router.get("/affected-persons/{id}")
def get_affected(id: str, principal: CurrentPrincipal = Depends(get_current_principal)):
    record = _assert_affected_access(principal, id)
    return get_affected_person(record["id"])


@router.post("/affected-persons")
def create_affected(
    payload: AffectedPersonCreate,
    principal: CurrentPrincipal = Depends(require_finder),
):
    try:
        own_org = principal.profile.get("organization_id")
        if not own_org:
            raise HTTPException(status_code=403, detail="Account has no authorized organization")
        data = payload.model_dump(exclude_none=True, mode="json")
        _assert_uploaded_photo_owner(data, principal.user_id)
        result = create_affected_person(data, principal.user_id, own_org)
        try:
            generate_candidate_matches_for_affected(result["id"])
        except Exception as matching_error:
            logger.warning(
                "Candidate generation failed after affected-person creation (%s)",
                type(matching_error).__name__,
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to create affected-person record") from exc


@router.patch("/affected-persons/{id}")
def update_affected(
    id: str,
    payload: dict[str, Any],
    principal: CurrentPrincipal = Depends(get_current_principal),
):
    record = _assert_affected_access(principal, id)
    if principal.profile["role"] not in {"FINDER", "COMMAND_CENTER"}:
        raise HTTPException(status_code=403, detail="Finder or Command Center access required")
    if principal.profile["role"] == "FINDER" and "organizationId" in payload:
        if payload["organizationId"] != principal.profile.get("organization_id"):
            raise HTTPException(status_code=403, detail="Cannot move a record to another organization")

    try:
        result = update_affected_person(record["id"], payload)
        if result is None:
            raise HTTPException(status_code=404, detail="Affected person not found")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to update affected-person record") from exc


@router.post("/photos")
async def photo_upload(
    file: UploadFile = File(...),
    principal: CurrentPrincipal = Depends(get_current_principal),
):
    return await upload_photo(file, principal.user_id)


@router.get("/photos/signed-url")
def signed_url(
    path: str = Query(...),
    principal: CurrentPrincipal = Depends(get_current_principal),
):
    if not path.startswith("persons/") or "/../" in path or "\\" in path:
        raise HTTPException(status_code=400, detail="Invalid photo path")
    persons = db.table("persons").select("id").eq("photo_path", path).limit(1).execute().data or []
    if not persons:
        raise HTTPException(status_code=404, detail="Photo not found")
    person_id = persons[0]["id"]
    if principal.profile["role"] == "COMMAND_CENTER":
        return create_signed_url(path)
    if principal.profile["role"] == "SEARCHER":
        allowed = db.table("missing_cases").select("id").eq("person_id", person_id).eq("reporter_user_id", principal.user_id).limit(1).execute().data or []
    else:
        query = db.table("affected_person_records").select("id").eq("person_id", person_id)
        if principal.profile.get("organization_id"):
            allowed = query.eq("organization_id", principal.profile["organization_id"]).limit(1).execute().data or []
        else:
            allowed = query.eq("found_by_user_id", principal.user_id).limit(1).execute().data or []
    if not allowed:
        raise HTTPException(status_code=403, detail="You are not authorized to access this photo")
    return create_signed_url(path)


@router.get("/photos/local")
def local_photo(
    path: str = Query(...),
    expires: int = Query(...),
    signature: str = Query(...),
):
    target = verify_local_photo_signature(path, expires, signature)
    return FileResponse(target, media_type=content_type_for_photo(target))


def _match_response(match: dict[str, Any]) -> dict[str, Any]:
    # DB statuses are canonical. The UI still receives its existing
    # PENDING/IN_PROGRESS/COMPLETE verification vocabulary.
    verification_map = {
        "POTENTIAL_MATCH": "PENDING",
        "UNDER_VERIFICATION": "IN_PROGRESS",
        "VERIFIED": "COMPLETE",
        "REJECTED": "REJECTED",
        "PENDING": "PENDING",
        "IN_PROGRESS": "IN_PROGRESS",
        "COMPLETE": "COMPLETE",
    }
    breakdown = {
        "name": match.get("name_similarity"),
        "age": match.get("age_similarity"),
        "location": match.get("location_similarity"),
        "description": match.get("description_similarity"),
        "clothing": match.get("clothing_similarity"),
        "image": match.get("image_similarity"),
    }
    return {
        "id": match.get("id"),
        "caseId": match.get("missing_case_id"),
        "affectedPersonId": match.get("affected_person_record_id"),
        "affectedPersonRecordId": match.get("affected_person_record_id"),
        "similarityPercent": match.get("overall_similarity"),
        "breakdown": {k: v for k, v in breakdown.items() if v is not None},
        "evidence": match.get("evidence") or [],
        "warnings": match.get("warnings") or [],
        "verificationStatus": verification_map.get(match.get("status"), match.get("status")),
        "createdAt": match.get("created_at"),
        "lastUpdatedAt": match.get("updated_at"),
    }


@router.get("/matches")
def list_candidate_matches(
    principal: CurrentPrincipal = Depends(get_current_principal),
):
    role = principal.profile["role"]
    if role not in {"FINDER", "COMMAND_CENTER"}:
        raise HTTPException(status_code=403, detail="Finder or Command Center access required")
    result = (
        db.table("candidate_matches")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    matches = result.data or []
    if role == "FINDER":
        organization_id = principal.profile.get("organization_id")
        if not organization_id:
            raise HTTPException(status_code=403, detail="Finder account has no authorized organization")
        allowed_records = db.table("affected_person_records").select("id").eq(
            "organization_id", organization_id
        ).execute().data or []
        allowed_ids = {record["id"] for record in allowed_records}
        matches = [
            match for match in matches
            if match.get("affected_person_record_id") in allowed_ids
        ]

    response = []
    for match in matches:
        case = get_row("missing_cases", match["missing_case_id"])
        affected = get_row("affected_person_records", match["affected_person_record_id"])
        if not case or not affected:
            logger.warning("Candidate response skipped: stage=related_record_missing")
            continue
        person = get_row("persons", affected["person_id"])
        missing_person = get_row("persons", case["person_id"])
        item = _match_response(match)
        item["missingCase"] = missing_case_response(case, missing_person)
        item["affectedPerson"] = affected_person_response(affected, person)
        response.append(item)
    return response


@router.get("/matches/{case_id}")
def case_matches(
    case_id: str,
    principal: CurrentPrincipal = Depends(get_current_principal),
):
    _assert_missing_access(principal, case_id)
    result = (
        db.table("candidate_matches")
        .select("*")
        .eq("missing_case_id", case_id)
        .execute()
    )
    matches = result.data or []
    if principal.profile["role"] == "FINDER":
        if principal.profile.get("organization_id"):
            allowed = (
                db.table("affected_person_records")
                .select("id")
                .eq("organization_id", principal.profile["organization_id"])
                .execute()
            ).data or []
        else:
            allowed = (
                db.table("affected_person_records")
                .select("id")
                .eq("found_by_user_id", principal.user_id)
                .execute()
            ).data or []
        allowed_ids = {row["id"] for row in allowed}
        matches = [m for m in matches if m.get("affected_person_record_id") in allowed_ids]
    return [_match_response(m) for m in matches]


def _verify_match(
    match_id: str,
    decision: str,
    notes: str | None,
    principal: CurrentPrincipal,
):
    match = require("candidate_matches", match_id)
    case_id = match.get("missing_case_id")
    if case_id:
        _assert_missing_access(principal, case_id)
    if principal.profile["role"] == "FINDER":
        affected_record = get_row(
            "affected_person_records",
            match.get("affected_person_record_id") or "",
        )
        if (
            not DEMO_MODE
            or not affected_record
            or affected_record.get("organization_id") != principal.profile.get("organization_id")
        ):
            raise HTTPException(status_code=403, detail="You are not authorized to review this candidate")

    try:
        updated = update_row("candidate_matches", match_id, {"status": decision})

        insert_row(
            "verifications",
            {
                "candidate_match_id": match_id,
                "verifier_user_id": principal.user_id,
                "decision": decision,
                "notes": notes,
                "verified_at": now(),
            },
        )

        if decision == "VERIFIED" and case_id:
            case = get_row("missing_cases", case_id)
            update_row("missing_cases", case_id, {"status": "VERIFIED"})
            insert_row(
                "case_updates",
                {
                    "missing_case_id": case_id,
                    "updated_by_user_id": principal.user_id,
                    "event_type": "MATCH_VERIFIED",
                    "title": "Match verified",
                    "description": "An authorized human reviewer verified the candidate match.",
                },
            )
            if case and case.get("reporter_user_id"):
                insert_row(
                    "notifications",
                    {
                        "user_id": case["reporter_user_id"],
                        "missing_case_id": case_id,
                        "notification_type": "MATCH",
                        "title": "Candidate match verified",
                        "message": "An authorized coordinator verified a candidate match for your case.",
                        "is_read": False,
                    },
                )
        elif decision == "REJECTED" and case_id:
            insert_row(
                "case_updates",
                {
                    "missing_case_id": case_id,
                    "updated_by_user_id": principal.user_id,
                    "event_type": "MATCH_REJECTED",
                    "title": "Candidate match rejected",
                    "description": "An authorized human reviewer rejected the candidate match.",
                },
            )
        return _match_response(updated)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Candidate match review failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=500, detail=f"Unable to {decision.lower()} match") from exc


@router.post("/matches/{match_id}/verify")
def verify_match(
    match_id: str,
    payload: dict[str, Any] | None = None,
    principal: CurrentPrincipal = Depends(require_match_reviewer),
):
    return _verify_match(match_id, "VERIFIED", (payload or {}).get("notes"), principal)


@router.post("/matches/{match_id}/reject")
def reject_match(
    match_id: str,
    payload: dict[str, Any] | None = None,
    principal: CurrentPrincipal = Depends(require_match_reviewer),
):
    return _verify_match(match_id, "REJECTED", (payload or {}).get("notes"), principal)


@router.get("/case-updates/{case_id}")
def updates(
    case_id: str,
    principal: CurrentPrincipal = Depends(get_current_principal),
):
    _assert_missing_access(principal, case_id)
    result = (
        db.table("case_updates")
        .select("*")
        .eq("missing_case_id", case_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [
        {
            "id": u.get("id"),
            "title": u.get("title"),
            "description": u.get("description"),
            "timestamp": u.get("created_at"),
            "actor": u.get("updated_by_user_id"),
            "eventType": u.get("event_type"),
        }
        for u in (result.data or [])
    ]


@router.get("/notifications")
def notifications(principal: CurrentPrincipal = Depends(get_current_principal)):
    # The existing schema is not documented in the repository with a fixed
    # recipient column. Prefer user_id when present; otherwise restrict by
    # case ownership so a searcher cannot receive unrelated case data.
    rows = (
        db.table("notifications")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    ).data or []

    if principal.profile["role"] == "SEARCHER":
        # Some deployments store a recipient user_id while others associate a
        # notification with a case. Support either existing schema shape
        # without requiring a new column.
        allowed_case_ids = {
            row["id"]
            for row in (
                db.table("missing_cases")
                .select("id")
                .eq("reporter_user_id", principal.user_id)
                .execute()
            ).data or []
        }
        rows = [
            row for row in rows
            if (
                row.get("user_id") == principal.user_id
                or row.get("user_id") is None and row.get("missing_case_id") in allowed_case_ids
            )
        ]
    elif principal.profile["role"] == "FINDER":
        rows = [row for row in rows if row.get("user_id") == principal.user_id]

    return [
        {
            "id": n.get("id"),
            "title": n.get("title"),
            "message": n.get("message"),
            "createdAt": n.get("created_at"),
            "read": n.get("is_read", False),
            "caseId": n.get("missing_case_id"),
            "category": n.get("notification_type", n.get("category")),
        }
        for n in rows
    ]


@router.patch("/notifications/{id}/read")
def mark_read(
    id: str,
    principal: CurrentPrincipal = Depends(get_current_principal),
):
    notification = require("notifications", id)
    case_id = notification.get("missing_case_id")
    if principal.profile["role"] == "SEARCHER":
        if notification.get("user_id") not in {None, principal.user_id}:
            raise HTTPException(status_code=403, detail="You are not authorized to update this notification")
        if case_id:
            case = get_row("missing_cases", case_id)
            if not case or case.get("reporter_user_id") != principal.user_id:
                raise HTTPException(status_code=403, detail="You are not authorized to update this notification")
        elif notification.get("user_id") is None:
            raise HTTPException(status_code=403, detail="You are not authorized to update this notification")
    elif principal.profile["role"] == "FINDER" and case_id:
        if notification.get("user_id") != principal.user_id:
            raise HTTPException(status_code=403, detail="You are not authorized to update this notification")
        case = get_row("missing_cases", case_id)
        if not case:
            raise HTTPException(status_code=404, detail="Related case not found")
    elif principal.profile["role"] == "FINDER" and notification.get("user_id") != principal.user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to update this notification")

    try:
        updated = update_row("notifications", id, {"is_read": True})
        return {
            "id": updated.get("id"),
            "title": updated.get("title"),
            "message": updated.get("message"),
            "createdAt": updated.get("created_at"),
            "read": updated.get("is_read", True),
            "caseId": updated.get("missing_case_id"),
            "category": updated.get("notification_type", updated.get("category")),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to mark notification as read") from exc


@router.get("/health/database")
def database_health():
    try:
        db.table("users").select("id").limit(1).execute()
        return {"status": "ok", "storage": "sqlite"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Local database is unavailable") from exc
