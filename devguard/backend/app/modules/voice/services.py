import io
import tempfile
import os

import numpy as np

from app.core.config import settings
from app.modules.voice.schemas import VoiceAnalysisResult


def _compute_voice_metrics(audio_data: bytes, sample_rate: int = 16000) -> dict:
    """Extract acoustic features using librosa."""
    try:
        import librosa

        # Write to temp file for librosa
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        y, sr = librosa.load(tmp_path, sr=None, mono=True)
        os.unlink(tmp_path)

        duration = librosa.get_duration(y=y, sr=sr)

        # Pitch (fundamental frequency)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = pitches[magnitudes > np.median(magnitudes)]
        pitch_values = pitch_values[pitch_values > 0]
        pitch_mean = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0.0
        pitch_std = float(np.std(pitch_values)) if len(pitch_values) > 0 else 0.0

        # RMS energy
        rms = librosa.feature.rms(y=y)
        rms_energy = float(np.mean(rms))

        # Tempo
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        tempo_val = float(tempo) if not isinstance(tempo, np.ndarray) else float(tempo[0])

        # Silence ratio
        silence_threshold = 0.01
        silent_frames = np.sum(np.abs(y) < silence_threshold)
        silence_ratio = float(silent_frames / len(y)) if len(y) > 0 else 0.0

        # Pause count (runs of silence > 0.3s)
        frame_len = int(sr * 0.3)
        pause_count = 0
        in_pause = False
        for i in range(0, len(y) - frame_len, frame_len):
            chunk = y[i : i + frame_len]
            if np.mean(np.abs(chunk)) < silence_threshold:
                if not in_pause:
                    pause_count += 1
                    in_pause = True
            else:
                in_pause = False

        return {
            "duration_seconds": duration,
            "pitch_mean": pitch_mean,
            "pitch_std": pitch_std,
            "rms_energy": rms_energy,
            "tempo": tempo_val,
            "pause_count": pause_count,
            "silence_ratio": silence_ratio,
        }
    except Exception:
        return {
            "duration_seconds": 0.0,
            "pitch_mean": 0.0,
            "pitch_std": 0.0,
            "rms_energy": 0.0,
            "tempo": 0.0,
            "pause_count": 0,
            "silence_ratio": 0.0,
        }


def _compute_stress_score(metrics: dict) -> float:
    """Heuristic stress score 0-100 from voice metrics."""
    score = 30.0  # baseline

    # High pitch std suggests emotional volatility
    if metrics["pitch_std"] > 60:
        score += 20
    elif metrics["pitch_std"] > 30:
        score += 10

    # High silence ratio → hesitation / stress
    if metrics["silence_ratio"] > 0.5:
        score += 15
    elif metrics["silence_ratio"] > 0.3:
        score += 8

    # Many pauses → stress
    if metrics["pause_count"] > 8:
        score += 15
    elif metrics["pause_count"] > 4:
        score += 7

    # Low energy → low confidence / exhaustion
    if metrics["rms_energy"] < 0.005:
        score += 10

    return min(score, 100.0)


def _compute_confidence_score(metrics: dict) -> float:
    """Heuristic confidence score 0-100."""
    score = 70.0  # baseline

    if metrics["pitch_mean"] > 200:
        score += 10
    if metrics["rms_energy"] > 0.05:
        score += 10
    if metrics["pause_count"] < 3:
        score += 10
    if metrics["silence_ratio"] < 0.2:
        score += 10

    # High std detracts
    if metrics["pitch_std"] > 60:
        score -= 20

    return max(0.0, min(score, 100.0))


def _infer_mood(stress: float, confidence: float) -> str:
    if stress > 70:
        return "stressed"
    if confidence > 75 and stress < 40:
        return "confident"
    if stress > 50:
        return "anxious"
    if confidence < 40:
        return "uncertain"
    return "neutral"


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio using Groq Whisper."""
    from groq import Groq

    client = Groq(api_key=settings.GROQ_API_KEY)
    audio_file = (filename, io.BytesIO(audio_bytes), "audio/webm")

    transcription = client.audio.transcriptions.create(
        file=audio_file,
        model="whisper-large-v3",
        response_format="text",
        language=None,  # auto-detect
    )
    return transcription if isinstance(transcription, str) else transcription.text


async def analyze_voice(audio_bytes: bytes, filename: str = "audio.webm") -> VoiceAnalysisResult:
    """Full voice pipeline: transcribe + extract metrics + scores."""
    transcript = await transcribe_audio(audio_bytes, filename)
    metrics = _compute_voice_metrics(audio_bytes)
    stress = _compute_stress_score(metrics)
    confidence = _compute_confidence_score(metrics)
    mood = _infer_mood(stress, confidence)

    return VoiceAnalysisResult(
        transcript=transcript,
        duration_seconds=metrics["duration_seconds"],
        pitch_mean=metrics["pitch_mean"],
        pitch_std=metrics["pitch_std"],
        rms_energy=metrics["rms_energy"],
        tempo=metrics["tempo"],
        pause_count=metrics["pause_count"],
        silence_ratio=metrics["silence_ratio"],
        stress_score=stress,
        confidence_score=confidence,
        mood_indicator=mood,
    )