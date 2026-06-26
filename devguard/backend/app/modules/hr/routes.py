from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.models import (
    Employee, Consent, Analysis, HRMetrics, Alert,
    VoiceRecording, FaceAnalysis, Conversation, Message,
)
from app.core.security import get_current_hr
from pydantic import BaseModel

router = APIRouter(prefix="/hr", tags=["hr-dashboard"])


# ── Pydantic response models ───────────────────────────────────────────────────

class EmployeeListItem(BaseModel):
    id: int
    name: str
    email: str
    department: Optional[str]
    position: Optional[str]
    is_active: bool
    risk_category: Optional[str] = None
    retention_risk: Optional[float] = None
    burnout_risk: Optional[float] = None
    quit_risk: Optional[float] = None
    last_active: Optional[datetime] = None

    class Config:
        from_attributes = True


class DashboardOverview(BaseModel):
    total_employees: int
    active_employees: int
    high_risk_count: int
    critical_risk_count: int
    avg_burnout_risk: float
    avg_retention_risk: float


class EmployeeDetail(BaseModel):
    id: int
    name: str
    email: str
    department: Optional[str]
    position: Optional[str]
    risk_category: Optional[str]
    burnout_risk: Optional[float]
    quit_risk: Optional[float]
    retention_risk: Optional[float]
    avg_sentiment: Optional[float]
    avg_stress: Optional[float]
    avg_engagement: Optional[float]
    risk_reasons: Optional[list]
    recommendations: Optional[dict]
    consent: Optional[dict]
    message_count: int
    voice_count: int
    face_count: int


class AlertOut(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    alert_type: str
    severity: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SentimentTrend(BaseModel):
    date: str
    avg_sentiment: float
    avg_stress: float
    avg_engagement: float
    message_count: int


class VoiceSummary(BaseModel):
    employee_id: int
    employee_name: str
    avg_pitch: Optional[float]
    avg_energy: Optional[float]
    avg_tempo: Optional[float]
    avg_stress: Optional[float]
    avg_confidence: Optional[float]
    recording_count: int


class FaceSummary(BaseModel):
    emotion: str
    count: int
    percentage: float


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardOverview)
def get_dashboard(
    _: Employee = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    total = db.query(Employee).filter(Employee.role == "employee").count()
    active = db.query(Employee).filter(
        Employee.role == "employee", Employee.is_active == True
    ).count()

    metrics = db.query(HRMetrics).all()
    high = sum(1 for m in metrics if m.risk_category == "high")
    critical = sum(1 for m in metrics if m.risk_category == "critical")
    avg_burnout = sum(m.burnout_risk for m in metrics) / len(metrics) if metrics else 0.0
    avg_retention = sum(m.retention_risk for m in metrics) / len(metrics) if metrics else 0.0

    return DashboardOverview(
        total_employees=total,
        active_employees=active,
        high_risk_count=high,
        critical_risk_count=critical,
        avg_burnout_risk=round(avg_burnout, 2),
        avg_retention_risk=round(avg_retention, 2),
    )


@router.get("/employees", response_model=List[EmployeeListItem])
def list_employees(
    _: Employee = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    employees = db.query(Employee).filter(Employee.role == "employee").all()
    result = []
    for emp in employees:
        metrics = db.query(HRMetrics).filter(HRMetrics.employee_id == emp.id).first()
        last_msg = (
            db.query(Message)
            .filter(Message.employee_id == emp.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        result.append(
            EmployeeListItem(
                id=emp.id,
                name=emp.name,
                email=emp.email,
                department=emp.department,
                position=emp.position,
                is_active=emp.is_active,
                risk_category=metrics.risk_category if metrics else None,
                retention_risk=metrics.retention_risk if metrics else None,
                burnout_risk=metrics.burnout_risk if metrics else None,
                quit_risk=metrics.quit_risk if metrics else None,
                last_active=last_msg.created_at if last_msg else None,
            )
        )
    return result


@router.get("/employees/{employee_id}", response_model=EmployeeDetail)
def get_employee_detail(
    employee_id: int,
    _: Employee = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(
        Employee.id == employee_id, Employee.role == "employee"
    ).first()
    if not emp:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Employee not found")

    metrics = db.query(HRMetrics).filter(HRMetrics.employee_id == employee_id).first()
    consent = db.query(Consent).filter(Consent.employee_id == employee_id).first()
    msg_count = db.query(Message).filter(Message.employee_id == employee_id).count()
    voice_count = db.query(VoiceRecording).filter(
        VoiceRecording.employee_id == employee_id
    ).count()
    face_count = db.query(FaceAnalysis).filter(
        FaceAnalysis.employee_id == employee_id
    ).count()

    return EmployeeDetail(
        id=emp.id,
        name=emp.name,
        email=emp.email,
        department=emp.department,
        position=emp.position,
        risk_category=metrics.risk_category if metrics else None,
        burnout_risk=metrics.burnout_risk if metrics else None,
        quit_risk=metrics.quit_risk if metrics else None,
        retention_risk=metrics.retention_risk if metrics else None,
        avg_sentiment=metrics.avg_sentiment if metrics else None,
        avg_stress=metrics.avg_stress if metrics else None,
        avg_engagement=metrics.avg_engagement if metrics else None,
        risk_reasons=metrics.risk_reasons if metrics else [],
        recommendations=metrics.recommendations if metrics else {},
        consent={
            "chat_analysis": consent.chat_analysis if consent else False,
            "voice_analysis": consent.voice_analysis if consent else False,
            "face_analysis": consent.face_analysis if consent else False,
        },
        message_count=msg_count,
        voice_count=voice_count,
        face_count=face_count,
    )


@router.get("/analysis/trends", response_model=List[SentimentTrend])
def get_sentiment_trends(
    days: int = Query(30, ge=1, le=90),
    _: Employee = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    analyses = (
        db.query(Analysis)
        .filter(Analysis.created_at >= since)
        .order_by(Analysis.created_at.asc())
        .all()
    )

    # Group by date
    by_date: dict = {}
    for a in analyses:
        date_key = a.created_at.strftime("%Y-%m-%d")
        if date_key not in by_date:
            by_date[date_key] = {
                "sentiment_sum": 0.0,
                "stress_sum": 0.0,
                "engagement_sum": 0.0,
                "count": 0,
            }
        by_date[date_key]["sentiment_sum"] += a.sentiment_score or 0
        by_date[date_key]["stress_sum"] += a.stress_level or 0
        by_date[date_key]["engagement_sum"] += a.engagement_score or 0
        by_date[date_key]["count"] += 1

    return [
        SentimentTrend(
            date=date,
            avg_sentiment=round(v["sentiment_sum"] / v["count"], 4),
            avg_stress=round(v["stress_sum"] / v["count"], 2),
            avg_engagement=round(v["engagement_sum"] / v["count"], 2),
            message_count=v["count"],
        )
        for date, v in sorted(by_date.items())
    ]


@router.get("/voice/summary", response_model=List[VoiceSummary])
def get_voice_summary(
    _: Employee = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    employees = db.query(Employee).filter(Employee.role == "employee").all()
    result = []
    for emp in employees:
        records = (
            db.query(VoiceRecording)
            .filter(VoiceRecording.employee_id == emp.id)
            .all()
        )
        if not records:
            continue
        count = len(records)
        avg = lambda field: (
            sum(getattr(r, field) or 0 for r in records) / count
        )
        result.append(
            VoiceSummary(
                employee_id=emp.id,
                employee_name=emp.name,
                avg_pitch=round(avg("pitch_mean"), 2) if any(r.pitch_mean for r in records) else None,
                avg_energy=round(avg("rms_energy"), 6) if any(r.rms_energy for r in records) else None,
                avg_tempo=round(avg("tempo"), 2) if any(r.tempo for r in records) else None,
                avg_stress=round(avg("stress_score"), 2) if any(r.stress_score for r in records) else None,
                avg_confidence=round(avg("confidence_score"), 2) if any(r.confidence_score for r in records) else None,
                recording_count=count,
            )
        )
    return result


@router.get("/face/summary", response_model=List[FaceSummary])
def get_face_summary(
    _: Employee = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    records = db.query(FaceAnalysis).all()
    if not records:
        return []
    by_emotion: dict = {}
    for r in records:
        em = r.dominant_emotion or "neutral"
        by_emotion[em] = by_emotion.get(em, 0) + 1
    total = len(records)
    return [
        FaceSummary(
            emotion=emotion,
            count=count,
            percentage=round(count / total * 100, 2),
        )
        for emotion, count in sorted(by_emotion.items(), key=lambda x: -x[1])
    ]


@router.get("/alerts", response_model=List[AlertOut])
def get_alerts(
    unread_only: bool = Query(False),
    _: Employee = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    query = db.query(Alert)
    if unread_only:
        query = query.filter(Alert.is_read == False)
    alerts = query.order_by(Alert.created_at.desc()).limit(100).all()

    result = []
    for a in alerts:
        emp = db.query(Employee).filter(Employee.id == a.employee_id).first()
        result.append(
            AlertOut(
                id=a.id,
                employee_id=a.employee_id,
                employee_name=emp.name if emp else "Unknown",
                alert_type=a.alert_type,
                severity=a.severity,
                message=a.message,
                is_read=a.is_read,
                created_at=a.created_at,
            )
        )
    return result


@router.patch("/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    _: Employee = Depends(get_current_hr),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"status": "ok"}