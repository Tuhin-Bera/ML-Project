"""
test_gemini_models.py
---------------------
Test suite to verify Gemini API connectivity and list supported models.
"""

import os
import sys
import base64

import httpx
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def get_api_key() -> str:
    """Retrieve Gemini API key from environment."""
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "Get a free key at https://aistudio.google.com/app/apikey"
        )
    return key


def list_supported_models() -> list[dict]:
    """
    List all supported Gemini models from the API.
    
    Returns:
        List of model information dictionaries
    """
    api_key = get_api_key()
    url = f"{GEMINI_API_BASE}?key={api_key}"
    
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(url)
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        print(f"❌ HTTP Error {exc.response.status_code}: {exc.response.text}")
        raise
    except httpx.RequestError as exc:
        print(f"❌ Request Error: {exc}")
        raise
    
    data = resp.json()
    models = data.get("models", [])
    return models


def test_model_availability(model_id: str) -> bool:
    """
    Test if a specific model is available and can be called.
    
    Args:
        model_id: The model ID to test (e.g., "gemini-1.5-flash")
    
    Returns:
        True if model is available, False otherwise
    """
    api_key = get_api_key()
    
    # Create a minimal test payload
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "Say 'ok' if you can read this."
                    }
                ]
            }
        ]
    }
    
    url = f"{GEMINI_API_BASE}/{model_id}:generateContent?key={api_key}"
    
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
        return True
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            return False
        print(f"⚠️ Model {model_id} returned error {exc.response.status_code}")
        return False
    except httpx.RequestError as exc:
        print(f"⚠️ Request failed for {model_id}: {exc}")
        return False


def test_image_classification(model_id: str, image_path: str | None = None) -> bool:
    """
    Test if a model can classify an image (using a test image).
    
    Args:
        model_id: The model ID to test
        image_path: Path to a test image (optional)
    
    Returns:
        True if classification succeeds, False otherwise
    """
    api_key = get_api_key()
    
    # If no image provided, create a simple 1x1 red pixel PNG
    if not image_path:
        # Minimal 1x1 red PNG (encoded in base64)
        red_pixel_png = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        image_b64 = red_pixel_png
    else:
        # Read and encode the provided image
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")
    
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "Classify the object in this image."
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": image_b64,
                        }
                    },
                ]
            }
        ]
    }
    
    url = f"{GEMINI_API_BASE}/{model_id}:generateContent?key={api_key}"
    
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
        return True
    except httpx.HTTPStatusError as exc:
        print(f"⚠️ Image classification failed for {model_id}: {exc.response.status_code}")
        return False
    except httpx.RequestError as exc:
        print(f"⚠️ Request failed for {model_id}: {exc}")
        return False


def main():
    """Run all Gemini tests."""
    print("=" * 60)
    print("GEMINI API SUPPORTED MODELS TEST")
    print("=" * 60)
    
    try:
        api_key = get_api_key()
        print(f"✓ API Key loaded (length: {len(api_key)} chars)\n")
    except RuntimeError as e:
        print(f"✗ {e}")
        sys.exit(1)
    
    # List all supported models
    print("📋 Fetching supported models...")
    try:
        models = list_supported_models()
        print(f"✓ Found {len(models)} models\n")
        
        print("Supported Models:")
        print("-" * 60)
        for model in models:
            model_id = model.get("name", "unknown")
            display_name = model.get("displayName", model_id)
            supported_methods = model.get("supportedGenerationMethods", [])
            print(f"  • {model_id}")
            print(f"    Display: {display_name}")
            print(f"    Methods: {', '.join(supported_methods)}")
        print()
    except Exception as e:
        print(f"✗ Failed to list models: {e}")
        sys.exit(1)
    
    # Test specific models
    test_models = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash",
        "gemini-pro-vision",
    ]
    
    print("🧪 Testing model availability...")
    print("-" * 60)
    available_models = []
    for model_id in test_models:
        available = test_model_availability(model_id)
        status = "✓" if available else "✗"
        print(f"  {status} {model_id}")
        if available:
            available_models.append(model_id)
    print()
    
    # Test image classification with available models
    if available_models:
        print("📸 Testing image classification...")
        print("-" * 60)
        for model_id in available_models:
            success = test_image_classification(model_id)
            status = "✓" if success else "✗"
            print(f"  {status} {model_id} - image classification")
        print()
    
    print("=" * 60)
    print(f"SUMMARY: {len(available_models)}/{len(test_models)} tested models available")
    print("=" * 60)
    
    return 0 if available_models else 1


if __name__ == "__main__":
    sys.exit(main())
