from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import (
    Employee, Consent, Conversation, Message, Analysis, HRMetrics, Alert,
)
from app.core.security import get_current_user
from app.modules.chat.schemas import (
    ChatRequest, ChatResponse, ConversationOut, ConversationDetail, MessageOut,
)
from app.modules.chat.services import analyze_message, generate_chat_reply
from app.modules.risk.engine import update_hr_metrics

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Resolve or create conversation
    if payload.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == payload.conversation_id,
            Conversation.employee_id == current_user.id,
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Auto-title from first 50 chars
        title = payload.message[:50] + ("…" if len(payload.message) > 50 else "")
        conversation = Conversation(
            employee_id=current_user.id,
            title=title,
        )
        db.add(conversation)
        db.flush()

    # Build history for context
    past_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .limit(40)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in past_messages]

    # Generate AI reply
    reply = await generate_chat_reply(payload.message, history)

    # Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        employee_id=current_user.id,
        role="user",
        content=payload.message,
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

    # Update conversation timestamp
    from datetime import datetime
    conversation.updated_at = datetime.utcnow()
    db.flush()

    # Run analysis if consent given
    consent = db.query(Consent).filter(Consent.employee_id == current_user.id).first()
    if consent and consent.chat_analysis:
        analysis_data = await analyze_message(payload.message)
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
        # Update aggregate HR metrics
        await update_hr_metrics(current_user.id, db)

    db.commit()
    return ChatResponse(
        reply=reply,
        conversation_id=conversation.id,
        message_id=user_msg.id,
    )


@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversations = (
        db.query(Conversation)
        .filter(Conversation.employee_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for c in conversations:
        count = db.query(Message).filter(Message.conversation_id == c.id).count()
        result.append(
            ConversationOut(
                id=c.id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=count,
            )
        )
    return result


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.employee_id == current_user.id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        messages=[MessageOut.model_validate(m) for m in messages],
    )