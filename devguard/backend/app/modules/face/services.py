import io
import tempfile
import os
import base64
from typing import Optional


def analyze_face_image(image_bytes: bytes) -> dict:
    """
    Analyze facial emotion from image bytes using DeepFace.
    Returns emotion scores dict.
    """
    try:
        from deepface import DeepFace
        import cv2
        import numpy as np

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        result = DeepFace.analyze(
            img_path=img,
            actions=["emotion"],
            enforce_detection=False,
            silent=True,
        )

        if isinstance(result, list):
            result = result[0]

        emotions = result.get("emotion", {})
        dominant = result.get("dominant_emotion", "neutral")

        return {
            "dominant_emotion": dominant,
            "happy_score": emotions.get("happy", 0.0),
            "sad_score": emotions.get("sad", 0.0),
            "neutral_score": emotions.get("neutral", 0.0),
            "angry_score": emotions.get("angry", 0.0),
            "surprise_score": emotions.get("surprise", 0.0),
            "fear_score": emotions.get("fear", 0.0),
        }
    except ImportError:
        # DeepFace not installed — return neutral fallback
        return {
            "dominant_emotion": "neutral",
            "happy_score": 0.0,
            "sad_score": 0.0,
            "neutral_score": 100.0,
            "angry_score": 0.0,
            "surprise_score": 0.0,
            "fear_score": 0.0,
        }
    except Exception as e:
        return {
            "dominant_emotion": "neutral",
            "happy_score": 0.0,
            "sad_score": 0.0,
            "neutral_score": 100.0,
            "angry_score": 0.0,
            "surprise_score": 0.0,
            "fear_score": 0.0,
        }