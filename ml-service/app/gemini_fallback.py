"""
gemini_fallback.py
------------------
Calls Gemini Vision when the local model's top confidence
is below a threshold, signalling an out-of-distribution image.

Environment variables
---------------------
GEMINI_API_KEY        : required – your Google AI Studio key
GEMINI_CONFIDENCE_THR : optional – fallback threshold (default 0.50)
GEMINI_MODEL          : optional – model name (default gemini-2.5-flash)
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_THRESHOLD = 0.50

# Prompt sent to Gemini when the local model is not confident enough.
_SYSTEM_PROMPT = """You are a botanist AI assistant specialised in leaf and plant identification.

Given an image of a leaf (or plant), return ONLY a JSON array (no markdown, no explanation)
with up to 5 predictions in descending confidence order.

Each element must have exactly two keys:
  "label"      : the plant scientific name or common name, followed by the local/regional name in brackets
                 (e.g. "Solanum lycopersicum (Tomato)", "Mangifera indica (Mango)", "Unknown Leaf")
  "confidence" : a float between 0.0 and 1.0

Example output:
[
  {"label": "Solanum lycopersicum (Tomato)", "confidence": 0.87},
  {"label": "Capsicum annuum (Bell Pepper)",  "confidence": 0.08},
  {"label": "Unknown Leaf",                   "confidence": 0.05}
]

If the image does not appear to contain a leaf or plant, return:
[{"label": "not_a_leaf", "confidence": 1.0}]

Return ONLY the JSON array. No markdown fences, no extra text.
"""


def _get_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "Get a free key at https://aistudio.google.com/app/apikey"
        )
    return key


def _confidence_threshold() -> float:
    try:
        return float(os.environ.get("GEMINI_CONFIDENCE_THR", DEFAULT_THRESHOLD))
    except ValueError:
        return DEFAULT_THRESHOLD


def _gemini_model() -> str:
    return os.environ.get("GEMINI_MODEL", DEFAULT_MODEL).strip()


def should_fallback(predictions: list[dict[str, Any]]) -> bool:
    """Return True if the local model's top confidence is below the threshold."""
    if not predictions:
        return True
    return predictions[0]["confidence"] < _confidence_threshold()


def classify_with_gemini(
    image_bytes: bytes,
    content_type: str = "image/jpeg",
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Send *image_bytes* to Gemini Vision and return predictions in the same
    format as PlantClassifier.predict_topk:
        [{"label": str, "confidence": float}, ...]
    """
    api_key = _get_api_key()
    model = _gemini_model()

    # Normalise MIME type
    mime = content_type if content_type.startswith("image/") else "image/jpeg"
    b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": _SYSTEM_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime,
                            "data": b64,
                        }
                    },
                    {
                        "text": (
                            f"Identify the leaf/plant in this image. "
                            f"Return top {top_k} predictions as a JSON array."
                        )
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024,
        },
    }

    url = f"{GEMINI_API_BASE}/{model}:generateContent?key={api_key}"

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("Gemini API HTTP error %s: %s", exc.response.status_code, exc.response.text)
        raise RuntimeError(f"Gemini API returned {exc.response.status_code}") from exc
    except httpx.RequestError as exc:
        logger.error("Gemini API request error: %s", exc)
        raise RuntimeError("Could not reach Gemini API") from exc

    raw = resp.json()

    # Extract the text from the response
    try:
        text = raw["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError) as exc:
        logger.error("Unexpected Gemini response structure: %s", raw)
        raise RuntimeError("Unexpected Gemini response structure") from exc

    # Strip accidental markdown fences
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(
            line for line in lines if not line.strip().startswith("```")
        ).strip()

    # Find the JSON array boundaries (in case response is truncated)
    json_start = text.find("[")
    json_end = text.rfind("]")
    
    if json_start == -1:
        logger.error("Could not find JSON array start in Gemini response: %s", text[:500])
        raise RuntimeError(f"Gemini response missing JSON array start bracket")
    
    # Extract from start, even if end bracket is missing (truncated response)
    text = text[json_start:]
    
    # If no closing bracket, try to auto-complete the JSON
    if json_end == -1 or json_end < json_start:
        logger.warning("Gemini response appears truncated, attempting to auto-complete JSON")
        # Count open braces to determine how many closing braces/brackets we need
        open_braces = text.count("{") - text.count("}")
        open_brackets = text.count("[") - text.count("]")
        
        # Auto-complete the JSON
        if text.rstrip().endswith(","):
            text = text.rstrip()[:-1]  # Remove trailing comma
        text += "}" * open_braces + "]" * open_brackets
        logger.debug("Auto-completed JSON: %s", text[:200])
    else:
        text = text[:json_end + 1]
    
    logger.debug("Extracted JSON from Gemini: %s", text[:200])

    try:
        parsed: list[dict[str, Any]] = json.loads(text)
        logger.debug("Gemini successfully parsed JSON response with %d predictions", len(parsed))
        logger.debug("Raw Gemini predictions: %s", parsed)
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned invalid JSON: %s (error at char %d)", text[:500], exc.pos)
        raise RuntimeError(f"Gemini returned invalid JSON: {text[:200]}") from exc

    # Validate and cap at top_k
    results: list[dict[str, Any]] = []
    for item in parsed[:top_k]:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "unknown_leaf")).strip()
        try:
            confidence = float(item.get("confidence", 0.0))
            # Clamp confidence between 0 and 1
            confidence = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            confidence = 0.0
        
        if label and label.lower() not in ("", "null", "none"):
            results.append({"label": label, "confidence": round(confidence, 4)})

    if not results:
        logger.warning("No valid predictions extracted from Gemini response")
        results = [{"label": "unknown_leaf", "confidence": 0.0}]

    logger.info("Gemini fallback returning %d predictions, top: %s", len(results), results[0] if results else None)
    return results