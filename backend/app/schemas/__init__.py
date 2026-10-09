from __future__ import annotations

import re
from datetime import date, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _valid_email(value: str) -> str:
    email = value.strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValueError("A valid email address is required")
    return email


def _validate_passwords(password: str, confirm_password: str) -> None:
    if password != confirm_password:
        raise ValueError("Password confirmation does not match")


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=1024)
    portal: Literal["searcher", "finder", "command_center"]
    organizationName: str | None = Field(default=None, max_length=200)
    organizationType: Literal[
        "HOSPITAL",
        "SHELTER",
        "RESCUE_CENTER",
        "RELIEF_CAMP",
        "NGO",
        "EMERGENCY_RESPONSE",
        "OTHER",
    ] | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _valid_email(value)

    @field_validator("organizationName")
    @classmethod
    def validate_organization_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Organization name is required")
        return cleaned

    @model_validator(mode="after")
    def validate_finder_organization(self) -> LoginRequest:
        if self.portal == "finder" and (
            self.organizationName is None or self.organizationType is None
        ):
            raise ValueError("Organization name and type are required for Finder login")
        return self

class SearcherRegistrationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fullName: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=1024)
    confirmPassword: str = Field(min_length=8, max_length=1024)

    @field_validator("fullName")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Name is required")
        return name

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _valid_email(value)

    @model_validator(mode="after")
    def validate_password_confirmation(self) -> SearcherRegistrationRequest:
        _validate_passwords(self.password, self.confirmPassword)
        return self


class FinderOrganizationRegistrationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    organizationName: str = Field(min_length=1, max_length=200)
    organizationType: Literal[
        "HOSPITAL",
        "SHELTER",
        "RESCUE_CENTER",
        "RELIEF_CAMP",
        "NGO",
        "EMERGENCY_RESPONSE",
        "OTHER",
    ]
    contactPersonName: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=320)
    phone: str = Field(min_length=1, max_length=40)
    location: str = Field(min_length=1, max_length=500)
    password: str = Field(min_length=8, max_length=1024)
    confirmPassword: str = Field(min_length=8, max_length=1024)

    @field_validator("organizationName", "contactPersonName", "phone", "location")
    @classmethod
    def validate_non_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field is required")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _valid_email(value)

    @model_validator(mode="after")
    def validate_password_confirmation(self) -> FinderOrganizationRegistrationRequest:
        _validate_passwords(self.password, self.confirmPassword)
        return self


class PersonProfileInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fullName: str | None = Field(default=None, max_length=200)
    alias: str | None = Field(default=None, max_length=200)
    age: int | None = Field(default=None, ge=0, le=125)
    gender: str | None = Field(default=None, max_length=80)
    photoPath: str | None = Field(default=None, max_length=500)
    distinguishingMarks: str | None = Field(default=None, max_length=4000)
    clothingDescription: str | None = Field(default=None, max_length=4000)
    additionalDescription: str | None = Field(default=None, max_length=4000)


class MissingCaseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile: PersonProfileInput
    relationship: str = Field(min_length=1, max_length=100)
    reporterName: str = Field(min_length=1, max_length=200)
    reporterEmail: str | None = Field(default=None, max_length=320)
    reporterPhone: str = Field(min_length=1, max_length=40)
    preferredContactMethod: str = Field(default="Phone", max_length=40)
    consented: bool
    lastSeenDate: date
    lastSeenTime: time | None = None
    lastSeenLocation: str = Field(min_length=1, max_length=500)
    lastSeenCircumstances: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def validate_person_fields(self) -> MissingCaseCreate:
        if not self.profile.fullName or not self.profile.fullName.strip():
            raise ValueError("A missing person's full name is required")
        if self.profile.age is None or not self.profile.gender:
            raise ValueError("Age and gender are required")
        return self

    @field_validator("reporterEmail")
    @classmethod
    def validate_reporter_email(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return _valid_email(value)


class AffectedPersonCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile: PersonProfileInput
    facilityName: str | None = Field(default=None, max_length=300)
    foundDate: date
    foundTime: time | None = None
    foundLocation: str = Field(min_length=1, max_length=500)
    currentLocation: str = Field(min_length=1, max_length=500)
    conditionStatus: str = Field(min_length=1, max_length=100)
    foundBy: str = Field(min_length=1, max_length=200)
    medicalConditionSummary: str | None = Field(default=None, max_length=4000)
    medicationInformation: str | None = Field(default=None, max_length=4000)
    immediateCareRequired: str | None = Field(default=None, max_length=4000)
    accessibilityNeeds: str | None = Field(default=None, max_length=4000)
    consented: bool

    @model_validator(mode="after")
    def validate_person_fields(self) -> AffectedPersonCreate:
        if self.profile.age is None or not self.profile.gender:
            raise ValueError("Age and gender are required")
        return self