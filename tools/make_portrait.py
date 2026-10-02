"""
Cut the portrait out of its background and prepare it for the site.

Replaces an earlier threshold-based version that mangled the edges — it bit
a chunk out of the left sleeve, notched the jaw, sliced the right arm at the
image border, and desaturated everything to greyscale.

This uses U2Net (via rembg) for the matte, keeps full colour, and crops to
the subject rather than to a fixed box.

    pip install rembg onnxruntime pillow
    python3 tools/make_portrait.py

Output: public/portrait.webp  (RGBA, colour)
"""

from PIL import Image, ImageEnhance
from rembg import remove, new_session
import os

SRC = "/home/user/uploads/Max_a_subject_centered_and (1).png"
OUT = "public/portrait.webp"

TARGET_W = 900      # plenty for a 2x display at the size it is drawn
PAD = 0.012         # breathing room around the subject, as a fraction of width

# The banner sits on a dark gradient and the shirt is near-black, so a little
# separation helps. Kept mild — this is a photograph, not a poster.
CONTRAST = 1.06
SATURATION = 1.10
BRIGHTNESS = 1.04


def main():
    src = Image.open(SRC).convert("RGB")
    print(f"source     {src.size}")

    cut = remove(
        src,
        session=new_session("u2net"),
        alpha_matting=True,
        alpha_matting_foreground_threshold=250,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=6,
    )

    # Crop to the subject, not to a guessed rectangle. This is what stops
    # limbs being sliced off at the image border.
    box = cut.split()[3].getbbox()
    pad = int(cut.width * PAD)
    box = (
        max(0, box[0] - pad),
        max(0, box[1] - pad),
        min(cut.width, box[2] + pad),
        min(cut.height, box[3] + pad),
    )
    cut = cut.crop(box)
    print(f"cropped to {cut.size}  (subject bounds + {pad}px)")

    # grade the colour, leaving alpha untouched
    rgb = cut.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(CONTRAST)
    rgb = ImageEnhance.Color(rgb).enhance(SATURATION)
    rgb = ImageEnhance.Brightness(rgb).enhance(BRIGHTNESS)
    cut = Image.merge("RGBA", (*rgb.split(), cut.split()[3]))

    h = round(TARGET_W * cut.height / cut.width)
    cut = cut.resize((TARGET_W, h), Image.LANCZOS)

    os.makedirs("public", exist_ok=True)
    # WebP, not PNG: 82 kB against 920 kB for the same pixels. Alpha is
    # preserved, and every browser that can run this site's CSS (svh units)
    # has supported WebP for years.
    cut.save(OUT, "WEBP", quality=86, method=6)
    kb = os.path.getsize(OUT) / 1024
    print(f"wrote      {OUT}  {cut.size}  {kb:.0f} kB")


if __name__ == "__main__":
    main()
