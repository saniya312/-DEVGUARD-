from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    Text, ForeignKey, JSON,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="employee")  # "employee" or "hr"
    department = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    consent = relationship("Consent", back_populates="employee", uselist=False)
    conversations = relationship("Conversation", back_populates="employee")
    voice_recordings = relationship("VoiceRecording", back_populates="employee")
    face_analyses = relationship("FaceAnalysis", back_populates="employee")
    hr_metrics = relationship("HRMetrics", back_populates="employee")
    alerts = relationship("Alert", back_populates="employee")


class Consent(Base):
    __tablename__ = "consents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), unique=True, nullable=False)
    chat_analysis = Column(Boolean, default=False)
    voice_analysis = Column(Boolean, default=False)
    face_analysis = Column(Boolean, default=False)
    consented_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="consent")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    language_detected = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    analysis = relationship("Analysis", back_populates="message", uselist=False)


class VoiceRecording(Base):
    __tablename__ = "voice_recordings"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    transcript = Column(Text, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    pitch_mean = Column(Float, nullable=True)
    pitch_std = Column(Float, nullable=True)
    rms_energy = Column(Float, nullable=True)
    tempo = Column(Float, nullable=True)
    pause_count = Column(Integer, nullable=True)
    silence_ratio = Column(Float, nullable=True)
    stress_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    mood_indicator = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="voice_recordings")


class FaceAnalysis(Base):
    __tablename__ = "face_analyses"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    dominant_emotion = Column(String(50), nullable=True)
    happy_score = Column(Float, default=0.0)
    sad_score = Column(Float, default=0.0)
    neutral_score = Column(Float, default=0.0)
    angry_score = Column(Float, default=0.0)
    surprise_score = Column(Float, default=0.0)
    fear_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="face_analyses")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    sentiment = Column(String(50), nullable=True)       # positive / negative / neutral
    sentiment_score = Column(Float, nullable=True)      # -1.0 to 1.0
    mood = Column(String(50), nullable=True)
    stress_level = Column(Float, nullable=True)         # 0-100
    engagement_score = Column(Float, nullable=True)     # 0-100
    language_detected = Column(String(50), nullable=True)
    raw_analysis = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("Message", back_populates="analysis")


class HRMetrics(Base):
    __tablename__ = "hr_metrics"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    burnout_risk = Column(Float, default=0.0)       # 0-100
    quit_risk = Column(Float, default=0.0)          # 0-100
    retention_risk = Column(Float, default=0.0)     # 0-100
    risk_category = Column(String(20), default="low")  # low/medium/high/critical
    avg_sentiment = Column(Float, nullable=True)
    avg_stress = Column(Float, nullable=True)
    avg_engagement = Column(Float, nullable=True)
    recommendations = Column(JSON, nullable=True)
    risk_reasons = Column(JSON, nullable=True)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="hr_metrics")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)   # low/medium/high/critical
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="alerts")