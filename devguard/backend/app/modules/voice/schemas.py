from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class VoiceAnalysisResult(BaseModel):
    transcript: str
    duration_seconds: float
    pitch_mean: float
    pitch_std: float
    rms_energy: float
    tempo: float
    pause_count: int
    silence_ratio: float
    stress_score: float
    confidence_score: float
    mood_indicator: str


class VoiceResponse(BaseModel):
    transcript: str
    reply: str
    conversation_id: int
    recording_id: int