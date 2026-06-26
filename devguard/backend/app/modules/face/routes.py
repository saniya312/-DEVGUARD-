from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Employee, Consent, FaceAnalysis
from app.core.security import get_current_user
from app.modules.face.schemas import FaceAnalysisResponse
from app.modules.face.services import analyze_face_image

router = APIRouter(tags=["face"])


@router.post("/face", response_model=FaceAnalysisResponse)
async def analyze_face(
    image: UploadFile = File(...),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    consent = db.query(Consent).filter(Consent.employee_id == current_user.id).first()
    if not consent or not consent.face_analysis:
        raise HTTPException(
            status_code=403,
            detail="Face analysis consent not given",
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image")

    result = analyze_face_image(image_bytes)

    face_record = FaceAnalysis(
        employee_id=current_user.id,
        dominant_emotion=result["dominant_emotion"],
        happy_score=result["happy_score"],
        sad_score=result["sad_score"],
        neutral_score=result["neutral_score"],
        angry_score=result["angry_score"],
        surprise_score=result["surprise_score"],
        fear_score=result["fear_score"],
    )
    db.add(face_record)
    db.commit()
    db.refresh(face_record)

    return FaceAnalysisResponse(
        dominant_emotion=face_record.dominant_emotion,
        happy_score=face_record.happy_score,
        sad_score=face_record.sad_score,
        neutral_score=face_record.neutral_score,
        angry_score=face_record.angry_score,
        surprise_score=face_record.surprise_score,
        fear_score=face_record.fear_score,
        analysis_id=face_record.id,
    )