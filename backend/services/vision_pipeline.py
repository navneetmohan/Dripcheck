"""
vision_pipeline.py
==================
Multi-stage vision reasoning pipeline for Dripcheck style analysis.

Stages:
  1. Scene Classification  – what kind of image is this?
  2. Subject Visibility    – is a person/outfit visible and analysable?
  3. Clothing Segmentation – which garments / categories are present?
  4. Conditional Deep Analysis – type-specific prompt chosen from stage results
  5. Output Normalisation  – coerce to the AnalysisData schema the frontend expects

All Gemini calls share a single configured client (call configure_gemini() once
before using this module).
"""

from __future__ import annotations

import json
import re
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from PIL import Image

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Enums & dataclasses
# ---------------------------------------------------------------------------

class SceneType(str, Enum):
    FULL_BODY      = "full_body"       # whole outfit visible head-to-toe
    HALF_BODY      = "half_body"       # waist-up or waist-down crop
    FACE_ONLY      = "face_only"       # portrait / selfie, no clothes
    FLAT_LAY       = "flat_lay"        # clothes laid out on a surface
    PRODUCT_SHOT   = "product_shot"    # single garment / accessory
    GROUP          = "group"           # multiple people
    NO_PERSON      = "no_person"       # no human subject at all
    UNCLEAR        = "unclear"         # low quality / ambiguous


class VisibilityLevel(str, Enum):
    HIGH    = "high"     # >70 % of outfit visible, good lighting
    MEDIUM  = "medium"   # partial visibility, still analysable
    LOW     = "low"      # too occluded / dark / blurry to be reliable
    NONE    = "none"     # no visible clothing at all


@dataclass
class SceneContext:
    scene_type:   SceneType       = SceneType.UNCLEAR
    visibility:   VisibilityLevel = VisibilityLevel.NONE
    lighting:     str             = "unknown"
    background:   str             = "unknown"
    confidence:   float           = 0.0
    garments_present: List[str]   = field(default_factory=list)
    raw_scene_json:   Dict        = field(default_factory=dict)


@dataclass
class PipelineResult:
    """Final output consumed by the /analyze endpoint."""
    drip_score:   int
    archetype:    str
    strengths:    List[str]
    mistakes:     List[str]
    verdict:      str
    commentary:   str
    # Internal – useful for debugging / future features
    scene_context: SceneContext = field(default_factory=SceneContext)
    analysis_mode: str          = "standard"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MODEL_NAME = "gemini-2.5-flash"

def _get_model() -> genai.GenerativeModel:
    return genai.GenerativeModel(MODEL_NAME)


def _load_image(image_path: str) -> Image.Image:
    img = Image.open(image_path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def _extract_json(text: str) -> Dict[str, Any]:
    """Robustly extract a JSON object from a model response string."""
    text = text.strip()

    # Strip markdown fences
    if "```" in text:
        # Try ```json ... ``` first
        m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if m:
            text = m.group(1).strip()

    # Find the outermost { ... }
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        text = m.group(0)

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("JSON parse failed: %s  |  raw: %.200s", exc, text)
        return {}


# ---------------------------------------------------------------------------
# Stage 1 – Scene Classification
# ---------------------------------------------------------------------------

SCENE_CLASSIFICATION_PROMPT = """\
You are a computer-vision pre-processor for a fashion analysis system.

Examine this image and return ONLY a valid JSON object with these keys:

{
  "scene_type": "<one of: full_body | half_body | face_only | flat_lay | product_shot | group | no_person | unclear>",
  "visibility": "<one of: high | medium | low | none>",
  "lighting": "<brief description, e.g. 'natural daylight', 'indoor artificial', 'harsh flash', 'dim'>",
  "background": "<brief description, e.g. 'plain white wall', 'street', 'bedroom', 'studio'>",
  "confidence": <float 0.0-1.0 indicating how confident you are about scene classification>,
  "garments_visible": ["<list of garment categories visible, e.g. 't-shirt', 'jeans', 'sneakers', 'jacket'>"]
}

Definitions:
- full_body: the subject's full outfit is visible from at least shoulders to shoes
- half_body: outfit is partially visible (e.g. upper-body only, or lower-body only)
- face_only: portrait / close-up selfie where clothing is not a meaningful subject
- flat_lay: clothing items arranged on a flat surface (bed, floor, table)
- product_shot: a single isolated garment or accessory
- group: two or more people are prominent subjects
- no_person: no human subject present
- unclear: image quality or composition makes classification unreliable

Return ONLY the JSON. No commentary.
"""


def classify_scene(image_path: str) -> SceneContext:
    model  = _get_model()
    image  = _load_image(image_path)
    resp   = model.generate_content([SCENE_CLASSIFICATION_PROMPT, image])
    data   = _extract_json(resp.text or "")

    ctx = SceneContext(
        scene_type        = SceneType(data.get("scene_type", SceneType.UNCLEAR)),
        visibility        = VisibilityLevel(data.get("visibility", VisibilityLevel.NONE)),
        lighting          = data.get("lighting", "unknown"),
        background        = data.get("background", "unknown"),
        confidence        = float(data.get("confidence", 0.5)),
        garments_present  = data.get("garments_visible", []),
        raw_scene_json    = data,
    )
    logger.debug("Scene classified: %s", ctx)
    return ctx


# ---------------------------------------------------------------------------
# Stage 2 – Subject Visibility Gate
# ---------------------------------------------------------------------------

def check_visibility(ctx: SceneContext) -> tuple[bool, str]:
    """
    Returns (can_analyse: bool, reason: str).
    Blocks analysis for images where meaningful fashion scoring is impossible.
    """
    if ctx.scene_type == SceneType.NO_PERSON:
        return False, "no_person"
    if ctx.scene_type == SceneType.FACE_ONLY:
        return False, "face_only"
    if ctx.visibility == VisibilityLevel.NONE:
        return False, "no_clothing_visible"
    if ctx.visibility == VisibilityLevel.LOW and ctx.confidence < 0.4:
        return False, "too_occluded"
    return True, "ok"


# ---------------------------------------------------------------------------
# Stage 3 – Clothing Segmentation  (enriches SceneContext)
# ---------------------------------------------------------------------------

SEGMENTATION_PROMPT_TEMPLATE = """\
You are a fashion item segmentation model.

The image shows: {scene_description}

List every distinct clothing or accessory item visible. For each item provide:
- category (e.g. top, bottom, shoes, outerwear, bag, hat, jewellery, belt)
- colour(s)
- material if identifiable
- fit/silhouette (e.g. slim, oversized, cropped, relaxed)
- condition (e.g. clean, distressed, wrinkled, pristine)

Return ONLY valid JSON:
{{
  "items": [
    {{
      "category": "<category>",
      "description": "<color + material + fit in one line>",
      "condition": "<condition>"
    }}
  ],
  "dominant_palette": ["<hex or color name>"],
  "overall_coordination": "<brief phrase: e.g. 'well-coordinated', 'clashing', 'monochrome', 'eclectic'>"
}}

No commentary, ONLY JSON.
"""


def segment_clothing(image_path: str, ctx: SceneContext) -> Dict[str, Any]:
    scene_desc = (
        f"a {ctx.scene_type.value} image with {ctx.visibility.value} visibility, "
        f"{ctx.lighting} lighting, background: {ctx.background}"
    )
    prompt = SEGMENTATION_PROMPT_TEMPLATE.format(scene_description=scene_desc)
    model  = _get_model()
    image  = _load_image(image_path)
    resp   = model.generate_content([prompt, image])
    data   = _extract_json(resp.text or "")
    logger.debug("Segmentation result: %s", data)
    return data


# ---------------------------------------------------------------------------
# Stage 4 – Conditional Deep Analysis
# ---------------------------------------------------------------------------

def _build_analysis_prompt(ctx: SceneContext, segmentation: Dict[str, Any]) -> tuple[str, str]:
    """
    Choose a specialised prompt based on scene type.
    Returns (prompt_text, analysis_mode_label).
    """
    seg_summary = json.dumps(segmentation, ensure_ascii=False, indent=2)

    base_instructions = f"""\
You are a brutally honest but witty AI fashion critic.

== CONTEXT ==
Scene type : {ctx.scene_type.value}
Visibility : {ctx.visibility.value}
Lighting   : {ctx.lighting}
Background : {ctx.background}
Coordination: {segmentation.get("overall_coordination", "unknown")}

== IDENTIFIED GARMENTS ==
{seg_summary}

"""

    schema = """\
Return ONLY valid JSON with EXACTLY these keys:
{
  "drip_score": <integer 0-100>,
  "archetype": "<short punchy label, e.g. 'Streetwear Deity', 'Prep School Dropout'>",
  "strengths": ["<2-4 specific, outfit-grounded observations>"],
  "mistakes": ["<1-3 specific, actionable critiques>"],
  "verdict": "<ROAST | TOAST>",
  "commentary": "<1-2 sentence punchy closing line>"
}

Rules:
- drip_score must be driven by the actual garments & coordination above
- strengths and mistakes must reference specific items from the segmentation
- verdict = TOAST if drip_score >= 60, else ROAST
- No markdown, no extra keys, ONLY the JSON object
"""

    if ctx.scene_type == SceneType.FULL_BODY:
        mode   = "full_body"
        extra  = """\
== TASK: FULL OUTFIT ANALYSIS ==
Score the complete look holistically: colour coordination, proportions, silhouette balance,
footwear choice, accessories, and overall trend awareness.
Consider: Does every piece work together? Is the styling intentional or random?
"""

    elif ctx.scene_type == SceneType.HALF_BODY:
        mode   = "half_body"
        extra  = """\
== TASK: PARTIAL OUTFIT ANALYSIS ==
Only the visible half is shown. Score and critique what IS visible.
Note in strengths/mistakes that only partial outfit analysis was possible.
Focus on colour matching, fit quality, and accessory choices within the visible range.
"""

    elif ctx.scene_type == SceneType.FLAT_LAY:
        mode   = "flat_lay"
        extra  = """\
== TASK: FLAT LAY / OUTFIT CURATION ANALYSIS ==
The clothes are laid out, not worn. Evaluate the outfit as a curation choice:
colour story, mix of textures, piece compatibility, and overall aesthetic cohesion.
Treat it as a styling mood board.
"""

    elif ctx.scene_type == SceneType.PRODUCT_SHOT:
        mode   = "product_shot"
        extra  = """\
== TASK: SINGLE ITEM ANALYSIS ==
Only one item is shown. Evaluate it on its own merit:
design quality, colourway, versatility, trend relevance, and styling potential.
Strengths and mistakes should be item-specific. Score should reflect the item alone (max 80 for a single item — a full outfit is needed for 100).
"""

    elif ctx.scene_type == SceneType.GROUP:
        mode   = "group"
        extra  = """\
== TASK: GROUP OUTFIT ANALYSIS ==
Multiple people are present. Score the collective style energy of the group.
Note standout outfits (positive or negative) and overall group aesthetic cohesion.
Reference individuals as "person on left", "person in the middle", etc.
"""

    else:
        # half_body, unclear, fallback
        mode  = "standard"
        extra = """\
== TASK: GENERAL STYLE ANALYSIS ==
Analyse whatever is visible. Be explicit about any limitations due to image quality.
"""

    prompt = base_instructions + extra + schema
    return prompt, mode


def deep_analysis(image_path: str, ctx: SceneContext, segmentation: Dict[str, Any]) -> tuple[Dict[str, Any], str]:
    prompt, mode = _build_analysis_prompt(ctx, segmentation)
    model        = _get_model()
    image        = _load_image(image_path)
    resp         = model.generate_content([prompt, image])
    data         = _extract_json(resp.text or "")
    logger.debug("Deep analysis result (mode=%s): %s", mode, data)
    return data, mode


# ---------------------------------------------------------------------------
# Stage 5 – Output Normalisation & Verdict Safety Net
# ---------------------------------------------------------------------------

_FALLBACK_ROAST_COMMENTS = [
    "The look is giving… confusion. Let's just say confidence is your best accessory right now. 💀",
    "This fit has energy, just not the kind you want at a fashion show. 🔥",
    "Ambitious. Chaotic. Memorable for the wrong reasons.",
]

_FALLBACK_TOAST_COMMENTS = [
    "The drip is real — you came to play. 🔥",
    "Outfit so clean it deserves its own Instagram grid. 👑",
    "A whole look. No notes (well, maybe one tiny note).",
]

import random

def normalise_output(data: Dict[str, Any], mode: str, ctx: SceneContext) -> PipelineResult:
    """Coerce raw model output into a validated PipelineResult."""

    drip_score = max(0, min(100, int(data.get("drip_score", 50))))
    archetype  = str(data.get("archetype", "Style Enigma")).strip() or "Style Enigma"

    strengths  = data.get("strengths", [])
    if not isinstance(strengths, list) or not strengths:
        strengths = ["Attempted a cohesive look"]

    mistakes   = data.get("mistakes", [])
    if not isinstance(mistakes, list) or not mistakes:
        mistakes = ["Could not pinpoint specific issues"]

    # Enforce verdict logic
    verdict = "TOAST" if drip_score >= 60 else "ROAST"
    if str(data.get("verdict", "")).upper() in ("TOAST", "ROAST"):
        verdict = str(data["verdict"]).upper()
        # Sanity-correct: don't TOAST a 20 or ROAST an 85
        if verdict == "TOAST" and drip_score < 40:
            verdict = "ROAST"
        elif verdict == "ROAST" and drip_score > 75:
            verdict = "TOAST"

    commentary = str(data.get("commentary", "")).strip()
    if not commentary:
        pool = _FALLBACK_TOAST_COMMENTS if verdict == "TOAST" else _FALLBACK_ROAST_COMMENTS
        commentary = random.choice(pool)

    # Append visibility caveat when analysis was constrained
    if ctx.visibility == VisibilityLevel.MEDIUM:
        commentary += " (Note: partial outfit visible — score based on what we could see.)"

    return PipelineResult(
        drip_score     = drip_score,
        archetype      = archetype,
        strengths      = strengths[:4],
        mistakes       = mistakes[:3],
        verdict        = verdict,
        commentary     = commentary,
        scene_context  = ctx,
        analysis_mode  = mode,
    )


# ---------------------------------------------------------------------------
# Graceful degradation handlers
# ---------------------------------------------------------------------------

def _make_graceful_result(reason: str) -> PipelineResult:
    """Return a safe, frontend-compatible result when analysis cannot proceed."""
    messages = {
        "no_person": {
            "drip_score": 0,
            "archetype": "The Invisible Fashionista",
            "strengths": ["No person detected — background game is strong though"],
            "mistakes": ["Upload a photo with a person in it for a real drip score"],
            "verdict": "ROAST",
            "commentary": "We searched this image for a fit to judge… and found vibes, but no human. Upload a selfie! 📸",
        },
        "face_only": {
            "drip_score": 0,
            "archetype": "The Portrait",
            "strengths": ["Great face", "Confidence to post a close-up"],
            "mistakes": ["We need to see the fit — show us the full outfit!"],
            "verdict": "ROAST",
            "commentary": "Love the energy but we're fashion critics, not portrait photographers. Show us the drip! 👀",
        },
        "no_clothing_visible": {
            "drip_score": 0,
            "archetype": "Mystery",
            "strengths": ["The intrigue is real"],
            "mistakes": ["No clothing detected — make sure your outfit is visible"],
            "verdict": "ROAST",
            "commentary": "Either this is cutting-edge invisible fashion, or we need a better photo. 🔍",
        },
        "too_occluded": {
            "drip_score": 25,
            "archetype": "Shadowy Silhouette",
            "strengths": ["Mysterious aesthetic — could be hiding something great"],
            "mistakes": ["Image too dark or obscured for accurate analysis", "Try better lighting or a clearer angle"],
            "verdict": "ROAST",
            "commentary": "The fit might be fire, but we literally cannot see it. Lighting upgrade needed! 💡",
        },
    }
    d = messages.get(reason, messages["too_occluded"])
    return PipelineResult(
        drip_score    = d["drip_score"],
        archetype     = d["archetype"],
        strengths     = d["strengths"],
        mistakes      = d["mistakes"],
        verdict       = d["verdict"],
        commentary    = d["commentary"],
        analysis_mode = f"graceful_degradation:{reason}",
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_pipeline(image_path: str) -> PipelineResult:
    """
    Execute the full multi-stage vision pipeline.

    Stages:
      1. Scene Classification
      2. Subject Visibility Gate
      3. Clothing Segmentation
      4. Conditional Deep Analysis
      5. Output Normalisation

    Always returns a PipelineResult compatible with AnalysisData.
    """
    # --- Stage 1 ---
    try:
        ctx = classify_scene(image_path)
    except Exception as exc:
        logger.error("Scene classification failed: %s", exc)
        ctx = SceneContext()  # safe defaults

    # --- Stage 2 ---
    can_analyse, reason = check_visibility(ctx)
    if not can_analyse:
        logger.info("Visibility gate blocked analysis: %s", reason)
        return _make_graceful_result(reason)

    # --- Stage 3 ---
    try:
        segmentation = segment_clothing(image_path, ctx)
    except Exception as exc:
        logger.error("Segmentation failed: %s", exc)
        segmentation = {"items": [], "dominant_palette": [], "overall_coordination": "unknown"}

    # --- Stage 4 ---
    try:
        raw_analysis, mode = deep_analysis(image_path, ctx, segmentation)
    except Exception as exc:
        logger.error("Deep analysis failed: %s", exc)
        raw_analysis = {}
        mode = "error_fallback"

    # --- Stage 5 ---
    return normalise_output(raw_analysis, mode, ctx)
