import os
import uuid
import tempfile
import json
from pathlib import Path
import sys
from datetime import datetime, timedelta
from typing import Optional

# Add the backend directory to the path for imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# Load .env so GEMINI_API_KEY and other vars are available
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from models import (
    AnalysisResponse, AnalysisData, OutfitResponse,
    UserResponse, User, LeaderboardResponse, LeaderboardEntry,
    PurchaseResponse, ShareResponse, ReferralResponse, ChallengeResponse, Challenge
)
import ai
import meme_generator
from routes.outfit_generator import router as outfit_router

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

GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)

# User data storage (in-memory for demo - use DB in production)
USERS_FILE = BASE_DIR / "users.json"

def load_users():
    if USERS_FILE.exists():
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f)

# Serve static assets used by the app
app.mount("/memes", StaticFiles(directory=str(MEMES_DIR)), name="memes")
app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")


# Register API routes
app.include_router(outfit_router)


# ============== EXISTING ENDPOINTS ==============

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_outfit(
    file: UploadFile = File(...),
    x_user_id: Optional[str] = Header(None, alias="x-user-id")
):
    """
    Analyze an outfit image and generate a roast/toast meme.
    """
    # Check user limits
    users = load_users()
    user = users.get(x_user_id) if x_user_id else None
    
    if user and not user.get("is_premium", False):
        # Free users get 3 roasts
        if user.get("total_roasts", 0) >= 3:
            return AnalysisResponse(
                success=False,
                error="Free limit reached! Upgrade to Pro for unlimited roasts."
            )
    
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
        
        # Update user stats
        if user:
            user["total_roasts"] = user.get("total_roasts", 0) + 1
            if analysis["drip_score"] > user.get("best_drip_score", 0):
                user["best_drip_score"] = analysis["drip_score"]
            users[x_user_id] = user
            save_users(users)
        
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


# ============== NEW GROWTH & MONETIZATION ENDPOINTS ==============

@app.post("/register", response_model=UserResponse)
async def register_user(username: str):
    """Register a new user"""
    users = load_users()
    
    user_id = str(uuid.uuid4())
    referral_code = f"ROAST{user_id[:6].upper()}"
    
    user_data = {
        "user_id": user_id,
        "username": username,
        "total_roasts": 0,
        "best_drip_score": 0,
        "is_premium": False,
        "created_at": datetime.now().isoformat(),
        "referrals": 0,
        "referral_code": referral_code,
        "referral_used": None
    }
    
    users[user_id] = user_data
    save_users(users)
    
    return UserResponse(
        success=True,
        user=User(**user_data)
    )


@app.get("/user/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user profile"""
    users = load_users()
    user_data = users.get(user_id)
    
    if not user_data:
        return UserResponse(success=False, error="User not found")
    
    return UserResponse(success=True, user=User(**user_data))


@app.post("/purchase", response_model=PurchaseResponse)
async def purchase_premium(user_id: str, product_id: str):
    """
    Simulate a purchase (in production, integrate with Stripe/RevenueCat)
    product_id options: "pro_roast", "super_toast", "monthly_pro"
    """
    users = load_users()
    user = users.get(user_id)
    
    if not user:
        return PurchaseResponse(success=False, error="User not found")
    
    # Simulate purchase based on product
    purchase_id = str(uuid.uuid4())
    
    if product_id == "pro_roast":
        user["is_premium"] = True
    elif product_id == "super_toast":
        user["best_drip_score"] = 100  # Mark as super toast
    elif product_id == "monthly_pro":
        user["is_premium"] = True
    else:
        return PurchaseResponse(success=False, error="Invalid product")
    
    users[user_id] = user
    save_users(users)
    
    return PurchaseResponse(success=True, purchase_id=purchase_id)


@app.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard():
    """Get top drip scores leaderboard"""
    users = load_users()
    
    # Sort by drip score
    leaderboard = []
    for user_id, user in users.items():
        leaderboard.append({
            "rank": 0,
            "username": user.get("username", "Anonymous"),
            "drip_score": user.get("best_drip_score", 0),
            "archetype": "Fashion Icon"
        })
    
    # Sort and rank
    leaderboard.sort(key=lambda x: x["drip_score"], reverse=True)
    
    # Add ranks
    for i, entry in enumerate(leaderboard[:10], 1):
        entry["rank"] = i
    
    return LeaderboardResponse(success=True, entries=leaderboard[:10])


@app.post("/share", response_model=ShareResponse)
async def share_result(user_id: str, platform: str):
    """
    Track shares for viral mechanics - earn free roasts
    """
    users = load_users()
    user = users.get(user_id)
    
    if not user:
        return ShareResponse(success=False, error="User not found")
    
    # Award free roast for sharing
    free_roast = False
    if platform in ["twitter", "instagram", "whatsapp"]:
        user["total_roasts"] = max(0, user.get("total_roasts", 0) - 1)  # Refund one roast
        free_roast = True
        users[user_id] = user
        save_users(users)
    
    return ShareResponse(success=True, free_roast_earned=free_roast)


@app.post("/referral", response_model=ReferralResponse)
async def use_referral(user_id: str, referral_code: str):
    """Apply a referral code to earn free roasts"""
    users = load_users()
    
    user = users.get(user_id)
    if not user:
        return ReferralResponse(success=False, error="User not found")
    
    if user.get("referral_used"):
        return ReferralResponse(success=False, error="Referral already used")
    
    # Find referrer
    referrer = None
    for uid, u in users.items():
        if u.get("referral_code") == referral_code:
            referrer = u
            break
    
    if not referrer:
        return ReferralResponse(success=False, error="Invalid referral code")
    
    # Apply referral benefits
    user["referral_used"] = referral_code
    user["total_roasts"] = user.get("total_roasts", 0) + 3  # 3 free roasts
    
    referrer["referrals"] = referrer.get("referrals", 0) + 1
    
    users[user_id] = user
    users[referrer["user_id"]] = referrer
    save_users(users)
    
    return ReferralResponse(
        success=True,
        referral_code=user.get("referral_code", ""),
        referral_link=f"https://roastortoast.app/?ref={user.get('referral_code', '')}",
        bonus_roasts=3
    )


@app.get("/challenges", response_model=ChallengeResponse)
async def get_active_challenge():
    """Get current viral challenge"""
    # Return a sample challenge
    challenge = Challenge(
        challenge_id="fitdrop001",
        title="🔥 24-Hour Fit Drop Challenge",
        description="Post your outfit today, get roasted by AI! Top scores win exclusive badges.",
        participants=1247,
        ends_at=(datetime.now() + timedelta(days=1)).isoformat(),
        active=True
    )
    
    return ChallengeResponse(success=True, challenge=challenge)


@app.get("/products")
async def get_products():
    """Get available premium products"""
    products = [
        {
            "id": "pro_roast",
            "name": "Pro Roast",
            "description": "Unlimited AI roasts forever",
            "price": 4.99,
            "type": "one_time"
        },
        {
            "id": "super_toast",
            "name": "Super Toast",
            "description": "Get the AI to absolutely glaze your fit",
            "price": 2.99,
            "type": "one_time"
        },
        {
            "id": "monthly_pro",
            "name": "Monthly Pro",
            "description": "Unlimited roasts + exclusive monthly themes",
            "price": 7.99,
            "type": "subscription"
        }
    ]
    
    return JSONResponse(content={"success": True, "products": products})


# Serve frontend (index.html, style.css, app.js) at /
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

