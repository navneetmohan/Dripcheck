000000# Roast or Toast - Full Stack AI Web App Specification

## 1. Project Overview

**Project Name:** Roast or Toast  
**Type:** Full-stack AI web application  
**Core Functionality:** Users upload outfit photos, and the app analyzes them using Gemini API to generate a drip score, style archetype, and humorous roast/toast commentary with a shareable meme card.  
**Target Users:** Fashion-conscious individuals seeking fun, AI-powered outfit feedback.

---

## 2. Tech Stack

- **Backend:** Python FastAPI
- **Frontend:** HTML5 + Vanilla JavaScript + CSS3
- **AI:** Google Gemini Vision API (gemini-1.5-flash)
- **Image Processing:** Pillow (PIL)
- **Environment Variables:** python-dotenv

---

## 3. Project Structure

```
Dripcheck/
├── SPEC.md
├── backend/
│   ├── __init__.py
│   ├── main.py           # FastAPI server with endpoints
│   ├── ai.py             # Gemini API integration
│   ├── meme_generator.py # Pillow-based meme creation
│   ├── models.py         # Pydantic models
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── index.html        # Upload UI
│   ├── app.js            # Frontend logic
│   └── style.css         # Styling
└── .env                  # Environment variables (create separately)
```

---

## 4. Backend Specification

### 4.1 main.py

**FastAPI Server Configuration:**
- Host: `0.0.0.0`
- Port: `8000`
- CORS enabled for frontend origin
- Static file serving for meme images

**Endpoints:**

1. **GET /**
   - Serves frontend index.html

2. **POST /analyze**
   - Accepts: `file` (UploadFile, image/jpeg or image/png)
   - Process:
     1. Validate image format
     2. Save temporarily
     3. Call `ai.analyze_outfit()` with image
     4. Call `ai.generate_roast_or_toast()` with analysis
     5. Call `meme_generator.create_meme_card()` with all data
     6. Return JSON response
   - Response JSON:
     ```json
     {
       "success": true,
       "data": {
         "drip_score": 85,
         "archetype": "Streetwear King",
         "strengths": ["Great color coordination", "Clean silhouette"],
         "mistakes": ["Too many accessories"],
         "verdict": "TOAST",
         "commentary": "You're cooking! 🔥",
         "meme_image": "data:image/png;base64,..."
       }
     }
     ```

3. **GET /memes/{filename}**
   - Serves generated meme images

### 4.2 ai.py

**Function: analyze_outfit(image_path: str) -> dict**
- Loads image using Pillow
- Converts to base64
- Sends to Gemini Vision API with prompt:
  ```
  Analyze this outfit and return JSON with:
  - drip_score: integer 0-100
  - archetype: string (e.g., "Streetwear King", "Preppy Prince", "Casual King", etc.)
  - strengths: array of strings (2-3 items)
  - mistakes: array of strings (1-2 items)
  
  Return ONLY valid JSON, no other text.
  ```
- Parses JSON response
- Returns dict with keys: drip_score, archetype, strengths, mistakes

**Function: generate_roast_or_toast(analysis: dict) -> dict**
- Determines ROAST or TOAST based on drip_score:
  - 0-40: ROAST
  - 41-100: TOAST
- Generates witty commentary based on archetype and score
- Returns dict with: verdict, commentary

### 4.3 meme_generator.py

**Function: create_meme_card(image_path: str, analysis: dict, verdict: dict) -> str**
- Loads original image
- Creates overlay with:
  - Semi-transparent dark gradient at bottom
  - Drip score (large, bold, color-coded: red <40, yellow 40-70, green >70)
  - Archetype label
  - Roast/Toast badge with emoji
  - Commentary text
- Returns base64-encoded PNG

### 4.4 models.py

```python
from pydantic import BaseModel
from typing import List, Optional

class AnalysisResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
```

### 4.5 requirements.txt

```
fastapi==0.109.0
uvicorn==0.27.0
python-multipart==0.0.6
pillow==10.2.0
google-generativeai==0.5.3
python-dotenv==1.0.0
```

---

## 5. Frontend Specification

### 5.1 index.html

**Structure:**
- Header with app title "Roast or Toast 🔥"
- Subtitle: "Upload your fit, get roasted or toasted"
- Upload area (drag & drop + click to browse)
- Preview area for uploaded image
- "Analyze My Fit" button
- Loading state with spinner
- Results section (hidden initially):
  - Drip Score display with animated counter
  - Style Archetype badge
  - Roast/Toast verdict with emoji
  - Commentary text
  - Strengths & mistakes lists
  - Meme card image (shareable)
  - "Share Result" button

### 5.2 app.js

**Functionality:**
- Handle file input change
- Preview uploaded image
- Send image to backend via Fetch API
- Handle loading state
- Display results with animations
- Convert meme to downloadable format

### 5.3 style.css

**Design:**
- Dark theme with accent colors
- Gradient backgrounds
- Glassmorphism cards
- Animated elements
- Responsive design
- Custom fonts (Google Fonts: Outfit, Space Grotesk)

---

## 6. Environment Variables

Create `.env` file:
```
GEMINI_API_KEY=your_google_gemini_api_key_here
```

---

## 7. Acceptance Criteria

1. ✅ User can upload JPEG/PNG images
2. ✅ Backend accepts image and returns analysis
3. ✅ Gemini API returns valid JSON with drip_score, archetype, strengths, mistakes
4. ✅ Roast or Toast verdict generated based on score
5. ✅ Meme card generated with overlay text
6. ✅ Frontend displays all results
7. ✅ Meme card is downloadable
8. ✅ App handles errors gracefully
9. ✅ CORS properly configured

---

## 8. Running the App

**Backend:**
```bash
cd backend
pip install -r requirements.txt
# Create .env with GEMINI_API_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
Open `frontend/index.html` in browser or serve via:
```bash
cd frontend
python -m http.server 5500
```

