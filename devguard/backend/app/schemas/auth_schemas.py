from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    department: Optional[str] = None
    position: Optional[str] = None
    role: Optional[str] = "employee"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    employee_id: int


# ── Employee Schemas ───────────────────────────────────────────────────────────

class EmployeeBase(BaseModel):
    email: str
    name: str
    department: Optional[str] = None
    position: Optional[str] = None
    role: str
    is_active: bool


class EmployeePublic(EmployeeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeProfile(BaseModel):
    id: int
    email: str
    name: str
    department: Optional[str]
    position: Optional[str]
    role: str

    class Config:
        from_attributes = True


# ── Consent Schemas ────────────────────────────────────────────────────────────

class ConsentUpdate(BaseModel):
    chat_analysis: bool
    voice_analysis: bool
    face_analysis: bool


class ConsentResponse(BaseModel):
    chat_analysis: bool
    voice_analysis: bool
    face_analysis: bool
    consented_at: Optional[datetime]

    class Config:
        from_attributes = True