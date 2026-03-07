import base64
import os
import textwrap
import uuid
from pathlib import Path
from typing import Any, Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFont

import ai  # For configure_gemini()


# Project root (Dripcheck/) so this matches the path used in main.py for the
# /generated static mount.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)


def _clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))


def _load_font(size: int) -> ImageFont.ImageFont:
    windows_fonts = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
    candidates = [
        os.path.join(windows_fonts, "segoeui.ttf"),
        os.path.join(windows_fonts, "arial.ttf"),
    ]
    for path in candidates:
        try:
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _make_outfit_card(
    base_image: Image.Image,
    outfit_name: str,
    items: List[str],
    variant_index: int,
) -> Image.Image:
    """Create a styled card with the outfit image and details overlay."""
    w, h = base_image.size

    target_w = _clamp(w, 640, 1080)
    if target_w != w:
        ratio = target_w / float(w)
        h = max(1, int(h * ratio))
        base_image = base_image.resize((target_w, h), Image.Resampling.LANCZOS)
    else:
        target_w = w

    overlay_h = _clamp(int(target_w * 0.30), 220, 380)
    canvas = Image.new("RGBA", (target_w, h + overlay_h), (0, 0, 0, 255))
    canvas.paste(base_image, (0, 0))

    # Dark gradient for text area
    overlay = Image.new("RGBA", (target_w, overlay_h), (0, 0, 0, 210))
    for y in range(overlay_h):
        alpha = int(230 * (y / float(max(1, overlay_h))))
        ImageDraw.Draw(overlay).line([(0, y), (target_w, y)], fill=(0, 0, 0, alpha))
    canvas.alpha_composite(overlay, (0, h))

    draw = ImageDraw.Draw(canvas)
    pad = _clamp(int(target_w * 0.05), 18, 42)
    gap = _clamp(int(target_w * 0.02), 10, 20)

    title_font = _load_font(_clamp(int(overlay_h * 0.16), 22, 44))
    item_font = _load_font(_clamp(int(overlay_h * 0.13), 16, 32))
    badge_font = _load_font(_clamp(int(overlay_h * 0.11), 14, 26))

    # Badge top right
    badge_text = f"OUTFIT {variant_index + 1}"
    bx, by = pad, h + pad
    bw, bh = draw.textbbox((0, 0), badge_text, font=badge_font)[2:]
    badge_pad = _clamp(int(target_w * 0.015), 8, 16)
    rect = [target_w - pad - bw - badge_pad * 2, by - 4, target_w - pad, by + bh + 4]
    try:
        draw.rounded_rectangle(rect, radius=999, fill=(255, 255, 255, 26), outline=(255, 255, 255, 40), width=1)
    except Exception:
        draw.rectangle(rect, fill=(255, 255, 255, 26), outline=(255, 255, 255, 40), width=1)
    draw.text((rect[0] + badge_pad, by), badge_text, font=badge_font, fill=(255, 255, 255, 220))

    # Title
    title_y = h + pad
    draw.text((pad, title_y), outfit_name, font=title_font, fill=(255, 255, 255, 245))

    # Items list
    items_y = title_y + draw.textbbox((0, 0), outfit_name, font=title_font)[3] + gap
    max_items = 4
    visible_items = items[:max_items]
    if len(items) > max_items:
        visible_items.append("+" + str(len(items) - max_items) + " more piece(s)")

    line_y = items_y
    bullet = "• "
    for it in visible_items:
        wrapped = textwrap.wrap(it, width=42)
        for idx, segment in enumerate(wrapped):
            prefix = bullet if idx == 0 else "  "
            draw.text((pad, line_y), prefix + segment, font=item_font, fill=(220, 220, 220, 235))
            line_y += draw.textbbox((0, 0), segment, font=item_font)[3] + 2

    # Subtle watermark
    watermark = "DripCheck AI Fits"
    wm_w, wm_h = draw.textbbox((0, 0), watermark, font=badge_font)[2:]
    draw.text(
        (target_w - pad - wm_w, h + overlay_h - wm_h - pad // 2),
        watermark,
        font=badge_font,
        fill=(255, 255, 255, 70),
    )

    return canvas.convert("RGB")


def _generate_with_dalle(prompt: str, output_path: Path) -> bool:
    """
    Generate an image using DALL-E 3 and save it to output_path.
    Returns True if successful, False otherwise.
    """
    try:
        from openai import OpenAI
        
        # Get API key from environment
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("OpenAI API key not found")
            return False
            
        client = OpenAI(api_key=api_key)
        
        # Generate the image
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        
        # Get the image URL and download it
        image_url = response.data[0].url
        
        # Download the image
        import urllib.request
        urllib.request.urlretrieve(image_url, output_path)
        
        return True
        
    except Exception as e:
        print(f"DALL-E generation error: {e}")
        return False


def _create_outfit_prompt(outfit: Dict[str, Any], base_image: Image.Image) -> str:
    """
    Create a detailed prompt for image generation to show the outfit on a person.
    """
    outfit_name = outfit.get("outfit_name", "Stylish Outfit")
    items = outfit.get("items", [])
    description = outfit.get("description", "")
    
    # Format items as a detailed list
    items_text = ", ".join(items) if items else "trendy clothes"
    
    prompt = f"""Fashion photo of a person wearing this exact outfit:

Outfit: {outfit_name}
Clothing items: {items_text}
Style: {description}

The person is wearing: {items_text}
Style description: {description}

Full body or 3/4 shot, fashion photography, high quality, realistic, natural lighting, clearly showing all clothing items."""
    
    return prompt


def generate_outfit_images(image_path: str, outfits: List[Dict[str, Any]]) -> List[str]:
    """
    Generate AI images showing the person wearing different outfits using DALL-E 3.
    
    First attempts DALL-E 3, then falls back to overlay cards if that fails.
    
    Returns a list of web paths like `/generated/<filename>.png`.
    """
    # Load the base image
    base_image = Image.open(image_path)
    if base_image.mode != "RGB":
        base_image = base_image.convert("RGB")

    web_paths: List[str] = []

    for idx, outfit in enumerate(outfits):
        filename = f"outfit_{uuid.uuid4().hex[:12]}_{idx + 1}.png"
        filepath = GENERATED_DIR / filename
        
        # Try to generate with DALL-E
        prompt = _create_outfit_prompt(outfit, base_image)
        
        if _generate_with_dalle(prompt, filepath):
            # Successfully generated AI image - add outfit info overlay
            try:
                generated_img = Image.open(filepath)
                card = _make_outfit_card(
                    base_image=generated_img,
                    outfit_name=str(outfit.get("outfit_name") or f"Outfit {idx + 1}"),
                    items=[str(i) for i in outfit.get("items") or []],
                    variant_index=idx,
                )
                card.save(filepath, format="PNG", optimize=True)
            except Exception as e:
                print(f"Error processing generated image: {e}")
                # Fallback to original with overlay
                card = _make_outfit_card(
                    base_image=base_image,
                    outfit_name=str(outfit.get("outfit_name") or f"Outfit {idx + 1}"),
                    items=[str(i) for i in outfit.get("items") or []],
                    variant_index=idx,
                )
                card.save(filepath, format="PNG", optimize=True)
        else:
            # Fallback: Use original image with overlay showing outfit suggestions
            card = _make_outfit_card(
                base_image=base_image,
                outfit_name=str(outfit.get("outfit_name") or f"Outfit {idx + 1}"),
                items=[str(i) for i in outfit.get("items") or []],
                variant_index=idx,
            )
            card.save(filepath, format="PNG", optimize=True)
        
        web_paths.append(f"/generated/{filename}")

    return web_paths


def generate_outfit_cards(image_path: str, outfits: List[Dict[str, Any]]) -> List[str]:
    """
    Generate text-based outfit cards (no AI image generation).
    Creates a styled card with the outfit details overlaid on the original image.
    
    Returns a list of base64 encoded PNG images.
    """
    from io import BytesIO
    
    # Load the base image
    base_image = Image.open(image_path)
    if base_image.mode != "RGB":
        base_image = base_image.convert("RGB")

    card_data: List[str] = []

    for idx, outfit in enumerate(outfits):
        # Create outfit card with original image and outfit details overlay
        card = _make_outfit_card(
            base_image=base_image,
            outfit_name=str(outfit.get("outfit_name") or f"Outfit {idx + 1}"),
            items=[str(i) for i in outfit.get("items") or []],
            variant_index=idx,
        )
        
        # Convert to base64
        buffer = BytesIO()
        card.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)
        card_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        card_data.append(f"data:image/png;base64,{card_b64}")

    return card_data

