# How Drip Score & Meme Generation Works

## 1. Drip Score Calculation

The drip score is calculated by **Google Gemini Vision AI** - not by hardcoded logic. Here's the flow:

### Step 1: User Uploads Photo
```
User → uploads outfit.jpg → backend receives file
```

### Step 2: Send to Gemini AI
```python
# In backend/ai.py

# Create a "harsh but funny fashion critic" prompt
prompt = """You are a harsh but funny fashion critic. 
Analyze this outfit and return ONLY valid JSON:

{
  "drip_score": <integer 0-100>,
  "archetype": "Streetwear King", 
  "strengths": ["color coordination", "fit"],
  "mistakes": ["too many accessories"]
}

Consider: color coordination, fit, accessories, 
overall cohesion, trend awareness."""

# Send prompt + image to Gemini
model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content([prompt, image])
```

### Step 3: AI Analyzes the Image
Gemini Vision examines:
- **Color coordination** - Do colors work together?
- **Fit** - How do clothes fit the body?
- **Accessories** - Are they complementary or overdone?
- **Overall cohesion** - Does it look put-together?
- **Trend awareness** - Is it modern or outdated?

### Step 4: AI Returns Score (0-100)

| Score Range | Verdict | Message |
|-------------|---------|---------|
| 0-44 | 🔥 ROAST | "Yikes. The fashion gods are crying." |
| 45-69 | ✨ TOAST | "Not bad, but room to level up!" |
| 70-100 | ✨ TOAST | "You're cooking! Chef's kiss!" |

### Step 5: Parse & Validate
```python
# Ensure score is 0-100 (clamp)
drip_score = max(0, min(100, int(ai_response["drip_score"])))
```

---

## 2. Meme Card Generation

The meme card is created using **PIL (Python Imaging Library)** in `backend/meme_generator.py`.

### The Process Flow:

```
┌─────────────────┐
│  User's Photo   │
│  (original.jpg) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  1. RESIZE IMAGE                    │
│  - Min: 640px width                 │
│  - Max: 1080px width                │
│  - Maintains aspect ratio           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  2. CREATE CANVAS                   │
│  - Original height                  │
│  + Extra space for overlay (33%)    │
│  - Total = photo + info panel      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  3. ADD DARK GRADIENT              │
│  - Alpha: 0 → 220 (top to bottom)  │
│  - Makes text readable on ANY photo│
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  4. RENDER TEXT ELEMENTS           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  85        [ROAST] 🔥      │   │  ← Score (color-coded)
│  │  /100                      │   │
│  │                             │   │
│  │  Streetwear King           │   │  ← Archetype  
│  │                             │   │
│  │  The drip is real!         │   │  ← Commentary
│  │                             │   │
│  │              Roast or Toast │   │  ← Watermark
│  └─────────────────────────────┘   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  5. CONVERT & ENCODE               │
│  - Convert RGBA → RGB               │
│  - Save as PNG                     │
│  - Encode to Base64                 │
│  - Return to frontend               │
└─────────────────────────────────────┘
```

### Key Code Sections:

#### Dynamic Sizing (Mobile + Desktop)
```python
def _clamp(value, lo, hi):
    return max(lo, min(hi, value))

# Scale elements based on image width
overlay_height = _clamp(int(width * 0.33), 220, 420)
font_size = _clamp(int(overlay_height * 0.58), 42, 140)
```

#### Color-Coded Score
```python
if drip_score >= 70:
    score_color = (16, 185, 129)  # Green
elif drip_score >= 45:
    score_color = (245, 158, 11)  # Yellow/Amber  
else:
    score_color = (239, 68, 68)   # Red
```

#### Text Wrapping
```python
def _wrap_lines(text, font, max_width, max_lines):
    """Breaks long text into multiple lines"""
    # Ensures commentary fits in the card
```

#### Font Fallback (Windows Compatibility)
```python
candidates = [
    "arial.ttf",      # Most common
    "segoeui.ttf",    # Windows default
    "calibri.ttf",    # Office default
]
# Tries each, falls back to default if none work
```

---

## 3. Complete Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│  FastAPI     │────▶│   Gemini     │
│  (User Upload)│     │  (backend)   │     │   Vision AI  │
└──────────────┘     └──────────────┘     └──────────────┘
                           │                      │
                           │  Image + Prompt     │
                           │─────────────────────▶
                           │                      │
                           │  JSON Response:      │
                           │  {drip_score: 85,   │
                           │   archetype: "...",  │
                           │   strengths: [...], │
                           │   mistakes: [...]}   │
                           │◀─────────────────────
                           │
                           ▼
                    ┌──────────────┐
                    │   PIL/Meme   │
                    │  Generator   │
                    └──────────────┘
                           │
                           │  Base64 PNG
                           ▼
                    ┌──────────────┐     ┌──────────────┐
                    │   Frontend   │────▶│    User      │
                    │  (displays)  │     │  (downloads) │
                    └──────────────┘     └──────────────┘
```

---

## 4. Why This Approach?

### Why Gemini Vision?
- **Free tier** - No cost for MVP
- **Multi-modal** - Native image + text understanding
- **Fast** - Quick response times
- **Good fashion knowledge** - Understands style trends

### Why PIL for Meme Generation?
- **No API cost** - Free, no per-image fees
- **Complete control** - Pixel-perfect positioning
- **Fast** - Runs locally
- **Reliable** - Same output every time

### Why Not DALL-E for Meme?
- **Cost** - $0.04+ per image
- **Slow** - Takes seconds to generate
- **Unreliable** - AI might generate wrong text
- **Overkill** - Just need text overlay

---

## 5. Example Output

### Input:
A photo of someone wearing a plain white t-shirt and jeans.

### AI Response:
```json
{
  "drip_score": 65,
  "archetype": "Casual Minimalist",
  "strengths": [
    "Clean color palette",
    "Timeless silhouette"
  ],
  "mistakes": [
    "Nothing memorable"
  ]
}
```

### Generated Meme Card:
```
┌────────────────────────────────┐
│                                │
│     [User's Photo Here]        │
│                                │
│  ┌──────────────────────────┐ │
│  │  65        [TOAST] ✨   │ │
│  │  /100                    │ │
│  │                          │ │
│  │  Casual Minimalist       │ │
│  │                          │ │
│  │  Not bad, but there's   │ │
│  │  room to level up!      │ │
│  │              Roast or Toast │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

---

## Summary

| Component | Technology | How It Works |
|-----------|------------|--------------|
| **Drip Score** | Google Gemini Vision | AI analyzes outfit, returns 0-100 score |
| **Verdict** | Rule-based | Score ≥70 = TOAST, <70 = ROAST |
| **Commentary** | Template + AI | Pre-written messages based on score + archetype |
| **Meme Card** | PIL (Pillow) | Overlays score, verdict, text on user's photo |
| **Fonts** | System fonts | Arial → Segoe UI → fallback |
| **Output** | Base64 PNG | Sent to frontend for display/download |

