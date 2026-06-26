import json
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func


async def update_hr_metrics(employee_id: int, db: Session):
    """Recalculate and upsert HR metrics for an employee."""
    from app.models.models import Analysis, VoiceRecording, FaceAnalysis, HRMetrics, Alert

    # Aggregate chat analyses (last 30)
    analyses = (
        db.query(Analysis)
        .filter(Analysis.employee_id == employee_id)
        .order_by(Analysis.created_at.desc())
        .limit(30)
        .all()
    )

    if not analyses:
        return

    avg_sentiment = sum(a.sentiment_score or 0 for a in analyses) / len(analyses)
    avg_stress = sum(a.stress_level or 0 for a in analyses) / len(analyses)
    avg_engagement = sum(a.engagement_score or 0 for a in analyses) / len(analyses)

    negative_ratio = sum(1 for a in analyses if a.sentiment == "negative") / len(analyses)

    # Voice stress
    voice_records = (
        db.query(VoiceRecording)
        .filter(
            VoiceRecording.employee_id == employee_id,
            VoiceRecording.stress_score.isnot(None),
        )
        .order_by(VoiceRecording.created_at.desc())
        .limit(10)
        .all()
    )
    voice_stress = (
        sum(v.stress_score for v in voice_records) / len(voice_records)
        if voice_records else None
    )

    # Face mood
    face_records = (
        db.query(FaceAnalysis)
        .filter(FaceAnalysis.employee_id == employee_id)
        .order_by(FaceAnalysis.created_at.desc())
        .limit(10)
        .all()
    )
    face_negative = 0.0
    if face_records:
        face_negative = sum(
            (f.sad_score + f.angry_score + f.fear_score) / 100.0
            for f in face_records
        ) / len(face_records)

    # ── Burnout Risk ──────────────────────────────────────────────────────────
    burnout = 0.0
    burnout += avg_stress * 0.4
    burnout += (1 - avg_engagement / 100) * 30
    burnout += negative_ratio * 20
    if voice_stress:
        burnout += voice_stress * 0.1
    burnout = min(burnout, 100.0)

    # ── Quit Risk ─────────────────────────────────────────────────────────────
    quit_risk = 0.0
    quit_risk += negative_ratio * 40
    quit_risk += max(0, avg_stress - 50) * 0.5
    quit_risk += max(0, 50 - avg_engagement) * 0.4
    if face_negative > 0.5:
        quit_risk += 15
    quit_risk = min(quit_risk, 100.0)

    # ── Retention Risk ────────────────────────────────────────────────────────
    retention = (burnout * 0.4 + quit_risk * 0.6)
    retention = min(retention, 100.0)

    # Category
    def category(score):
        if score <= 30:
            return "low"
        if score <= 60:
            return "medium"
        if score <= 80:
            return "high"
        return "critical"

    risk_cat = category(retention)

    # Reasons
    reasons = []
    if avg_stress > 60:
        reasons.append("Consistently high stress levels detected in conversations")
    if avg_engagement < 40:
        reasons.append("Low engagement score in recent interactions")
    if negative_ratio > 0.5:
        reasons.append("Majority of messages showing negative sentiment")
    if voice_stress and voice_stress > 65:
        reasons.append("Voice analysis indicates elevated stress")
    if face_negative > 0.5:
        reasons.append("Facial analysis showing predominantly negative emotions")

    # Recommendations from Groq
    recommendations = await _generate_recommendations(
        employee_id, risk_cat, reasons, avg_stress, avg_engagement, db
    )

    # Upsert HRMetrics
    existing = db.query(HRMetrics).filter(HRMetrics.employee_id == employee_id).first()
    if existing:
        existing.burnout_risk = round(burnout, 2)
        existing.quit_risk = round(quit_risk, 2)
        existing.retention_risk = round(retention, 2)
        existing.risk_category = risk_cat
        existing.avg_sentiment = round(avg_sentiment, 4)
        existing.avg_stress = round(avg_stress, 2)
        existing.avg_engagement = round(avg_engagement, 2)
        existing.recommendations = recommendations
        existing.risk_reasons = reasons
        existing.updated_at = datetime.utcnow()
    else:
        metrics = HRMetrics(
            employee_id=employee_id,
            burnout_risk=round(burnout, 2),
            quit_risk=round(quit_risk, 2),
            retention_risk=round(retention, 2),
            risk_category=risk_cat,
            avg_sentiment=round(avg_sentiment, 4),
            avg_stress=round(avg_stress, 2),
            avg_engagement=round(avg_engagement, 2),
            recommendations=recommendations,
            risk_reasons=reasons,
        )
        db.add(metrics)

    # Create alert if high/critical
    if risk_cat in ("high", "critical"):
        from app.models.models import Employee as Emp
        emp = db.query(Emp).filter(Emp.id == employee_id).first()
        alert = Alert(
            employee_id=employee_id,
            alert_type="retention_risk",
            severity=risk_cat,
            message=f"{emp.name if emp else 'Employee'} has {risk_cat} retention risk (score: {retention:.0f})",
        )
        db.add(alert)

    db.flush()


async def _generate_recommendations(
    employee_id: int,
    risk_cat: str,
    reasons: list,
    avg_stress: float,
    avg_engagement: float,
    db: Session,
) -> dict:
    """Use Groq to generate dynamic HR recommendations."""
    if risk_cat not in ("high", "critical"):
        return {}

    try:
        from groq import Groq
        from app.core.config import settings

        client = Groq(api_key=settings.GROQ_API_KEY)
        prompt = f"""An HR system has flagged an employee with {risk_cat} risk.
Risk reasons: {', '.join(reasons) if reasons else 'General wellbeing concerns'}
Average stress level: {avg_stress:.0f}/100
Average engagement: {avg_engagement:.0f}/100

Return ONLY a valid JSON object:
{{
  "hr_actions": ["action1", "action2", "action3"],
  "wellness_recommendations": ["rec1", "rec2"],
  "follow_up_suggestions": ["suggestion1", "suggestion2"]
}}"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert HR consultant. Return only valid JSON. No markdown.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=400,
        )
        import re
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json\s*|\s*```", "", raw).strip()
        return json.loads(raw)
    except Exception:
        return {
            "hr_actions": [
                "Schedule a 1-on-1 conversation with the employee",
                "Review workload distribution in the team",
                "Connect employee with EAP resources",
            ],
            "wellness_recommendations": [
                "Encourage regular breaks and time-off",
                "Discuss career growth opportunities",
            ],
            "follow_up_suggestions": [
                "Check in again in 2 weeks",
                "Monitor wellbeing scores over next month",
            ],
        }