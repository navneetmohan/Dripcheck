import os
import json
import base64
import google.generativeai as genai
from PIL import Image
from io import BytesIO
from typing import Dict, List, Any


def configure_gemini():
    """Configure Gemini API with API key from environment."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    genai.configure(api_key=api_key)


def load_image_as_base64(image_path: str) -> str:
    """Load image and convert to base64 string."""
    with Image.open(image_path) as img:
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=90)
        image_bytes = buffer.getvalue()
    
    return base64.b64encode(image_bytes).decode('utf-8')


def analyze_outfit(image_path: str) -> Dict[str, Any]:
    """
    Analyze outfit using the multi-stage vision pipeline.

    Internally runs:
      1. Scene classification
      2. Subject visibility gate
      3. Clothing segmentation
      4. Conditional deep analysis (prompt chosen per scene type)
      5. Output normalisation

    Returns dict with:
    - drip_score: int (0-100)
    - archetype: str
    - strengths: List[str]
    - mistakes:  List[str]

    Always returns a valid dict — graceful degradation handles unanalysable images.
    """
    configure_gemini()

    # Lazy import to keep the module loadable without the services/ package on path
    import sys
    from pathlib import Path
    _backend = Path(__file__).parent
    if str(_backend) not in sys.path:
        sys.path.insert(0, str(_backend))

    from services.vision_pipeline import run_pipeline

    result = run_pipeline(image_path)

    return {
        "drip_score": result.drip_score,
        "archetype":  result.archetype,
        "strengths":  result.strengths,
        "mistakes":   result.mistakes,
        # Pass through for generate_roast_or_toast to use if needed
        "_verdict":   result.verdict,
        "_commentary": result.commentary,
        "_analysis_mode": result.analysis_mode,
    }


def generate_roast_or_toast(analysis: Dict[str, Any]) -> Dict[str, str]:  # noqa: C901
    """
    Generate roast or toast based on drip score.

    If the multi-stage pipeline already produced a verdict + commentary
    (stored as _verdict / _commentary), those are used directly.

    Returns dict with:
    - verdict: str ("ROAST" or "TOAST")
    - commentary: str
    """
    # Fast path: pipeline already computed these
    if analysis.get("_verdict") and analysis.get("_commentary"):
        return {
            "verdict":    analysis["_verdict"],
            "commentary": analysis["_commentary"],
        }

    drip_score = analysis.get("drip_score", 50)
    archetype = analysis.get("archetype", "Fashion Victim")
    
    # Roast messages for low scores
    roast_messages = [
        "Yikes. The fashion gods are crying. 😭",
        "This is a crime against fabric. 🔥☕",
        "Did you get dressed in the dark?",
        "The fit is... certainly a choice. 💀",
        "I'm gonna need you to consult a stylist ASAP.",
        "This outfit is giving 'confused tourist' energy.",
        "Someone please intervene. 🙏",
        "My eyes! The humanity!",
    ]
    
    # Toast messages for high scores
    toast_messages = [
        "You're cooking! 🔥 Chef's kiss!",
        "The drip is real. Absolutely serving looks!",
        "Slay queen/kking! 👑",
        "This fit deserves a standing ovation!",
        "Street style icon right here! 📸",
        "The fashion committee approves!",
        "Looking like a whole mood! 💅",
        "Absolute perfection. No notes!",
    ]
    
    # Mixed messages for mid scores
    mixed_messages = [
        "Not bad, but there's room to level up!",
        "You're getting there! Keep experimenting!",
        "An interesting choice... growing on me!",
        "The potential is there!",
    ]
    
    import random
    
    if drip_score >= 70:
        verdict = "TOAST"
        commentary = random.choice(toast_messages)
    elif drip_score >= 45:
        verdict = "TOAST"
        commentary = random.choice(mixed_messages)
    else:
        verdict = "ROAST"
        commentary = random.choice(roast_messages)
    
    # Add archetype-specific commentary
    archetype_comments = {
        "Streetwear King": "King of the concrete jungle! 👑" if verdict == "TOAST" else "The streets are not ready for this fit.",
        "Streetwear Queen": "Serving urban goddess energy! ✨" if verdict == "TOAST" else "Maybe stick to online shopping?",
        "Preppy Prince": " Ivy league level style! 🎓" if verdict == "TOAST" else "Did you escape from a prep school?",
        "Preppy Princess": "Polished and proper! 💕" if verdict == "TOAST" else "Too many patterns, too little time.",
        "Casual King": "Effortlessly cool! 😎" if verdict == "TOAST" else "Effort is good, but try harder?",
        "Casual Queen": "Chill vibes only! 🌙" if verdict == "TOAST" else "Let's elevate that casual look!",
        "Minimalist Master": "Less is more, and it's working! 🖤" if verdict == "TOAST" else "Minimalist or just missing clothes?",
        "Vintage Vibes": "Retro and proud! 📻" if verdict == "TOAST" else "Some vintage should stay in the past.",
    }
    
    # Add archetype comment if matches
    for key, comment in archetype_comments.items():
        if key.lower() in archetype.lower() or archetype.lower() in key.lower():
            commentary = f"{commentary} {comment}"
            break
    
    return {
        "verdict": verdict,
        "commentary": commentary
    }

