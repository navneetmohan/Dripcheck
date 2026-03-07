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
    Analyze outfit using Gemini Vision API.
    
    Returns dict with:
    - drip_score: int (0-100)
    - archetype: str
    - strengths: List[str]
    - mistakes: List[str]
    """
    configure_gemini()
    
    # Load and prepare image
    image = Image.open(image_path)
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Create prompt for Gemini
    prompt = """You are a harsh but funny fashion critic. Analyze this outfit and return ONLY valid JSON with these exact fields:

{
  "drip_score": <integer 0-100>,
  "archetype": "<one word or short phrase like 'Streetwear King', 'Preppy Prince', 'Casual Queen', 'Vintage Vibes', 'Minimalist Master'>",
  "strengths": ["<2-3 things this outfit does well>"],
  "mistakes": ["<1-2 things wrong with this outfit>"]
}

Be honest but entertaining. Consider: color coordination, fit, accessories, overall cohesion, trend awareness.
Return ONLY the JSON, no other text."""
    
    # Use Gemini 2.5 Flash (free tier has quota; 2.0-flash free tier limit is 0)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    response = model.generate_content([prompt, image])
    
    # Parse JSON from response
    response_text = response.text.strip()
    
    # Extract JSON from response (handle potential markdown code blocks)
    if '```json' in response_text:
        response_text = response_text.split('```json')[1].split('```')[0]
    elif '```' in response_text:
        response_text = response_text.split('```')[1].split('```')[0]
    
    # Clean up and parse JSON
    response_text = response_text.strip()
    
    try:
        analysis = json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON using regex
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            analysis = json.loads(json_match.group())
        else:
            # Fallback to default values
            analysis = {
                "drip_score": 50,
                "archetype": "Mystery Fashionista",
                "strengths": ["You tried"],
                "mistakes": ["Could not analyze properly"]
            }
    
    # Validate and set defaults
    return {
        "drip_score": max(0, min(100, int(analysis.get("drip_score", 50)))),
        "archetype": analysis.get("archetype", "Style Rebel"),
        "strengths": analysis.get("strengths", ["Unique choices"]),
        "mistakes": analysis.get("mistakes", ["Room for improvement"])
    }


def generate_roast_or_toast(analysis: Dict[str, Any]) -> Dict[str, str]:
    """
    Generate roast or toast based on drip score.
    
    Returns dict with:
    - verdict: str ("ROAST" or "TOAST")
    - commentary: str
    """
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

