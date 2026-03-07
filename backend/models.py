from typing import Any, List, Optional
from pydantic import BaseModel
from datetime import datetime


# ============== Existing Models ==============

class AnalysisData(BaseModel):
    drip_score: int
    archetype: str
    strengths: List[str]
    mistakes: List[str]
    verdict: str
    commentary: str
    meme_image: str


class AnalysisResponse(BaseModel):
    success: bool
    data: Optional[AnalysisData] = None
    error: Optional[str] = None


class OutfitSuggestion(BaseModel):
    image: str
    items: List[str]
    outfit_name: Optional[str] = None


class OutfitResponse(BaseModel):
    outfits: List[OutfitSuggestion]


# ============== New Models for Growth & Monetization ==============

class User(BaseModel):
    """User account for tracking scores and purchases"""
    user_id: str
    username: str
    total_roasts: int = 0
    best_drip_score: int = 0
    is_premium: bool = False
    created_at: str = None
    referrals: int = 0
    referral_code: str = None


class UserResponse(BaseModel):
    success: bool
    user: Optional[User] = None
    error: Optional[str] = None


class PurchaseRequest(BaseModel):
    product_id: str  # "pro_roast", "super_toast", "monthly_pro"


class PurchaseResponse(BaseModel):
    success: bool
    purchase_id: Optional[str] = None
    error: Optional[str] = None


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    drip_score: int
    archetype: str


class LeaderboardResponse(BaseModel):
    success: bool
    entries: List[LeaderboardEntry] = []


class Challenge(BaseModel):
    """Viral challenge"""
    challenge_id: str
    title: str
    description: str
    participants: int = 0
    ends_at: str = None
    active: bool = True


class ChallengeResponse(BaseModel):
    success: bool
    challenge: Optional[Challenge] = None
    error: Optional[str] = None


class ShareResult(BaseModel):
    """Request to share a result for rewards"""
    platform: str  # "twitter", "instagram", "whatsapp", "copy"
    meme_data: str  # base64 image


class ShareResponse(BaseModel):
    success: bool
    free_roast_earned: bool = False
    error: Optional[str] = None


class ReferralResponse(BaseModel):
    success: bool
    referral_code: str
    referral_link: str
    bonus_roasts: int = 3
    error: Optional[str] = None

