import json
from typing import Any, Dict, List

import google.generativeai as genai

# "ai" lives in the backend root; import as a top-level module.
import ai


def generate_outfit_suggestions(attributes: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Given style attributes for a person, generate two outfit suggestions that suit them.

    Returns a list of dicts with:
    - outfit_name: str
    - items: List[str]
    - description: str (combined description of the look, for image prompts)
    """
    ai.configure_gemini()

    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = f"""
You are a creative fashion stylist.
Based on this person's attributes, design TWO outfits that would really suit them.

Attributes (JSON):
{json.dumps(attributes, ensure_ascii=False, indent=2)}

Return ONLY valid JSON in this exact structure:
[
  {{
    "outfit_name": "<short punchy name for the fit>",
    "items": [
      "<specific clothing item with color and fit>",
      "<another item>",
      "<3-6 total items>"
    ],
    "description": "<1-2 sentence high-level description of the overall look for image generation>"
  }},
  {{
    "outfit_name": "...",
    "items": ["..."],
    "description": "..."
  }}
]

Rules:
- No markdown, no commentary, ONLY the JSON array.
- Items must be wearable pieces (tops, bottoms, shoes, outerwear, accessories).
"""

    response = model.generate_content(prompt)
    text = (response.text or "").strip()

    if "```" in text:
        parts = text.split("```")
        text = "".join(p for p in parts if "[" in p and "]" in p).strip()

    outfits: List[Dict[str, Any]]
    try:
        outfits = json.loads(text)
        if not isinstance(outfits, list):
            raise ValueError("Expected a list of outfits")
    except Exception:
        # Fallback: simple neutral outfits
        outfits = [
            {
                "outfit_name": "Clean Street Classic",
                "items": [
                    "White relaxed-fit t-shirt",
                    "Light wash straight-leg jeans",
                    "White low-top sneakers",
                    "Simple silver chain",
                ],
                "description": "Clean casual streetwear with light denim and white sneakers.",
            },
            {
                "outfit_name": "Smart Casual Layers",
                "items": [
                    "Slim-fit oxford shirt",
                    "Cropped black trousers",
                    "Minimal leather sneakers",
                    "Lightweight bomber jacket",
                ],
                "description": "Smart casual layered look with tailored trousers and a bomber jacket.",
            },
        ]

    cleaned: List[Dict[str, Any]] = []
    for o in outfits[:2]:
        name = str(o.get("outfit_name") or "Outfit").strip()
        items_raw = o.get("items") or []
        items = [str(i).strip() for i in items_raw if str(i).strip()]
        if not items:
            items = ["Relaxed-fit tee", "Straight-leg jeans", "Sneakers"]
        desc = str(o.get("description") or "A flattering outfit for this person.").strip()
        cleaned.append({"outfit_name": name, "items": items, "description": desc})

    # Ensure we always have exactly two
    while len(cleaned) < 2:
        cleaned.append(cleaned[0])

    return cleaned[:2]

