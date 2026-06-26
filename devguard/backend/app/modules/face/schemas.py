from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FaceAnalysisResponse(BaseModel):
    dominant_emotion: str
    happy_score: float
    sad_score: float
    neutral_score: float
    angry_score: float
    surprise_score: float
    fear_score: float
    analysis_id: int