import os
import uuid
import tempfile
from pathlib import Path

from dotenv import load_dotenv

# Load .env so GEMINI_API_KEY and other vars are available
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from models import AnalysisResponse, AnalysisData
import ai
import meme_generator

# Create FastAPI app
app = FastAPI(title="Roast or Toast API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = Path(__file__).parent.parent
MEMES_DIR = BASE_DIR / "memes"
FRONTEND_DIR = BASE_DIR / "frontend"
MEMES_DIR.mkdir(exist_ok=True)

# Serve meme images (must be before frontend mount)
app.mount("/memes", StaticFiles(directory=str(MEMES_DIR)), name="memes")


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_outfit(file: UploadFile = File(...)):
    """
    Analyze an outfit image and generate a roast/toast meme.
    
    Accepts: JPEG or PNG image
    Returns: JSON with drip score, archetype, verdict, commentary, and meme image
    """
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/jpg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG and PNG images are supported"
        )
    
    # Create temp file for the uploaded image
    temp_dir = tempfile.gettempdir()
    file_extension = ".jpg" if file.content_type == "image/jpeg" else ".png"
    temp_filename = f"outfit_{uuid.uuid4()}{file_extension}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    try:
        # Save uploaded file
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Analyze the outfit using Gemini API
        analysis = ai.analyze_outfit(temp_path)
        
        # Generate roast or toast verdict
        verdict = ai.generate_roast_or_toast(analysis)
        
        # Generate meme card
        meme_base64 = meme_generator.create_meme_card(temp_path, analysis, verdict)
        
        # Save meme image
        meme_filename = f"meme_{uuid.uuid4()}.png"
        meme_generator.save_meme_image(meme_base64, meme_filename)
        
        # Build response
        response_data = AnalysisData(
            drip_score=analysis["drip_score"],
            archetype=analysis["archetype"],
            strengths=analysis["strengths"],
            mistakes=analysis["mistakes"],
            verdict=verdict["verdict"],
            commentary=verdict["commentary"],
            meme_image=f"data:image/png;base64,{meme_base64}"
        )
        
        return AnalysisResponse(success=True, data=response_data)
    
    except ValueError as e:
        return AnalysisResponse(
            success=False,
            error=str(e)
        )
    except Exception as e:
        return AnalysisResponse(
            success=False,
            error=f"Analysis failed: {str(e)}"
        )
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/memes/{filename}")
async def get_meme(filename: str):
    """Serve generated meme images"""
    meme_path = MEMES_DIR / filename
    if meme_path.exists():
        return FileResponse(str(meme_path), media_type="image/png")
    raise HTTPException(status_code=404, detail="Meme not found")


# Serve frontend (index.html, style.css, app.js) at /
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

