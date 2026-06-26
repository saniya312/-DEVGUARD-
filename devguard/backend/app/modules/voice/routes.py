from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Employee, Consent, VoiceRecording, Conversation
from app.core.security import get_current_user
from app.modules.voice.schemas import VoiceResponse
from app.modules.voice.services import analyze_voice
from app.modules.chat.services import generate_chat_reply, analyze_message
from app.models.models import Message, Analysis
from app.modules.risk.engine import update_hr_metrics

router = APIRouter(tags=["voice"])


@router.post("/voice", response_model=VoiceResponse)
async def voice_chat(
    audio: UploadFile = File(...),
    conversation_id: Optional[int] = Form(None),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Transcribe + analyze voice
    voice_result = await analyze_voice(audio_bytes, audio.filename or "audio.webm")
    transcript = voice_result.transcript

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Could not transcribe audio")

    # Resolve or create conversation
    if conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.employee_id == current_user.id,
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            employee_id=current_user.id,
            title=transcript[:50] + ("…" if len(transcript) > 50 else ""),
        )
        db.add(conversation)
        db.flush()

    # Build history
    from app.models.models import Message as Msg
    past = (
        db.query(Msg)
        .filter(Msg.conversation_id == conversation.id)
        .order_by(Msg.created_at.asc())
        .limit(40)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in past]

    # Generate chat reply from transcript
    reply = await generate_chat_reply(transcript, history)

    # Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        employee_id=current_user.id,
        role="user",
        content=transcript,
    )
    db.add(user_msg)
    db.flush()

    # Save assistant message
    assistant_msg = Message(
        conversation_id=conversation.id,
        employee_id=current_user.id,
        role="assistant",
        content=reply,
    )
    db.add(assistant_msg)
    db.flush()

    # Store voice recording
    consent = db.query(Consent).filter(Consent.employee_id == current_user.id).first()
    recording = VoiceRecording(
        employee_id=current_user.id,
        conversation_id=conversation.id,
        transcript=transcript,
        duration_seconds=voice_result.duration_seconds,
    )

    if consent and consent.voice_analysis:
        recording.pitch_mean = voice_result.pitch_mean
        recording.pitch_std = voice_result.pitch_std
        recording.rms_energy = voice_result.rms_energy
        recording.tempo = voice_result.tempo
        recording.pause_count = voice_result.pause_count
        recording.silence_ratio = voice_result.silence_ratio
        recording.stress_score = voice_result.stress_score
        recording.confidence_score = voice_result.confidence_score
        recording.mood_indicator = voice_result.mood_indicator

    db.add(recording)
    db.flush()

    # Chat analysis if consented
    if consent and consent.chat_analysis:
        analysis_data = await analyze_message(transcript)
        analysis = Analysis(
            message_id=user_msg.id,
            employee_id=current_user.id,
            sentiment=analysis_data.get("sentiment"),
            sentiment_score=analysis_data.get("sentiment_score"),
            mood=analysis_data.get("mood"),
            stress_level=analysis_data.get("stress_level"),
            engagement_score=analysis_data.get("engagement_score"),
            language_detected=analysis_data.get("language_detected"),
            raw_analysis=analysis_data,
        )
        db.add(analysis)
        db.flush()
        await update_hr_metrics(current_user.id, db)

    from datetime import datetime
    conversation.updated_at = datetime.utcnow()
    db.commit()

    return VoiceResponse(
        transcript=transcript,
        reply=reply,
        conversation_id=conversation.id,
        recording_id=recording.id,
    )