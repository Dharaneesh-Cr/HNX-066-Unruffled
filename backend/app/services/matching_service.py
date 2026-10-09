from __future__ import annotations

from typing import Any

from ..db.database import db, get_row, insert_row, update_row

WEIGHTS = {
    "name": 20,
    "age": 15,
    "gender": 10,
    "location": 15,
    "alias": 10,
    "distinguishing_marks": 10,
    "clothing_description": 10,
    "additional_description": 10,
}


def normalize(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).strip().lower().split())


def compare_text(left: Any, right: Any) -> float | None:
    first, second = normalize(left), normalize(right)
    if not first or not second:
        return None
    if first == second or first in second or second in first:
        return 1.0
    first_words, second_words = set(first.split()), set(second.split())
    return len(first_words & second_words) / max(len(first_words), len(second_words))


def compare_age(left: Any, right: Any) -> float | None:
    if left is None or right is None:
        return None
    try:
        return max(0.0, 1.0 - abs(float(left) - float(right)) / 20.0)
    except (TypeError, ValueError):
        return None


def score_profiles(missing: dict[str, Any], affected: dict[str, Any]) -> tuple[int, list[str], dict[str, int | None]]:
    values = [
        (WEIGHTS["name"], compare_text(missing.get("full_name"), affected.get("full_name")) or compare_text(missing.get("full_name"), affected.get("alias"))),
        (WEIGHTS["age"], compare_age(missing.get("age"), affected.get("age"))),
        (WEIGHTS["gender"], compare_text(missing.get("gender"), affected.get("gender"))),
        (WEIGHTS["location"], compare_text((missing.get("last_seen_location") or "").split(",")[-1], (affected.get("found_location") or "").split(",")[-1])),
        (WEIGHTS["alias"], compare_text(missing.get("alias"), affected.get("alias"))),
        (WEIGHTS["distinguishing_marks"], compare_text(missing.get("distinguishing_marks"), affected.get("distinguishing_marks"))),
        (WEIGHTS["clothing_description"], compare_text(missing.get("clothing_description"), affected.get("clothing_description"))),
        (WEIGHTS["additional_description"], compare_text(missing.get("additional_description"), affected.get("additional_description"))),
    ]
    available = [(weight, score) for weight, score in values if score is not None]
    if not available:
        return 0, ["Review available profile details with a human coordinator"], {}
    total_weight = sum(weight for weight, _ in available)
    score = round(sum(weight * value for weight, value in available) / total_weight * 100)
    evidence: list[str] = []
    if values[0][1] is not None and values[0][1] >= 0.35: evidence.append("Similar name")
    if values[1][1] is not None and values[1][1] >= 0.65: evidence.append("Similar age range")
    if values[2][1] == 1: evidence.append("Gender information is consistent")
    if values[3][1] is not None and values[3][1] > 0: evidence.append("Same or nearby region")
    if values[5][1] is not None and values[5][1] >= 0.3: evidence.append("Distinguishing marks are similar")
    if values[6][1] is not None and values[6][1] >= 0.3: evidence.append("Clothing description is similar")
    if values[7][1] is not None and values[7][1] >= 0.3: evidence.append("Additional descriptions are similar")
    breakdown = {
        "name_similarity": round(values[0][1] * 100) if values[0][1] is not None else None,
        "age_similarity": round(values[1][1] * 100) if values[1][1] is not None else None,
        "location_similarity": round(values[3][1] * 100) if values[3][1] is not None else None,
        "description_similarity": round(values[7][1] * 100) if values[7][1] is not None else None,
        "physical_similarity": round(values[5][1] * 100) if values[5][1] is not None else None,
        "clothing_similarity": round(values[6][1] * 100) if values[6][1] is not None else None,
    }
    return score, evidence or ["Review available profile details with a human coordinator"], breakdown


def generate_candidate_matches_for_affected(record_id: str) -> None:
    record = get_row("affected_person_records", record_id)
    if not record:
        return
    affected = get_row("persons", record["person_id"])
    if not affected:
        return
    cases = db.table("missing_cases").select("*").in_("status", ["NEW", "SEARCHING", "POTENTIAL_MATCH", "NO_CURRENT_MATCH", "UNDER_VERIFICATION"]).execute().data or []
    for case in cases:
        missing = get_row("persons", case["person_id"])
        if not missing:
            continue
        score, evidence, breakdown = score_profiles(missing, affected)
        if score < 25:
            continue
        existing = db.table("candidate_matches").select("id").eq("missing_case_id", case["id"]).eq("affected_person_record_id", record_id).limit(1).execute().data or []
        payload = {
            "missing_case_id": case["id"],
            "affected_person_record_id": record_id,
            "overall_similarity": score,
            "name_similarity": breakdown.get("name_similarity"),
            "age_similarity": breakdown.get("age_similarity"),
            "location_similarity": breakdown.get("location_similarity"),
            "description_similarity": breakdown.get("description_similarity"),
            "physical_similarity": breakdown.get("physical_similarity"),
            "clothing_similarity": breakdown.get("clothing_similarity"),
            "image_similarity": None,
            "evidence": evidence,
            "warnings": ["Candidate Similarity is not identity confirmation."],
            "status": "POTENTIAL_MATCH",
        }
        if existing:
            update_row("candidate_matches", existing[0]["id"], payload)
        else:
            insert_row("candidate_matches", payload)
        if case.get("status") in {"NEW", "SEARCHING", "NO_CURRENT_MATCH"}:
            update_row("missing_cases", case["id"], {"status": "POTENTIAL_MATCH"})


def generate_candidate_matches_for_case(case_id: str) -> None:
    case = get_row("missing_cases", case_id)
    if not case:
        return
    missing = get_row("persons", case["person_id"])
    if not missing:
        return
    records = db.table("affected_person_records").select("*").execute().data or []
    for record in records:
        affected = get_row("persons", record["person_id"])
        if not affected:
            continue
        score, evidence, breakdown = score_profiles(missing, affected)
        if score < 25:
            continue
        existing = db.table("candidate_matches").select("id").eq("missing_case_id", case_id).eq("affected_person_record_id", record["id"]).limit(1).execute().data or []
        payload = {
            "missing_case_id": case_id,
            "affected_person_record_id": record["id"],
            "overall_similarity": score,
            "name_similarity": breakdown.get("name_similarity"),
            "age_similarity": breakdown.get("age_similarity"),
            "location_similarity": breakdown.get("location_similarity"),
            "description_similarity": breakdown.get("description_similarity"),
            "physical_similarity": breakdown.get("physical_similarity"),
            "clothing_similarity": breakdown.get("clothing_similarity"),
            "image_similarity": None,
            "evidence": evidence,
            "warnings": ["Candidate Similarity is not identity confirmation."],
            "status": "POTENTIAL_MATCH",
        }
        if existing:
            update_row("candidate_matches", existing[0]["id"], payload)
        else:
            insert_row("candidate_matches", payload)
    if case.get("status") in {"NEW", "SEARCHING", "NO_CURRENT_MATCH"}:
        any_match = db.table("candidate_matches").select("id").eq("missing_case_id", case_id).limit(1).execute().data or []
        if any_match:
            update_row("missing_cases", case_id, {"status": "POTENTIAL_MATCH"})
