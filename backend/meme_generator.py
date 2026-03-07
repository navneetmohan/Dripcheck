import os
import base64
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from typing import Dict, Any


def create_meme_card(image_path: str, analysis: Dict[str, Any], verdict: Dict[str, str]) -> str:
    """
    Create a shareable meme card with the outfit analysis.
    
    Returns base64-encoded PNG image.
    """
    # Load the original image
    original_img = Image.open(image_path)
    
    # Convert to RGB if necessary
    if original_img.mode != 'RGB':
        original_img = original_img.convert('RGB')
    
    # Calculate new dimensions (max 800px width, maintain aspect ratio)
    max_width = 800
    width, height = original_img.size
    if width > max_width:
        ratio = max_width / width
        new_width = max_width
        new_height = int(height * ratio)
        original_img = original_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    else:
        new_width, new_height = width, height
    
    # Create a new image with space for overlay at bottom
    overlay_height = 200
    canvas = Image.new('RGB', (new_width, new_height + overlay_height), (0, 0, 0))
    canvas.paste(original_img, (0, 0))
    
    # Create gradient overlay at bottom
    overlay = Image.new('RGBA', (new_width, overlay_height), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    
    # Draw gradient
    for y in range(overlay_height):
        alpha = int(255 * (y / overlay_height))
        draw_overlay.line([(0, y), (new_width, y)], fill=(0, 0, 0, alpha))
    
    canvas.paste(overlay, (0, new_height), overlay)
    
    # Now add text
    draw = ImageDraw.Draw(canvas)
    
    # Load fonts (use default if custom fonts not available)
    try:
        title_font = ImageFont.truetype("arial.ttf", 48)
        subtitle_font = ImageFont.truetype("arial.ttf", 28)
        body_font = ImageFont.truetype("arial.ttf", 18)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
    
    drip_score = analysis.get("drip_score", 50)
    archetype = analysis.get("archetype", "Style Rebel")
    verdict_text = verdict.get("verdict", "TOAST")
    commentary = verdict.get("commentary", "Looking good!")
    
    # Determine colors based on score
    if drip_score >= 70:
        score_color = (46, 204, 113)  # Green
    elif drip_score >= 45:
        score_color = (241, 196, 15)   # Yellow
    else:
        score_color = (231, 76, 60)    # Red
    
    # Draw drip score
    score_text = f"{drip_score}"
    draw.text((30, new_height + 20), score_text, font=title_font, fill=score_color)
    
    # Draw "/100"
    draw.text((100, new_height + 30), "/100", font=subtitle_font, fill=(255, 255, 255))
    
    # Draw archetype
    draw.text((30, new_height + 80), archetype, font=subtitle_font, fill=(255, 255, 255))
    
    # Draw verdict badge
    verdict_color = (231, 76, 60) if verdict_text == "ROAST" else (46, 204, 113)
    verdict_emoji = "🔥" if verdict_text == "ROAST" else "✨"
    verdict_display = f"{verdict_emoji} {verdict_text}"
    draw.text((new_width - 180, new_height + 20), verdict_display, font=subtitle_font, fill=verdict_color)
    
    # Draw commentary (truncate if too long)
    if len(commentary) > 50:
        commentary = commentary[:47] + "..."
    draw.text((30, new_height + 120), commentary, font=body_font, fill=(200, 200, 200))
    
    # Add watermark
    draw.text((new_width - 150, new_height + 170), "Roast or Toast", font=body_font, fill=(100, 100, 100))
    
    # Convert to base64
    buffer = BytesIO()
    canvas.save(buffer, format='PNG', quality=90)
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


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

