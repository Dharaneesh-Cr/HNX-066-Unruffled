from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from ..db.database import all_rows, delete_row, get_row, insert_row, update_row


def create_searcher_profile(user_id: str, full_name: str) -> None:
    insert_row(
        "profiles",
        {"id": user_id, "role": "SEARCHER", "full_name": full_name},
    )


def create_finder_organization_application(
    user_id: str,
    *,
    organization_name: str,
    organization_type: str,
    contact_person_name: str,
    email: str,
    phone: str,
    location: str,
    approval_status: str = "PENDING",
) -> dict[str, Any]:
    organization = insert_row(
        "organizations",
        {
            "name": organization_name,
            "organization_type": organization_type,
            "contact_person_name": contact_person_name,
            "contact_email": email,
            "contact_phone": phone,
            "address": location,
            "approval_status": approval_status,
        },
    )
    try:
        insert_row(
            "profiles",
            {
                "id": user_id,
                "role": "FINDER",
                "organization_id": organization["id"],
                "full_name": contact_person_name,
                "phone": phone,
            },
        )
    except Exception:
        try:
            delete_row("organizations", organization["id"])
        except Exception:
            pass
        raise
    return organization


def _profile_value(profile: dict[str, Any], camel: str, snake: str | None = None) -> Any:
    return profile.get(camel) if camel in profile else profile.get(snake or camel)


def person_payload(profile: dict[str, Any], *, allow_sensitive: bool = False) -> dict[str, Any]:
    # These are the non-sensitive person fields currently represented by the
    # frontend. Missing values are deliberately omitted so SQLite defaults
    # or NULL remain in control.
    mappings = (
        ("fullName", "full_name"),
        ("alias", "alias"),
        ("age", "age"),
        ("dateOfBirth", "date_of_birth"),
        ("gender", "gender"),
        ("bloodGroup", "blood_group"),
        ("languages", "languages"),
        ("photoPath", "photo_path"),
        ("heightCm", "height_cm"),
        ("weightKg", "weight_kg"),
        ("skinTone", "skin_tone"),
        ("hairColor", "hair_color"),
        ("hairStyle", "hair_style"),
        ("eyeColor", "eye_color"),
        ("bodyBuild", "body_build"),
        ("scars", "scars"),
        ("birthmarks", "birthmarks"),
        ("tattoos", "tattoos"),
        ("distinguishingMarks", "distinguishing_marks"),
        ("clothingDescription", "clothing_description"),
        ("footwear", "footwear"),
        ("accessories", "accessories"),
        ("belongings", "belongings"),
        ("additionalDescription", "additional_description"),
    )
    data = {}
    for camel, snake in mappings:
        value = _profile_value(profile, camel, snake)
        if value is not None:
            data[snake] = value

    if allow_sensitive:
        for camel, snake in (
            ("medicalConditionSummary", "medical_condition_summary"),
            ("medicationInformation", "medication_information"),
            ("immediateCareRequired", "immediate_care_required"),
            ("accessibilityNeeds", "accessibility_needs"),
        ):
            if camel in profile or snake in profile:
                value = _profile_value(profile, camel, snake)
                if value is not None:
                    data[snake] = value
    return data


def _new_case_number() -> str:
    return f"MC-{uuid4().hex[:10].upper()}"


def _new_record_number() -> str:
    return f"AP-{uuid4().hex[:10].upper()}"


def _public_person(person: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": person.get("id"),
        "fullName": person.get("full_name"),
        "alias": person.get("alias"),
        "age": person.get("age"),
        "gender": person.get("gender"),
        "photoPath": person.get("photo_path"),
        "distinguishingMarks": person.get("distinguishing_marks"),
        "clothingDescription": person.get("clothing_description"),
        "additionalDescription": person.get("additional_description"),
    }


def _sensitive_person(person: dict[str, Any]) -> dict[str, Any]:
    return {
        "medicalConditionSummary": person.get("medical_condition_summary"),
        "medicationInformation": person.get("medication_information"),
        "immediateCareRequired": person.get("immediate_care_required"),
        "accessibilityNeeds": person.get("accessibility_needs"),
    }


def create_missing_case(payload: dict[str, Any], current_user_id: str) -> dict[str, Any]:
    profile = dict(payload.get("profile") or {})
    person = insert_row("persons", person_payload(profile))
    case_data = {
        "case_number": payload.get("caseNumber") or _new_case_number(),
        "person_id": person["id"],
        "reporter_user_id": current_user_id,
        "relationship_to_person": payload.get("relationshipToPerson", payload.get("relationship")),
        "reporter_name": payload.get("reporterName"),
        "reporter_email": payload.get("reporterEmail"),
        "reporter_phone": payload.get("reporterPhone"),
        "preferred_contact_method": payload.get("preferredContactMethod"),
        "last_seen_date": payload.get("lastSeenDate", profile.get("lastSeenDate")),
        "last_seen_time": payload.get("lastSeenTime", profile.get("lastSeenTime")),
        "last_seen_location": payload.get("lastSeenLocation", profile.get("lastSeenLocation")),
        "last_seen_circumstances": payload.get("lastSeenCircumstances", profile.get("lastSeenCircumstances")),
        "consented": payload.get("consented", False),
        "status": payload.get("status", "NEW"),
        "priority": payload.get("priority", "NORMAL"),
    }
    case_data = {k: v for k, v in case_data.items() if v is not None}
    try:
        case = insert_row("missing_cases", case_data)
    except Exception:
        # Keep the first insert from leaving an orphan if the case insert fails.
        try:
            delete_row("persons", person["id"])
        except Exception:
            pass
        raise
    return missing_case_response(case, person)


def create_affected_person(payload: dict[str, Any], current_user_id: str, organization_id: str | None) -> dict[str, Any]:
    profile = {
        **dict(payload.get("profile") or {}),
        **{
            key: payload[key]
            for key in (
                "medicalConditionSummary",
                "medicationInformation",
                "immediateCareRequired",
                "accessibilityNeeds",
            )
            if payload.get(key) is not None
        },
    }
    person = insert_row("persons", person_payload(profile, allow_sensitive=True))
    record_data = {
        "record_number": payload.get("recordNumber") or _new_record_number(),
        "person_id": person["id"],
        "organization_id": payload.get("organizationId") or organization_id,
        "found_by_user_id": current_user_id,
        "found_by_name": payload.get("foundBy"),
        "consented": payload.get("consented", False),
        "facility_name": payload.get("facilityName", payload.get("shelterOrFacility")),
        "found_date": payload.get("foundDate", profile.get("foundDate")),
        "found_time": payload.get("foundTime", profile.get("foundTime")),
        "found_location": payload.get("foundLocation", profile.get("foundLocation")),
        "current_location": payload.get("currentLocation", profile.get("currentLocation", profile.get("foundLocation"))),
        "condition_status": payload.get("conditionStatus"),
        "additional_notes": payload.get("additionalNotes"),
    }
    record_data = {k: v for k, v in record_data.items() if v is not None}
    try:
        record = insert_row("affected_person_records", record_data)
    except Exception:
        try:
            delete_row("persons", person["id"])
        except Exception:
            pass
        raise
    return affected_person_response(record, person, include_sensitive=True)


def missing_case_response(
    case: dict[str, Any],
    person: dict[str, Any] | None = None,
) -> dict[str, Any]:
    person = person or get_row("persons", case["person_id"]) or {}
    return {
        "id": case["id"],
        "caseNumber": case.get("case_number"),
        "personId": person.get("id"),
        "profile": _public_person(person),
        "relationship": case.get("relationship_to_person"),
        "reporterName": case.get("reporter_name"),
        "reporterEmail": case.get("reporter_email"),
        "reporterPhone": case.get("reporter_phone"),
        "preferredContactMethod": case.get("preferred_contact_method"),
        "lastSeenDate": case.get("last_seen_date"),
        "lastSeenTime": case.get("last_seen_time"),
        "lastSeenLocation": case.get("last_seen_location"),
        "lastSeenCircumstances": case.get("last_seen_circumstances"),
        "status": case.get("status"),
        "consented": case.get("consented", False),
        "priority": case.get("priority"),
        "createdAt": case.get("created_at"),
        "updatedAt": case.get("updated_at"),
    }


def affected_person_response(
    record: dict[str, Any],
    person: dict[str, Any] | None = None,
    *,
    include_sensitive: bool = False,
) -> dict[str, Any]:
    person = person or get_row("persons", record["person_id"]) or {}
    response = {
        "id": record["id"],
        "recordNumber": record.get("record_number"),
        "personId": person.get("id"),
        "profile": _public_person(person),
        "organizationId": record.get("organization_id"),
        "foundBy": record.get("found_by_name") or record.get("found_by_user_id"),
        "shelterOrFacility": record.get("facility_name"),
        "foundDate": record.get("found_date"),
        "foundTime": record.get("found_time"),
        "foundLocation": record.get("found_location"),
        "currentLocation": record.get("current_location"),
        "conditionStatus": record.get("condition_status"),
        "consented": record.get("consented", False),
        "additionalNotes": record.get("additional_notes"),
        "registeredAt": record.get("created_at"),
    }
    if include_sensitive:
        response.update(_sensitive_person(person))
    return response


def list_missing_cases() -> list[dict[str, Any]]:
    cases = all_rows("missing_cases")
    return [missing_case_response(c) for c in cases]


def get_missing_case(case_id: str) -> dict[str, Any] | None:
    case = get_row("missing_cases", case_id)
    return missing_case_response(case) if case else None


def list_affected_people() -> list[dict[str, Any]]:
    records = all_rows("affected_person_records")
    return [affected_person_response(r) for r in records]


def get_affected_person(record_id: str) -> dict[str, Any] | None:
    record = get_row("affected_person_records", record_id)
    return affected_person_response(record, include_sensitive=True) if record else None


def update_missing_case(case_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    case = get_row("missing_cases", case_id)
    if not case:
        return None
    allowed = {
        "relationshipToPerson": "relationship_to_person",
        "relationship": "relationship_to_person",
        "reporterName": "reporter_name",
        "reporterEmail": "reporter_email",
        "reporterPhone": "reporter_phone",
        "preferredContactMethod": "preferred_contact_method",
        "lastSeenDate": "last_seen_date",
        "lastSeenTime": "last_seen_time",
        "lastSeenLocation": "last_seen_location",
        "lastSeenCircumstances": "last_seen_circumstances",
        "status": "status",
        "priority": "priority",
    }
    changes = {db: payload[src] for src, db in allowed.items() if src in payload}
    updated = update_row("missing_cases", case_id, changes) if changes else case
    return missing_case_response(updated)


def update_affected_person(record_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    record = get_row("affected_person_records", record_id)
    if not record:
        return None
    allowed = {
        "organizationId": "organization_id",
        "facilityName": "facility_name",
        "shelterOrFacility": "facility_name",
        "foundDate": "found_date",
        "foundTime": "found_time",
        "foundLocation": "found_location",
        "currentLocation": "current_location",
        "conditionStatus": "condition_status",
        "additionalNotes": "additional_notes",
    }
    changes = {db: payload[src] for src, db in allowed.items() if src in payload}
    updated = update_row("affected_person_records", record_id, changes) if changes else record
    return affected_person_response(updated)
