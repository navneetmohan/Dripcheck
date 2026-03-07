import os
import tempfile
import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, File, HTTPException, UploadFile

# Import from the sibling top-level "services" package because the app is run
# as a plain module (uvicorn main:app) from the backend directory.
from services.style_analyzer import analyze_style_attributes
from services.outfit_generator import generate_outfit_suggestions
from services.image_generator import generate_outfit_images


router = APIRouter()


@router.post("/generate-outfits")
async def generate_outfits(image: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Generate two AI-powered outfit suggestions for the person in the image.

    Returns:
    {
      "outfits": [
        { "image": "/generated/...", "items": ["...", "..."] },
        { "image": "/generated/...", "items": ["...", "..."] }
      ]
    }
    """
    if image.content_type not in ["image/jpeg", "image/jpg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are supported")

    temp_dir = tempfile.gettempdir()
    ext = ".jpg" if image.content_type == "image/jpeg" else ".png"
    temp_name = f"outfit_src_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(temp_dir, temp_name)

    try:
        # Persist uploaded file
        with open(temp_path, "wb") as f:
            f.write(await image.read())

        # 1) Analyze style attributes from the image
        attributes = analyze_style_attributes(temp_path)

        # 2) Generate structured outfit suggestions
        outfit_specs = generate_outfit_suggestions(attributes)

        # 3) Turn them into shareable images
        image_paths = generate_outfit_images(temp_path, outfit_specs)

        outfits: List[Dict[str, Any]] = []
        for spec, web_path in zip(outfit_specs, image_paths):
            outfits.append(
                {
                    "image": web_path,
                    "items": spec.get("items", []),
                    "outfit_name": spec.get("outfit_name", ""),
                }
            )

        return {"outfits": outfits}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate outfits: {exc}") from exc
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

