from pydantic import BaseModel
from typing import List, Optional, Any


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

