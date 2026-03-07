import json
from pathlib import Path
from typing import Any, Dict

from PIL import Image
import google.generativeai as genai

# "ai" lives next to main.py in the backend root, which is on sys.path when
# uvicorn runs `main:app`, so we import it as a top-level module.
import ai


def analyze_style_attributes(image_path: str) -> Dict[str, Any]:
    """
    Analyze a person in the image and return style-relevant attributes.

    Returns a dict with at least:
    - gender_presentation
    - body_build
    - skin_tone
    - vibe_style
    - recommended_aesthetic
    """
    ai.configure_gemini()

    image = Image.open(image_path)
    if image.mode != "RGB":
        image = image.convert("RGB")

    prompt = """
You are an expert fashion stylist and visual analyst.
Look at this person and return ONLY valid JSON with these exact keys:

{
  "gender_presentation": "<short phrase like 'masc', 'femme', 'androgynous'>",
  "body_build": "<brief description such as 'slim', 'athletic', 'curvy', 'plus-size'>",
  "skin_tone": "<short description of skin tone>",
  "vibe_style": "<fun 3-6 word phrase capturing their current vibe, e.g. 'chill streetwear', 'minimal tech bro'>",
  "recommended_aesthetic": "<named fashion aesthetic that would suit them, e.g. 'clean streetwear', 'Y2K', 'classic prep', 'scandi minimal'>"
}

Be concise and avoid extra commentary. Return ONLY the JSON object, no additional text.
"""

    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content([prompt, image])
    text = (response.text or "").strip()

    if "```" in text:
        # Strip markdown fences if present
        parts = text.split("```")
        text = "".join(p for p in parts if "{" in p and "}" in p).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Fallback with safe defaults
        data = {}

    return {
        "gender_presentation": data.get("gender_presentation", "androgynous"),
        "body_build": data.get("body_build", "average"),
        "skin_tone": data.get("skin_tone", "medium"),
        "vibe_style": data.get("vibe_style", "casual streetwear"),
        "recommended_aesthetic": data.get("recommended_aesthetic", "clean streetwear"),
    }

