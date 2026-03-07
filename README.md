<<<<<<< HEAD
# Roast or Toast 🔥

An AI-powered outfit analyzer that tells you whether your fit is fire or needs to go back to the drawing room.

## Features

- 📸 **Upload your outfit photo** - Support for JPEG and PNG images
- 🤖 **AI-Powered Analysis** - Uses Google Gemini Vision API to analyze your outfit
- 📊 **Drip Score** - Get a score from 0-100 on how fresh your fit is
- 👗 **Style Archetype** - Discover your style identity (Streetwear King, Preppy Prince, etc.)
- 🔥 **Roast or Toast** - Get brutally honest feedback
- 📱 **Shareable Memes** - Generate and download a meme card to share

## Tech Stack

- **Backend:** Python FastAPI
- **Frontend:** HTML5 + Vanilla JavaScript + CSS3
- **AI:** Google Gemini Vision API (gemini-1.5-flash)
- **Image Processing:** Pillow (PIL)

## Project Structure

```
Dripcheck/
├── SPEC.md              # Project specification
├── README.md            # This file
├── backend/
│   ├── main.py          # FastAPI server
│   ├── ai.py            # Gemini API integration
│   ├── meme_generator.py # Meme card creation
│   ├── models.py        # Pydantic models
│   ├── requirements.txt # Python dependencies
│   └── .env.example     # Environment variables template
└── frontend/
    ├── index.html       # Main UI
    ├── app.js           # Frontend logic
    └── style.css        # Styling
```

## Setup

### 1. Prerequisites

- Python 3.8+
- Google Gemini API Key

### 2. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy the `.env.example` file and add your API key:

```bash
copy .env.example .env
```

Then edit `.env` and replace:
```
GEMINI_API_KEY=your_google_gemini_api_key_here
```

## Running the App

### Start the Backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Access the Frontend

Open your browser and navigate to:
```
http://localhost:8000
```

Or if you prefer a separate frontend server:

```bash
cd frontend
python -m http.server 5500
```

Then open `http://localhost:5500`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve frontend |
| `/analyze` | POST | Analyze outfit image |
| `/memes/{filename}` | GET | Serve generated meme |

### Analyze Endpoint

**Request:**
```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@outfit.jpg"
```

**Response:**
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

## How It Works

1. User uploads an outfit photo through the frontend
2. The image is sent to the FastAPI backend
3. Backend uses Google Gemini Vision API to analyze the outfit
4. AI returns JSON with drip_score, archetype, strengths, and mistakes
5. Backend generates a witty "Roast or Toast" verdict
6. Meme generator creates a shareable image with all the results
7. Frontend displays the results with animations

## Troubleshooting

### "GEMINI_API_KEY environment variable not set"
Make sure you've created a `.env` file in the backend directory with your API key.

### CORS Errors
The backend is configured to accept requests from all origins (`*`). If you encounter CORS issues, check that the backend is running correctly.

### Image Upload Fails
- Make sure the image is JPEG or PNG
- Image must be less than 10MB

## License

MIT License

---

Made with 🔥 by Roast or Toast

=======
# Dripcheck
Hackathon project
>>>>>>> 390df14c5e0312d1a81198b293a2afa2e368f166
