"""
Fun Zone Router — Student creative tools (completely separate from mentor/voice).

Endpoints:
  POST /api/fun/meme-mix   — blend two uploaded images (overlay composite)
  POST /api/fun/imagine    — text-to-image via Pollinations AI (free, no key)
"""

import io
import logging
import urllib.parse
import urllib.request
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from PIL import Image, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Meme Mixer ───────────────────────────────────────────────────────────────

@router.post("/meme-mix")
async def meme_mix(
    meme: UploadFile = File(..., description="Meme/background image"),
    photo: UploadFile = File(..., description="Student/person photo to overlay"),
    opacity: float = Form(0.72, description="Overlay opacity 0.0 – 1.0"),
):
    """
    Composite a student photo on top of a meme background using alpha blending.

    Steps:
      1. Load both images with Pillow.
      2. Resize the overlay (photo) to fit proportionally in the bottom-right corner.
      3. Paste with alpha mask at requested opacity.
      4. Return as JPEG bytes.
    """
    try:
        # Load images
        meme_bytes = await meme.read()
        photo_bytes = await photo.read()

        bg = Image.open(io.BytesIO(meme_bytes)).convert("RGBA")
        fg = Image.open(io.BytesIO(photo_bytes)).convert("RGBA")

        bg_w, bg_h = bg.size

        # Resize overlay photo to ~35% of background width, keep aspect ratio
        overlay_w = int(bg_w * 0.38)
        fg_ratio = fg.height / fg.width
        overlay_h = int(overlay_w * fg_ratio)
        fg_resized = fg.resize((overlay_w, overlay_h), Image.LANCZOS)

        # Apply a slight soft-light / brightness boost for better blending
        enhancer = ImageEnhance.Brightness(fg_resized)
        fg_resized = enhancer.enhance(1.08)

        # Apply opacity to overlay
        r, g, b, a = fg_resized.split()
        a = a.point(lambda p: int(p * opacity))
        fg_resized = Image.merge("RGBA", (r, g, b, a))

        # Position: bottom-right with small margin
        margin = int(bg_w * 0.03)
        pos_x = bg_w - overlay_w - margin
        pos_y = bg_h - overlay_h - margin

        # Paste overlay onto background using its own alpha as mask
        bg.paste(fg_resized, (pos_x, pos_y), fg_resized)

        # Convert to RGB and return as JPEG
        result = bg.convert("RGB")
        output = io.BytesIO()
        result.save(output, format="JPEG", quality=90)
        output.seek(0)

        return StreamingResponse(output, media_type="image/jpeg")

    except Exception as exc:
        logger.error("Meme mix failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(exc)}")


# ─── Imagine It (Text-to-Image via Pollinations AI) ───────────────────────────

class ImagineRequest(BaseModel):
    prompt: str
    category: Optional[str] = "general"
    width: int = 1024
    height: int = 768


# Category-specific prompt prefixes to boost quality and relevance
CATEGORY_PREFIXES = {
    "study_life": "funny cartoon illustration of a student, college life, ",
    "scifi_research": "cinematic sci-fi digital art, futuristic research lab, ",
    "college_meme": "humorous meme-style illustration, college students, vibrant colors, ",
    "dream_project": "epic fantasy concept art, student achievement, dramatic lighting, ",
    "fantasy": "epic fantasy illustration, detailed, magical atmosphere, ",
    "general": "high quality digital art, vibrant, detailed, ",
}


@router.post("/imagine")
async def imagine(request: ImagineRequest):
    """
    Generate an image from a text prompt using Pollinations AI.

    Pollinations AI is completely free, requires no API key, and supports
    high-resolution image generation via a simple URL-based API.

    API: https://image.pollinations.ai/prompt/{encoded_prompt}?width=W&height=H&nologo=true
    """
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    # Prepend category prefix for better results
    prefix = CATEGORY_PREFIXES.get(request.category, CATEGORY_PREFIXES["general"])
    full_prompt = f"{prefix}{request.prompt.strip()}, high quality, detailed"

    # Encode and build Pollinations URL
    encoded = urllib.parse.quote(full_prompt)
    # Add a random seed to avoid cached identical results
    import random
    seed = random.randint(1, 99999)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={request.width}&height={request.height}&nologo=true&seed={seed}"
    )

    logger.info("Fetching image from Pollinations: %s", url[:120])

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ResearchMindAI/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            image_bytes = resp.read()

        if len(image_bytes) < 1000:
            raise HTTPException(status_code=502, detail="Pollinations returned an empty image.")

        return Response(content=image_bytes, media_type="image/jpeg")

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Imagine failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Image generation service unavailable. Check your internet connection."
        )
