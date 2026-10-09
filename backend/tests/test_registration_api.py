from __future__ import annotations

import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.auth.local_auth import register_local_user
from app.core.config import DATABASE_PATH as CONFIG_DATABASE_PATH
from app.db import database
from app.main import app


class LocalSQLiteFlowTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.database_patch = patch.object(database, "DATABASE_PATH", root / "sahayaa.db")
        self.secret_patch = patch(
            "app.auth.local_auth.JWT_SECRET_PATH",
            root / ".jwt_secret",
        )
        self.uploads_patch = patch("app.services.photo_service.UPLOADS_DIR", root / "uploads")
        self.routes_demo_patch = patch("app.api.routes.DEMO_MODE", False)
        self.dependencies_demo_patch = patch("app.auth.dependencies.DEMO_MODE", False)
        self.database_patch.start()
        self.secret_patch.start()
        self.uploads_patch.start()
        self.routes_demo_patch.start()
        self.dependencies_demo_patch.start()
        self.addCleanup(self.temp_dir.cleanup)
        self.addCleanup(self.database_patch.stop)
        self.addCleanup(self.secret_patch.stop)
        self.addCleanup(self.uploads_patch.stop)
        self.addCleanup(self.routes_demo_patch.stop)
        self.addCleanup(self.dependencies_demo_patch.stop)
        database.initialize_database()
        self.client = TestClient(app)

    def searcher(self, email: str = "searcher@example.test") -> tuple[str, str]:
        response = self.client.post(
            "/api/auth/register/searcher",
            json={
                "fullName": "Fictional Searcher",
                "email": email,
                "password": "fictional-password",
                "confirmPassword": "fictional-password",
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        user_id = response.json()["userId"]
        login = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": "fictional-password", "portal": "searcher"},
        )
        self.assertEqual(login.status_code, 200, login.text)
        return user_id, login.json()["accessToken"]

    def organization(self, email: str, name: str) -> tuple[str, str]:
        response = self.client.post(
            "/api/auth/register/organization",
            json={
                "organizationName": name,
                "organizationType": "SHELTER",
                "contactPersonName": "Fictional Contact",
                "email": email,
                "phone": "0000000000",
                "location": "Fictional City",
                "password": "fictional-password",
                "confirmPassword": "fictional-password",
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        result = response.json()
        return result["userId"], result["organizationId"]

    def approve(self, organization_id: str) -> None:
        database.db.table("organizations").update(
            {"approval_status": "APPROVED"}
        ).eq("id", organization_id).execute()

    def finder_token(self, email: str, name: str) -> tuple[str, str, str]:
        user_id, organization_id = self.organization(email, name)
        self.approve(organization_id)
        login = self.client.post(
            "/api/auth/login",
            json={
                "email": email,
                "password": "fictional-password",
                "portal": "finder",
                "organizationName": name,
                "organizationType": "SHELTER",
            },
        )
        self.assertEqual(login.status_code, 200, login.text)
        return user_id, organization_id, login.json()["accessToken"]

    @staticmethod
    def missing_payload(age: int = 32) -> dict:
        return {
            "profile": {
                "fullName": "Fictional Missing Person",
                "age": age,
                "gender": "Unknown / not recorded",
            },
            "relationship": "Sibling",
            "reporterName": "Fictional Searcher",
            "reporterPhone": "0000000000",
            "consented": True,
            "lastSeenDate": "2026-10-09",
            "lastSeenLocation": "Fictional City",
        }

    def test_initialization_is_persistent_and_reentrant(self):
        user_id, _ = self.searcher()
        database.initialize_database()
        self.assertEqual(database.get_row("profiles", user_id)["role"], "SEARCHER")
        with database._connection() as connection:
            self.assertEqual(connection.execute("PRAGMA foreign_keys").fetchone()[0], 1)
            self.assertEqual(
                connection.execute("SELECT MAX(version) FROM schema_migrations").fetchone()[0],
                2,
            )

    def test_age_guard_migration_preserves_existing_person_rows(self):
        legacy_path = Path(self.temp_dir.name) / "legacy.db"
        legacy_schema = database.SCHEMA.replace(
            "age IS NULL OR (typeof(age) = 'integer' AND age BETWEEN 0 AND 125)",
            "age IS NULL OR age BETWEEN 0 AND 125",
        )
        with closing(sqlite3.connect(legacy_path)) as connection:
            with connection:
                connection.executescript(legacy_schema)
                connection.execute(
                    "CREATE TABLE schema_migrations "
                    "(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
                )
                connection.execute("INSERT INTO schema_migrations (version) VALUES (1)")
                connection.execute(
                    "INSERT INTO persons (id, age) VALUES (?, ?)",
                    ("preserved-person", 44),
                )
        with patch.object(database, "DATABASE_PATH", legacy_path):
            database.initialize_database()
            self.assertEqual(database.get_row("persons", "preserved-person")["age"], 44)
            with self.assertRaises(sqlite3.IntegrityError):
                database.insert_row("persons", {"id": "fractional-age", "age": 10.5})

    def test_fastapi_startup_initializes_database_automatically(self):
        startup_path = Path(self.temp_dir.name) / "startup.db"
        with patch.object(database, "DATABASE_PATH", startup_path):
            with TestClient(app) as startup_client:
                response = startup_client.get("/api/health/database")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["storage"], "sqlite")
        with database._connection() as connection:
            self.assertIsNotNone(
                connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='missing_cases'"
                ).fetchone()
            )

    def test_demo_startup_persists_pending_finder_approval_only_when_enabled(self):
        _, organization_id = self.organization(
            "startup-demo-finder@example.test",
            "Fictional Startup Demo Shelter",
        )
        with patch("app.main.DEMO_MODE", True), patch("app.db.database.DEMO_MODE", True):
            with TestClient(app) as startup_client:
                self.assertEqual(startup_client.get("/health").status_code, 200)

        self.assertEqual(
            database.get_row("organizations", organization_id)["approval_status"],
            "APPROVED",
        )

        _, normal_organization_id = self.organization(
            "startup-normal-finder@example.test",
            "Fictional Normal Shelter",
        )
        with patch("app.main.DEMO_MODE", False), patch("app.db.database.DEMO_MODE", False):
            with TestClient(app) as startup_client:
                self.assertEqual(startup_client.get("/health").status_code, 200)
        self.assertEqual(
            database.get_row("organizations", normal_organization_id)["approval_status"],
            "PENDING",
        )

    def test_searcher_registration_login_password_hash_and_role_separation(self):
        user_id, token = self.searcher()
        user = database.get_row("users", user_id)
        self.assertNotEqual(user["password_hash"], "fictional-password")
        self.assertTrue(user["password_hash"].startswith("scrypt$"))
        me = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["role"], "SEARCHER")

        bad_password = self.client.post(
            "/api/auth/login",
            json={"email": "searcher@example.test", "password": "wrong-password", "portal": "searcher"},
        )
        self.assertEqual(bad_password.status_code, 401)
        wrong_portal = self.client.post(
            "/api/auth/login",
            json={"email": "searcher@example.test", "password": "fictional-password", "portal": "command_center"},
        )
        self.assertEqual(wrong_portal.status_code, 403)

    def test_login_normalizes_email_rejects_wrong_password_and_allows_login_after_logout(self):
        email = "repeat-login@example.test"
        self.searcher(email)
        wrong_password = "not-the-test-password"
        with self.assertLogs("app.auth.local_auth", level="INFO") as captured:
            rejected = self.client.post(
                "/api/auth/login",
                json={"email": email.upper(), "password": wrong_password, "portal": "searcher"},
            )
        self.assertEqual(rejected.status_code, 401)
        self.assertIn("stage=password_verification_failed", "\n".join(captured.output))
        self.assertNotIn(email, "\n".join(captured.output))
        self.assertNotIn(wrong_password, "\n".join(captured.output))

        missing_email = "not-registered@example.test"
        with self.assertLogs("app.auth.local_auth", level="INFO") as captured:
            missing = self.client.post(
                "/api/auth/login",
                json={"email": missing_email, "password": "fictional-password", "portal": "searcher"},
            )
        self.assertEqual(missing.status_code, 401)
        self.assertIn("stage=account_not_found", "\n".join(captured.output))
        self.assertNotIn(missing_email, "\n".join(captured.output))

        # Logout is local session removal; a new login establishes a fresh session.
        logged_in_again = self.client.post(
            "/api/auth/login",
            json={"email": email.upper(), "password": "fictional-password", "portal": "searcher"},
        )
        self.assertEqual(logged_in_again.status_code, 200, logged_in_again.text)
        self.assertEqual(logged_in_again.json()["user"]["role"], "SEARCHER")

    def test_auth_uses_one_absolute_database_path(self):
        self.assertTrue(CONFIG_DATABASE_PATH.is_absolute())
        self.assertTrue(Path(database.DATABASE_PATH).is_absolute())
        self.assertEqual(database.DATABASE_PATH, Path(self.temp_dir.name) / "sahayaa.db")

    def test_gmail_registration_can_sign_in_without_confirmation(self):
        user_id, token = self.searcher("fictional.searcher@gmail.com")
        self.assertTrue(token)
        self.assertEqual(database.get_row("users", user_id)["email"], "fictional.searcher@gmail.com")

    def test_duplicate_registration_and_unprivileged_registration(self):
        self.searcher()
        duplicate = self.client.post(
            "/api/auth/register/searcher",
            json={
                "fullName": "Another Fictional User",
                "email": "SEARCHER@example.test",
                "password": "fictional-password",
                "confirmPassword": "fictional-password",
            },
        )
        self.assertEqual(duplicate.status_code, 409)
        with self.assertRaises(sqlite3.IntegrityError):
            database.insert_row(
                "profiles",
                {"id": "missing-user", "role": "COMMAND_CENTER", "full_name": "Not an account"},
            )

    def test_registration_rejects_short_or_unconfirmed_passwords(self):
        for password, confirmation in (
            ("short", "short"),
            ("fictional-password", "different-password"),
        ):
            with self.subTest(password_length=len(password)):
                response = self.client.post(
                    "/api/auth/register/searcher",
                    json={
                        "fullName": "Fictional Searcher",
                        "email": f"user-{len(password)}-{confirmation[0]}@example.test",
                        "password": password,
                        "confirmPassword": confirmation,
                    },
                )
                self.assertEqual(response.status_code, 422)

    def test_pending_finder_is_not_authorized_until_operator_approval(self):
        with patch("app.api.routes.DEMO_MODE", False):
            user_id, organization_id = self.organization("finder@example.test", "Fictional Shelter")
        login_body = {
            "email": "finder@example.test",
            "password": "fictional-password",
            "portal": "finder",
            "organizationName": "Fictional Shelter",
            "organizationType": "SHELTER",
        }
        pending_login = self.client.post("/api/auth/login", json=login_body)
        self.assertEqual(pending_login.status_code, 200, pending_login.text)
        self.assertEqual(pending_login.json()["user"]["approvalStatus"], "PENDING")
        self.assertEqual(
            database.get_row("organizations", organization_id)["approval_status"],
            "PENDING",
        )
        pending_token = pending_login.json()["accessToken"]
        pending_me = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {pending_token}"},
        )
        self.assertEqual(pending_me.status_code, 200)
        self.assertEqual(pending_me.json()["approvalStatus"], "PENDING")
        blocked_records = self.client.get(
            "/api/affected-persons",
            headers={"Authorization": f"Bearer {pending_token}"},
        )
        self.assertEqual(blocked_records.status_code, 403)

        wrong_organization = self.client.post(
            "/api/auth/login",
            json={**login_body, "organizationName": "Different Organization"},
        )
        self.assertEqual(wrong_organization.status_code, 403)
        self.approve(organization_id)
        approved_with_existing_token = self.client.get(
            "/api/affected-persons",
            headers={"Authorization": f"Bearer {pending_token}"},
        )
        self.assertEqual(approved_with_existing_token.status_code, 200)
        approved_login = self.client.post("/api/auth/login", json=login_body)
        self.assertEqual(approved_login.status_code, 200)
        self.assertEqual(approved_login.json()["user"]["id"], user_id)
        self.assertEqual(approved_login.json()["user"]["approvalStatus"], "APPROVED")

    def test_demo_mode_approves_new_finder_and_enables_finder_features(self):
        registration_payload = {
            "organizationName": "Fictional Demo Shelter",
            "organizationType": "SHELTER",
            "contactPersonName": "Fictional Demo Contact",
            "email": "demo-finder@example.test",
            "phone": "0000000000",
            "location": "Fictional City",
            "password": "fictional-password",
            "confirmPassword": "fictional-password",
        }
        with patch("app.api.routes.DEMO_MODE", True):
            registered = self.client.post(
                "/api/auth/register/organization",
                json=registration_payload,
            )
        self.assertEqual(registered.status_code, 201, registered.text)
        self.assertEqual(registered.json()["approvalStatus"], "APPROVED")
        self.assertIn("local demo mode", registered.json()["message"])

        organization = database.get_row("organizations", registered.json()["organizationId"])
        self.assertEqual(organization["approval_status"], "APPROVED")

        login = self.client.post(
            "/api/auth/login",
            json={
                "email": registration_payload["email"],
                "password": registration_payload["password"],
                "portal": "finder",
                "organizationName": registration_payload["organizationName"],
                "organizationType": registration_payload["organizationType"],
            },
        )
        self.assertEqual(login.status_code, 200, login.text)
        self.assertEqual(login.json()["user"]["approvalStatus"], "APPROVED")
        token = login.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}
        records = self.client.get("/api/affected-persons", headers=headers)
        self.assertEqual(records.status_code, 200, records.text)
        self.assertEqual(records.json(), [])

        created = self.client.post(
            "/api/affected-persons",
            json={
                "profile": {
                    "fullName": "Fictional Demo Affected Person",
                    "age": 28,
                    "gender": "Unknown / not recorded",
                },
                "foundDate": "2026-10-09",
                "foundLocation": "Fictional City",
                "currentLocation": "Fictional Demo Shelter",
                "conditionStatus": "Stable",
                "foundBy": "Fictional Demo Contact",
                "consented": True,
            },
            headers=headers,
        )
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(
            database.get_row("affected_person_records", created.json()["id"])["organization_id"],
            registered.json()["organizationId"],
        )

    def test_demo_mode_persists_approval_for_existing_finder_and_unlocks_protected_routes(self):
        user_id, organization_id = self.organization(
            "existing-demo-finder@example.test",
            "Fictional Existing Demo Shelter",
        )
        login = self.client.post(
            "/api/auth/login",
            json={
                "email": "existing-demo-finder@example.test",
                "password": "fictional-password",
                "portal": "finder",
                "organizationName": "Fictional Existing Demo Shelter",
                "organizationType": "SHELTER",
            },
        )
        self.assertEqual(login.status_code, 200, login.text)
        self.assertEqual(login.json()["user"]["approvalStatus"], "PENDING")
        token = login.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}
        self.assertEqual(
            database.get_row("organizations", organization_id)["approval_status"],
            "PENDING",
        )

        with (
            patch("app.api.routes.DEMO_MODE", True),
            patch("app.auth.dependencies.DEMO_MODE", True),
            self.assertLogs("app.auth.dependencies", level="INFO") as captured,
        ):
            demo_login = self.client.post(
                "/api/auth/login",
                json={
                    "email": "existing-demo-finder@example.test",
                    "password": "fictional-password",
                    "portal": "finder",
                    "organizationName": "Fictional Existing Demo Shelter",
                    "organizationType": "SHELTER",
                },
            )
            self.assertEqual(demo_login.status_code, 200, demo_login.text)
            self.assertEqual(demo_login.json()["user"]["approvalStatus"], "APPROVED")
            profile = self.client.get("/api/auth/me", headers=headers)
            self.assertEqual(profile.status_code, 200, profile.text)
            self.assertEqual(profile.json()["approvalStatus"], "APPROVED")

            for path in (
                "/api/missing-cases",
                "/api/affected-persons",
                "/api/matches",
                "/api/notifications",
            ):
                with self.subTest(path=path):
                    response = self.client.get(path, headers=headers)
                    self.assertNotEqual(
                        response.status_code,
                        403,
                        f"{path} unexpectedly denied: {response.text}",
                    )

            created = self.client.post(
                "/api/affected-persons",
                headers=headers,
                json={
                    "profile": {
                        "fullName": "Fictional Existing Finder Record",
                        "age": 29,
                        "gender": "Unknown / not recorded",
                    },
                    "foundDate": "2026-10-09",
                    "foundLocation": "Fictional City",
                    "currentLocation": "Fictional Existing Demo Shelter",
                    "conditionStatus": "Stable",
                    "foundBy": "Fictional Demo Contact",
                    "consented": True,
                },
            )
            self.assertEqual(created.status_code, 200, created.text)
            detail = self.client.get(
                f"/api/affected-persons/{created.json()['id']}",
                headers=headers,
            )
            self.assertEqual(detail.status_code, 200, detail.text)

        self.assertTrue(
            any("pending_organization_approved" in message for message in captured.output)
        )
        self.assertEqual(
            database.get_row("organizations", organization_id)["approval_status"],
            "APPROVED",
        )
        database.initialize_database()
        self.assertEqual(
            database.get_row("organizations", organization_id)["approval_status"],
            "APPROVED",
        )
        self.assertEqual(
            database.get_row("profiles", user_id)["organization_id"],
            organization_id,
        )

    def test_demo_mode_does_not_approve_or_allow_rejected_finder_organization(self):
        user_id, organization_id = self.organization(
            "rejected-demo-finder@example.test",
            "Fictional Rejected Shelter",
        )
        database.update_row(
            "organizations",
            organization_id,
            {"approval_status": "REJECTED"},
        )
        login = self.client.post(
            "/api/auth/login",
            json={
                "email": "rejected-demo-finder@example.test",
                "password": "fictional-password",
                "portal": "finder",
                "organizationName": "Fictional Rejected Shelter",
                "organizationType": "SHELTER",
            },
        )
        self.assertEqual(login.status_code, 403)
        self.assertEqual(database.get_row("organizations", organization_id)["approval_status"], "REJECTED")
        self.assertEqual(database.get_row("profiles", user_id)["role"], "FINDER")

    def test_demo_command_requires_explicit_local_approval(self):
        from app import admin

        _, organization_id = self.organization("legacy-demo@example.test", "Fictional Legacy Shelter")
        with patch("app.admin.DEMO_MODE", False):
            with self.assertRaises(SystemExit):
                admin.approve_demo_organization(organization_id)
        self.assertEqual(database.get_row("organizations", organization_id)["approval_status"], "PENDING")

        with patch("app.admin.DEMO_MODE", True), patch("builtins.input", return_value="APPROVE DEMO"):
            admin.approve_demo_organization(organization_id)
        self.assertEqual(database.get_row("organizations", organization_id)["approval_status"], "APPROVED")

    def test_demo_workflow_searcher_report_finder_match_verification_and_restart(self):
        with patch("app.api.routes.DEMO_MODE", True):
            searcher_id, searcher_token = self.searcher("demo-searcher@example.test")
            report = self.client.post(
                "/api/missing-cases",
                json=self.missing_payload(),
                headers={"Authorization": f"Bearer {searcher_token}"},
            )
        self.assertEqual(report.status_code, 201, report.text)
        case_id = report.json()["id"]

        registration = {
            "organizationName": "Fictional Demo Rescue",
            "organizationType": "SHELTER",
            "contactPersonName": "Fictional Finder Contact",
            "email": "demo-finder-flow@example.test",
            "phone": "0000000000",
            "location": "Fictional City",
            "password": "fictional-password",
            "confirmPassword": "fictional-password",
        }
        with patch("app.api.routes.DEMO_MODE", True):
            registered = self.client.post("/api/auth/register/organization", json=registration)
        self.assertEqual(registered.status_code, 201, registered.text)
        self.assertEqual(registered.json()["approvalStatus"], "APPROVED")
        finder_login = self.client.post(
            "/api/auth/login",
            json={
                "email": registration["email"],
                "password": registration["password"],
                "portal": "finder",
                "organizationName": registration["organizationName"],
                "organizationType": registration["organizationType"],
            },
        )
        self.assertEqual(finder_login.status_code, 200, finder_login.text)
        finder_token = finder_login.json()["accessToken"]
        finder_headers = {"Authorization": f"Bearer {finder_token}"}

        shared_cases = self.client.get("/api/missing-cases", headers=finder_headers)
        self.assertEqual(shared_cases.status_code, 200, shared_cases.text)
        self.assertEqual([item["id"] for item in shared_cases.json()], [case_id])
        self.assertEqual(shared_cases.json()[0]["profile"]["fullName"], "Fictional Missing Person")

        affected = self.client.post(
            "/api/affected-persons",
            json={
                "profile": {
                    "fullName": "Fictional Missing Person",
                    "age": 32,
                    "gender": "Unknown / not recorded",
                },
                "foundDate": "2026-10-09",
                "foundLocation": "Fictional City",
                "currentLocation": "Fictional Demo Rescue",
                "conditionStatus": "Stable",
                "foundBy": "Fictional Finder Contact",
                "consented": True,
            },
            headers=finder_headers,
        )
        self.assertEqual(affected.status_code, 200, affected.text)
        affected_id = affected.json()["id"]

        matches = self.client.get("/api/matches", headers=finder_headers)
        self.assertEqual(matches.status_code, 200, matches.text)
        self.assertEqual(len(matches.json()), 1)
        candidate = matches.json()[0]
        self.assertEqual(candidate["caseId"], case_id)
        self.assertEqual(candidate["affectedPersonId"], affected_id)
        self.assertGreaterEqual(candidate["similarityPercent"], 25)
        self.assertIn("not identity confirmation", candidate["warnings"][0].lower())

        unauthorized_review = self.client.post(
            f"/api/matches/{candidate['id']}/verify",
            headers={"Authorization": f"Bearer {searcher_token}"},
            json={},
        )
        self.assertEqual(unauthorized_review.status_code, 403)

        other_user_id, other_org_id = self.organization(
            "other-demo-finder@example.test", "Fictional Other Organization"
        )
        self.assertEqual(
            database.get_row("profiles", other_user_id)["organization_id"], other_org_id
        )
        database.db.table("organizations").update(
            {"approval_status": "APPROVED"}
        ).eq("id", other_org_id).execute()
        other_login = self.client.post(
            "/api/auth/login",
            json={
                "email": "other-demo-finder@example.test",
                "password": "fictional-password",
                "portal": "finder",
                "organizationName": "Fictional Other Organization",
                "organizationType": "SHELTER",
            },
        )
        other_headers = {"Authorization": f"Bearer {other_login.json()['accessToken']}"}
        with patch("app.api.routes.DEMO_MODE", True):
            cross_org_review = self.client.post(
                f"/api/matches/{candidate['id']}/verify",
                headers=other_headers,
                json={},
            )
        self.assertEqual(cross_org_review.status_code, 403)

        with patch("app.api.routes.DEMO_MODE", True):
            verified = self.client.post(
                f"/api/matches/{candidate['id']}/verify",
                headers=finder_headers,
                json={},
            )
        self.assertEqual(verified.status_code, 200, verified.text)
        self.assertEqual(verified.json()["verificationStatus"], "COMPLETE")

        database.initialize_database()
        persisted_case = database.get_row("missing_cases", case_id)
        persisted_match = database.get_row("candidate_matches", candidate["id"])
        self.assertEqual(persisted_case["reporter_user_id"], searcher_id)
        self.assertEqual(persisted_case["status"], "VERIFIED")
        self.assertEqual(persisted_match["status"], "VERIFIED")
        updates = self.client.get(
            f"/api/case-updates/{case_id}",
            headers={"Authorization": f"Bearer {searcher_token}"},
        )
        self.assertEqual(updates.status_code, 200, updates.text)
        self.assertTrue(any(update["eventType"] == "MATCH_VERIFIED" for update in updates.json()))
        searcher_cases = self.client.get(
            "/api/missing-cases",
            headers={"Authorization": f"Bearer {searcher_token}"},
        )
        self.assertEqual(searcher_cases.json()[0]["status"], "VERIFIED")

    def test_searcher_report_persists_iso_date_and_ownership(self):
        owner_id, token = self.searcher()
        created = self.client.post(
            "/api/missing-cases",
            json=self.missing_payload(),
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        body = created.json()
        self.assertEqual(body["lastSeenDate"], "2026-10-09")
        case = database.get_row("missing_cases", body["id"])
        self.assertEqual(case["reporter_user_id"], owner_id)
        self.assertEqual(case["last_seen_date"], "2026-10-09")
        self.assertTrue(case["consented"])

        _, another_token = self.searcher("another@example.test")
        private_case = self.client.get(
            f"/api/missing-cases/{body['id']}",
            headers={"Authorization": f"Bearer {another_token}"},
        )
        self.assertEqual(private_case.status_code, 403)
        cases = self.client.get(
            "/api/missing-cases",
            headers={"Authorization": f"Bearer {another_token}"},
        )
        self.assertEqual(cases.json(), [])

    def test_report_requires_auth_and_validates_age_and_iso_date(self):
        no_auth = self.client.post("/api/missing-cases", json=self.missing_payload())
        self.assertEqual(no_auth.status_code, 401)
        _, token = self.searcher()
        headers = {"Authorization": f"Bearer {token}"}
        invalid_age = self.client.post(
            "/api/missing-cases", json=self.missing_payload(age=126), headers=headers
        )
        self.assertEqual(invalid_age.status_code, 422)
        with self.assertRaises(sqlite3.IntegrityError):
            database.insert_row("persons", {"age": 126})
        with self.assertRaises(sqlite3.IntegrityError):
            database.insert_row("persons", {"age": 10.5})
        invalid_date_payload = self.missing_payload()
        invalid_date_payload["lastSeenDate"] = "09/10/2026"
        invalid_date = self.client.post(
            "/api/missing-cases", json=invalid_date_payload, headers=headers
        )
        self.assertEqual(invalid_date.status_code, 422)
        valid_zero_age = self.client.post(
            "/api/missing-cases", json=self.missing_payload(age=0), headers=headers
        )
        self.assertEqual(valid_zero_age.status_code, 201, valid_zero_age.text)

    def test_missing_case_database_failure_returns_safe_error(self):
        _, token = self.searcher()
        with patch(
            "app.api.routes.create_missing_case",
            side_effect=sqlite3.OperationalError("private database path"),
        ):
            response = self.client.post(
                "/api/missing-cases",
                json=self.missing_payload(),
                headers={"Authorization": f"Bearer {token}"},
            )
        self.assertEqual(response.status_code, 500)
        self.assertIn("local database could not save", response.json()["detail"])
        self.assertNotIn("private database path", response.text)

    def test_searcher_case_updates_are_persisted(self):
        _, token = self.searcher()
        headers = {"Authorization": f"Bearer {token}"}
        created = self.client.post(
            "/api/missing-cases", json=self.missing_payload(), headers=headers
        )
        case_id = created.json()["id"]
        updated = self.client.patch(
            f"/api/missing-cases/{case_id}",
            json={"status": "SEARCHING"},
            headers=headers,
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["status"], "SEARCHING")
        events = self.client.get(f"/api/case-updates/{case_id}", headers=headers)
        self.assertEqual(events.status_code, 200)
        self.assertEqual(events.json()[0]["eventType"], "STATUS_CHANGED")

    def test_finder_records_are_scoped_to_approved_organization(self):
        _, first_org, first_token = self.finder_token(
            "finder1@example.test", "Fictional Shelter One"
        )
        _, _, other_token = self.finder_token(
            "finder2@example.test", "Fictional Shelter Two"
        )
        payload = {
            "profile": {
                "fullName": "Fictional Affected Person",
                "age": 31,
                "gender": "Unknown / not recorded",
            },
            "foundDate": "2026-10-09",
            "foundLocation": "Fictional City",
            "currentLocation": "Fictional Shelter",
            "conditionStatus": "Stable",
            "foundBy": "Fictional Contact",
            "medicalConditionSummary": "Fictional private test note",
            "consented": True,
        }
        created = self.client.post(
            "/api/affected-persons",
            json=payload,
            headers={"Authorization": f"Bearer {first_token}"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        record = database.get_row("affected_person_records", created.json()["id"])
        self.assertEqual(record["organization_id"], first_org)
        self.assertEqual(record["found_date"], "2026-10-09")

        first_list = self.client.get(
            "/api/affected-persons", headers={"Authorization": f"Bearer {first_token}"}
        )
        other_list = self.client.get(
            "/api/affected-persons", headers={"Authorization": f"Bearer {other_token}"}
        )
        self.assertEqual(len(first_list.json()), 1)
        self.assertEqual(other_list.json(), [])
        self.assertNotIn("medicalConditionSummary", first_list.json()[0])
        forbidden_detail = self.client.get(
            f"/api/affected-persons/{created.json()['id']}",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        self.assertEqual(forbidden_detail.status_code, 403)

    def test_verification_requires_command_center_and_persists_audit(self):
        _, searcher_token = self.searcher()
        _, organization_id, finder_token = self.finder_token(
            "finder@example.test", "Fictional Shelter"
        )
        missing = self.client.post(
            "/api/missing-cases",
            json=self.missing_payload(),
            headers={"Authorization": f"Bearer {searcher_token}"},
        ).json()
        affected_payload = {
            "profile": {
                "fullName": "Fictional Missing Person",
                "age": 32,
                "gender": "Unknown / not recorded",
            },
            "foundDate": "2026-10-09",
            "foundLocation": "Fictional City",
            "currentLocation": "Fictional Shelter",
            "conditionStatus": "Stable",
            "foundBy": "Fictional Contact",
            "consented": True,
        }
        affected = self.client.post(
            "/api/affected-persons",
            json=affected_payload,
            headers={"Authorization": f"Bearer {finder_token}"},
        )
        self.assertEqual(affected.status_code, 200, affected.text)
        matches = self.client.get(
            f"/api/matches/{missing['id']}",
            headers={"Authorization": f"Bearer {finder_token}"},
        )
        self.assertGreaterEqual(len(matches.json()), 1)

        command_id = register_local_user(
            "coordinator@example.test",
            "fictional-password",
        )
        database.insert_row(
            "profiles",
            {"id": command_id, "role": "COMMAND_CENTER", "full_name": "Fictional Coordinator"},
        )
        command_login = self.client.post(
            "/api/auth/login",
            json={
                "email": "coordinator@example.test",
                "password": "fictional-password",
                "portal": "command_center",
            },
        )
        self.assertEqual(command_login.status_code, 200, command_login.text)
        token = command_login.json()["accessToken"]
        verification = self.client.post(
            f"/api/matches/{matches.json()[0]['id']}/verify",
            json={"notes": "Fictional test verification"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(verification.status_code, 200, verification.text)
        self.assertEqual(
            database.all_rows("verifications")[0]["decision"],
            "VERIFIED",
        )
        self.assertEqual(
            database.get_row("missing_cases", missing["id"])["status"],
            "VERIFIED",
        )

    def test_photo_upload_is_local_and_signed_link_expires(self):
        user_id, token = self.searcher()
        png_bytes = b"\x89PNG\r\n\x1a\n" + b"fictional-image-data"
        uploaded = self.client.post(
            "/api/photos",
            files={"file": ("fictional.png", png_bytes, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        path = uploaded.json()["photoPath"]
        photo = database.all_rows("photo_uploads")[0]
        self.assertEqual(photo["owner_user_id"], user_id)
        self.assertEqual(photo["size_bytes"], len(png_bytes))
        report_payload = self.missing_payload()
        report_payload["profile"]["photoPath"] = path
        report = self.client.post(
            "/api/missing-cases",
            json=report_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(report.status_code, 201, report.text)
        signed = self.client.get(
            "/api/photos/signed-url",
            params={"path": path},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(signed.status_code, 200, signed.text)
        from urllib.parse import urlparse

        local_url = urlparse(signed.json()["url"])
        served = self.client.get(f"{local_url.path}?{local_url.query}")
        self.assertEqual(served.status_code, 200)
        self.assertEqual(served.content, png_bytes)


if __name__ == "__main__":
    unittest.main()
