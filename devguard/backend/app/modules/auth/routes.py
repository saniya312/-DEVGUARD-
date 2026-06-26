from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Employee, Consent
from app.schemas.auth_schemas import (
    RegisterRequest, LoginRequest, TokenResponse,
    EmployeeProfile, ConsentUpdate, ConsentResponse,
)
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(Employee).filter(Employee.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    employee = Employee(
        email=payload.email,
        name=payload.name,
        hashed_password=get_password_hash(payload.password),
        department=payload.department,
        position=payload.position,
        role=payload.role if payload.role in ("employee", "hr") else "employee",
    )
    db.add(employee)
    db.flush()

    # Create blank consent record
    consent = Consent(employee_id=employee.id)
    db.add(consent)
    db.commit()
    db.refresh(employee)

    token = create_access_token({"sub": str(employee.id), "role": employee.role})
    return TokenResponse(
        access_token=token,
        role=employee.role,
        name=employee.name,
        employee_id=employee.id,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.email == payload.email).first()
    if not employee or not verify_password(payload.password, employee.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not employee.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": str(employee.id), "role": employee.role})
    return TokenResponse(
        access_token=token,
        role=employee.role,
        name=employee.name,
        employee_id=employee.id,
    )


@router.get("/me", response_model=EmployeeProfile)
def me(current_user: Employee = Depends(get_current_user)):
    return current_user


@router.get("/consent", response_model=ConsentResponse)
def get_consent(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    consent = db.query(Consent).filter(Consent.employee_id == current_user.id).first()
    if not consent:
        consent = Consent(employee_id=current_user.id)
        db.add(consent)
        db.commit()
        db.refresh(consent)
    return consent


@router.put("/consent", response_model=ConsentResponse)
def update_consent(
    payload: ConsentUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    consent = db.query(Consent).filter(Consent.employee_id == current_user.id).first()
    if not consent:
        consent = Consent(employee_id=current_user.id)
        db.add(consent)

    consent.chat_analysis = payload.chat_analysis
    consent.voice_analysis = payload.voice_analysis
    consent.face_analysis = payload.face_analysis
    consent.consented_at = datetime.utcnow()
    db.commit()
    db.refresh(consent)
    return consent