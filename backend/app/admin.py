from __future__ import annotations

import argparse
import getpass
import re
import sqlite3

from .core.config import DEMO_MODE
from .auth.local_auth import register_local_user
from .db.database import db, delete_row, initialize_database, insert_row


def create_command_center() -> None:
    email = input("Command Center email: ").strip()
    full_name = input("Command Center operator name: ").strip()
    password = getpass.getpass("Password (minimum 8 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters.")
    if password != confirmation:
        raise SystemExit("Password confirmation does not match.")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or not full_name:
        raise SystemExit("A valid email and operator name are required.")

    user_id = None
    try:
        user_id = register_local_user(email, password)
        insert_row(
            "profiles",
            {"id": user_id, "role": "COMMAND_CENTER", "full_name": full_name},
        )
    except sqlite3.IntegrityError as exc:
        if user_id:
            delete_row("users", user_id)
        raise SystemExit("That email already exists or the operator profile is invalid.") from exc
    except Exception:
        if user_id:
            delete_row("users", user_id)
        raise
    print(f"Command Center account created for {email}.")


def approve_organization(organization_id: str) -> None:
    organizations = (
        db.table("organizations")
        .select("id, name, organization_type, approval_status")
        .eq("id", organization_id)
        .limit(1)
        .execute()
        .data
    )
    if not organizations:
        raise SystemExit("Organization not found.")
    organization = organizations[0]
    print(
        "Organization: "
        f"{organization['name']} ({organization['organization_type']}), "
        f"current status: {organization['approval_status']}"
    )
    if input("Approve this organization? Type APPROVE to continue: ") != "APPROVE":
        raise SystemExit("Approval cancelled.")
    db.table("organizations").update({"approval_status": "APPROVED"}).eq(
        "id", organization_id
    ).execute()
    print("Organization approved.")


def approve_demo_organization(organization_id: str) -> None:
    if not DEMO_MODE:
        raise SystemExit("This command is available only when SAHAYAA_DEMO_MODE=true.")
    organizations = (
        db.table("organizations")
        .select("id, name, organization_type, approval_status")
        .eq("id", organization_id)
        .limit(1)
        .execute()
        .data
    )
    if not organizations:
        raise SystemExit("Organization not found.")
    organization = organizations[0]
    if organization["approval_status"] != "PENDING":
        raise SystemExit(f"Organization is {organization['approval_status']}; only pending organizations can be approved.")
    print(
        "Local demo organization: "
        f"{organization['name']} ({organization['organization_type']})"
    )
    if input("Approve this synthetic demo organization? Type APPROVE DEMO to continue: ") != "APPROVE DEMO":
        raise SystemExit("Demo approval cancelled.")
    db.table("organizations").update({"approval_status": "APPROVED"}).eq(
        "id", organization_id
    ).execute()
    print("Demo organization approved.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Trusted local Sahayaa administration")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("create-command-center")
    approve_parser = subparsers.add_parser("approve-organization")
    approve_parser.add_argument("organization_id")
    demo_approve_parser = subparsers.add_parser("approve-demo-organization")
    demo_approve_parser.add_argument("organization_id")
    args = parser.parse_args()
    initialize_database()
    if args.command == "create-command-center":
        create_command_center()
    elif args.command == "approve-organization":
        approve_organization(args.organization_id)
    elif args.command == "approve-demo-organization":
        approve_demo_organization(args.organization_id)


if __name__ == "__main__":
    main()
