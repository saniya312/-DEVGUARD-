import json
import re
from typing import Optional
from groq import Groq

from app.core.config import settings


_client: Optional[Groq] = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


ANALYSIS_SYSTEM_PROMPT = """You are a workplace wellbeing analyst. Analyze the employee message and return ONLY a valid JSON object with these exact keys:
{
  "sentiment": "positive" | "negative" | "neutral",
  "sentiment_score": <float -1.0 to 1.0>,
  "mood": <string: happy|sad|frustrated|anxious|content|burned_out|disengaged|motivated|neutral>,
  "stress_level": <float 0-100>,
  "engagement_score": <float 0-100>,
  "language_detected": <"english" | "tanglish" | "tamil">
}
Return ONLY the JSON. No explanation. No markdown."""

CHAT_SYSTEM_PROMPT = """You are DevAssist, a friendly AI assistant for workplace support at a tech company.

Your role:
- Answer HR questions, leave policies, company info
- Provide productivity and wellness guidance
- Have natural, supportive conversations
- Help employees feel heard and supported

Language rules:
- English input → English response
- Tanglish input (Tamil + English mix) → Tanglish response
- Tamil Unicode input → respond in Tanglish (Tamil words in English script)
- Never respond in Tamil Unicode script

Tone: Warm, professional, helpful. You are NOT a therapist but you care about wellbeing.
Keep responses concise and helpful. Never mention analysis, scores, or monitoring."""


async def analyze_message(text: str) -> dict:
    """Run sentiment/mood/stress analysis on a chat message."""
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze: {text}"},
            ],
            temperature=0.1,
            max_tokens=200,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        raw = re.sub(r"```json\s*|\s*```", "", raw).strip()
        return json.loads(raw)
    except Exception:
        return {
            "sentiment": "neutral",
            "sentiment_score": 0.0,
            "mood": "neutral",
            "stress_level": 30.0,
            "engagement_score": 50.0,
            "language_detected": "english",
        }


async def generate_chat_reply(
    message: str,
    history: list[dict],
) -> str:
    """Generate an AI chat reply using conversation history.
    Injects RAG context when the module is enabled (future-ready).
    """
    from app.modules.rag.context import retrieve_context, is_rag_enabled

    client = _get_client()
    system_prompt = CHAT_SYSTEM_PROMPT

    # RAG context injection - no-op until RAG module is activated
    if is_rag_enabled():
        rag_context = await retrieve_context(message)
        if rag_context:
            system_prompt += f"\n\nRelevant company information:\n{rag_context}"

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history[-20:])  # keep last 20 turns for context
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.7,
        max_tokens=512,
    )
    return response.choices[0].message.content.strip()