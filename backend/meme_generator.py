import base64
import os
from io import BytesIO
from typing import Any, Dict, Iterable, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def _try_font(paths: Iterable[str], size: int) -> Optional[ImageFont.FreeTypeFont]:
    for p in paths:
        try:
            if p and os.path.exists(p):
                return ImageFont.truetype(p, size)
        except Exception:
            continue
    return None


def _load_fonts(width: int, overlay_height: int) -> Dict[str, ImageFont.ImageFont]:
    # Scale type primarily off width/overlay size so it stays readable on all images.
    score_size = _clamp(int(overlay_height * 0.58), 42, 140)
    title_size = _clamp(int(overlay_height * 0.20), 18, 56)
    badge_size = _clamp(int(overlay_height * 0.16), 14, 44)
    body_size = _clamp(int(overlay_height * 0.14), 12, 40)
    watermark_size = _clamp(int(overlay_height * 0.11), 10, 34)

    windows_fonts = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
    candidates_regular = [
        os.path.join(windows_fonts, "arial.ttf"),
        os.path.join(windows_fonts, "segoeui.ttf"),
        os.path.join(windows_fonts, "calibri.ttf"),
    ]
    candidates_bold = [
        os.path.join(windows_fonts, "arialbd.ttf"),
        os.path.join(windows_fonts, "segoeuib.ttf"),
    ]
    emoji_candidates = [
        os.path.join(windows_fonts, "seguiemj.ttf"),  # Segoe UI Emoji
    ]

    score_font = _try_font(candidates_bold + candidates_regular, score_size) or ImageFont.load_default()
    title_font = _try_font(candidates_bold + candidates_regular, title_size) or ImageFont.load_default()
    badge_font = _try_font(candidates_bold + candidates_regular, badge_size) or ImageFont.load_default()
    body_font = _try_font(candidates_regular, body_size) or ImageFont.load_default()
    watermark_font = _try_font(candidates_regular, watermark_size) or ImageFont.load_default()

    emoji_font = _try_font(emoji_candidates, badge_size)

    return {
        "score": score_font,
        "title": title_font,
        "badge": badge_font,
        "body": body_font,
        "watermark": watermark_font,
        "emoji": emoji_font or badge_font,
    }


def _text_bbox(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _wrap_lines(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> Tuple[str, int]:
    text = " ".join((text or "").split())
    if not text:
        return "", 0

    words = text.split(" ")
    lines = []
    current: list[str] = []

    def current_width(parts: list[str]) -> int:
        return _text_bbox(draw, " ".join(parts), font)[0]

    for w in words:
        trial = current + [w]
        if current and current_width(trial) > max_width:
            lines.append(" ".join(current))
            current = [w]
            if len(lines) >= max_lines:
                break
        else:
            current = trial

    if len(lines) < max_lines and current:
        lines.append(" ".join(current))

    # Ellipsize last line if still too wide or we truncated.
    was_truncated = len(lines) == max_lines and (len(words) > 0) and (" ".join(lines).split(" ") != words)
    if lines:
        last = lines[-1]
        if _text_bbox(draw, last, font)[0] > max_width or was_truncated:
            ell = "…"
            while last and _text_bbox(draw, last + ell, font)[0] > max_width:
                last = last[:-1].rstrip()
            lines[-1] = (last + ell) if last else ell

    joined = "\n".join(lines)
    # Estimate height using bbox of multiline.
    bbox = draw.multiline_textbbox((0, 0), joined, font=font, spacing=2)
    height = bbox[3] - bbox[1]
    return joined, height


def create_meme_card(image_path: str, analysis: Dict[str, Any], verdict: Dict[str, str]) -> str:
    """
    Create a shareable meme card with the outfit analysis.
    
    Returns base64-encoded PNG image.
    """
    original_img = Image.open(image_path)
    if original_img.mode != "RGB":
        original_img = original_img.convert("RGB")

    # Resize to a share-friendly width while preserving aspect ratio.
    # This keeps output consistent, but still responsive to the original image size.
    in_w, in_h = original_img.size
    target_w = in_w
    min_w, max_w = 640, 1080
    if in_w < min_w:
        target_w = min_w
    elif in_w > max_w:
        target_w = max_w

    if target_w != in_w:
        ratio = target_w / float(in_w)
        target_h = max(1, int(in_h * ratio))
        original_img = original_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    else:
        target_h = in_h

    # Overlay sizing scales with width (clamped so it stays readable).
    overlay_h = _clamp(int(target_w * 0.33), 220, 420)
    fade_h = _clamp(int(overlay_h * 0.45), 90, 220)
    fade_h = min(fade_h, max(1, target_h // 2))

    canvas = Image.new("RGBA", (target_w, target_h + overlay_h), (0, 0, 0, 255))
    canvas.paste(original_img, (0, 0))

    # Gradient panel: starts slightly inside the image and continues through the panel.
    gradient_h = overlay_h + fade_h
    overlay = Image.new("RGBA", (target_w, gradient_h), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    panel_alpha = 220
    for y in range(gradient_h):
        if y < fade_h:
            alpha = int(panel_alpha * (y / float(max(1, fade_h))))
        else:
            alpha = panel_alpha
        draw_overlay.line([(0, y), (target_w, y)], fill=(0, 0, 0, alpha))

    canvas.alpha_composite(overlay, (0, target_h - fade_h))

    draw = ImageDraw.Draw(canvas)

    drip_score = int(analysis.get("drip_score", 50))
    archetype = str(analysis.get("archetype", "Style Rebel") or "Style Rebel")
    verdict_text = str(verdict.get("verdict", "TOAST") or "TOAST").upper()
    commentary = str(verdict.get("commentary", "Looking good!") or "Looking good!")

    # Colors
    if drip_score >= 70:
        score_color = (16, 185, 129, 255)  # green
    elif drip_score >= 45:
        score_color = (245, 158, 11, 255)  # amber
    else:
        score_color = (239, 68, 68, 255)  # red

    verdict_color = (239, 68, 68, 255) if verdict_text == "ROAST" else (16, 185, 129, 255)
    verdict_bg = (239, 68, 68, 50) if verdict_text == "ROAST" else (16, 185, 129, 50)

    pad = _clamp(int(target_w * 0.05), 18, 48)
    gap = _clamp(int(target_w * 0.02), 10, 22)
    y_base = target_h + _clamp(int(overlay_h * 0.08), 16, 36)

    fonts = _load_fonts(target_w, overlay_h)
    score_font = fonts["score"]
    title_font = fonts["title"]
    badge_font = fonts["badge"]
    body_font = fonts["body"]
    watermark_font = fonts["watermark"]
    emoji_font = fonts["emoji"]

    # Left: score
    score_text = f"{_clamp(drip_score, 0, 100)}"
    score_w, score_h = _text_bbox(draw, score_text, score_font)
    draw.text((pad, y_base), score_text, font=score_font, fill=score_color)

    slash_text = "/100"
    slash_w, slash_h = _text_bbox(draw, slash_text, title_font)
    slash_x = pad + score_w + _clamp(int(target_w * 0.015), 8, 16)
    slash_y = y_base + max(0, int(score_h * 0.55) - int(slash_h * 0.6))
    draw.text((slash_x, slash_y), slash_text, font=title_font, fill=(255, 255, 255, 220))

    # Right: verdict badge
    badge_text = verdict_text
    emoji = "🔥" if verdict_text == "ROAST" else "✨"

    emoji_w, emoji_h = _text_bbox(draw, emoji, emoji_font)
    badge_w, badge_h = _text_bbox(draw, badge_text, badge_font)
    badge_pad_x = _clamp(int(target_w * 0.02), 10, 18)
    badge_pad_y = _clamp(int(overlay_h * 0.06), 6, 12)
    badge_total_w = emoji_w + (badge_pad_x // 2) + badge_w + badge_pad_x * 2
    badge_total_h = max(emoji_h, badge_h) + badge_pad_y * 2

    badge_x = target_w - pad - badge_total_w
    badge_y = y_base + _clamp(int(overlay_h * 0.01), 0, 10)

    try:
        draw.rounded_rectangle(
            [badge_x, badge_y, badge_x + badge_total_w, badge_y + badge_total_h],
            radius=_clamp(int(badge_total_h * 0.5), 10, 999),
            fill=verdict_bg,
            outline=(255, 255, 255, 35),
            width=1,
        )
    except Exception:
        draw.rectangle(
            [badge_x, badge_y, badge_x + badge_total_w, badge_y + badge_total_h],
            fill=verdict_bg,
            outline=(255, 255, 255, 35),
            width=1,
        )

    text_x = badge_x + badge_pad_x
    text_y = badge_y + badge_pad_y
    # Draw emoji if font supports it; if it doesn't, it's still fine.
    draw.text((text_x, text_y), emoji, font=emoji_font, fill=(255, 255, 255, 235))
    draw.text((text_x + emoji_w + (badge_pad_x // 2), text_y), badge_text, font=badge_font, fill=verdict_color)

    # Archetype under score
    arch_y = y_base + score_h + _clamp(int(overlay_h * 0.04), 10, 18)
    arch_text = archetype.strip()
    if len(arch_text) > 40:
        arch_text = arch_text[:39] + "…"
    draw.text((pad, arch_y), arch_text, font=title_font, fill=(255, 255, 255, 235))

    # Commentary wrapped, full width
    comment_y = arch_y + _text_bbox(draw, arch_text, title_font)[1] + _clamp(int(overlay_h * 0.05), 10, 18)
    available_w = target_w - pad * 2
    max_lines = 3 if overlay_h >= 320 else 2
    wrapped, _ = _wrap_lines(draw, commentary, body_font, available_w, max_lines=max_lines)
    if wrapped:
        draw.multiline_text((pad, comment_y), wrapped, font=body_font, fill=(220, 220, 220, 220), spacing=4)

    # Watermark bottom-right
    wm_text = "Roast or Toast"
    wm_w, wm_h = _text_bbox(draw, wm_text, watermark_font)
    wm_x = target_w - pad - wm_w
    wm_y = target_h + overlay_h - _clamp(int(overlay_h * 0.12), 18, 48)
    draw.text((wm_x, wm_y), wm_text, font=watermark_font, fill=(255, 255, 255, 90))

    # Convert to base64 (RGB not required; PNG supports alpha, but we keep opaque anyway).
    out = canvas.convert("RGB")
    buffer = BytesIO()
    out.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def save_meme_image(image_data: str, filename: str) -> str:
    """Save base64 image data to file and return the path."""
    import os
    
    memes_dir = os.path.join(os.path.dirname(__file__), "..", "memes")
    os.makedirs(memes_dir, exist_ok=True)
    
    filepath = os.path.join(memes_dir, filename)
    
    # Remove data URL prefix if present
    if "base64," in image_data:
        image_data = image_data.split("base64,")[1]
    
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(image_data))
    
    return filepath

