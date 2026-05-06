#!/usr/bin/env python3
"""
Generate the full favicon + PWA icon set for cbgrupbarna-3x3timechamber.com.

Source: public/images/cb-grup-barna.jpg (683x908, vertical triangular shield).
Output: square-canvas variants in public/, plus a multi-resolution favicon.ico.

Re-run after replacing the source logo.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "images" / "cb-grup-barna.jpg"
OUT = ROOT / "public"

WHITE = (255, 255, 255, 255)
BRAND_NAVY = (11, 16, 32, 255)


def square_canvas(logo: Image.Image, size: int, bg, padding_pct: float = 0.10) -> Image.Image:
    """Place `logo` centered on a square `size`x`size` canvas with given bg + padding."""
    canvas = Image.new("RGBA", (size, size), bg)
    inner = int(size * (1 - 2 * padding_pct))
    lw, lh = logo.size
    scale = min(inner / lw, inner / lh)
    new_w, new_h = int(lw * scale), int(lh * scale)
    resized = logo.resize((new_w, new_h), Image.LANCZOS)
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    canvas.paste(resized, (x, y), resized if resized.mode == "RGBA" else None)
    return canvas


def main():
    if not SRC.exists():
        raise SystemExit(f"Source not found: {SRC}")

    logo = Image.open(SRC).convert("RGBA")
    print(f"Source: {SRC.name}  {logo.size}")

    # Master 1024 white bg (used for everything except dark/maskable variants)
    master_white_1024 = square_canvas(logo, 1024, WHITE, padding_pct=0.10)
    master_white_1024.save(OUT / "images" / "cb-grup-barna-square-1024.png", "PNG")
    print("OK  images/cb-grup-barna-square-1024.png  1024x1024")

    # Logo for JSON-LD Organization.logo (512, white bg)
    logo_512 = master_white_1024.resize((512, 512), Image.LANCZOS)
    logo_512.save(OUT / "cb-grup-barna-logo-512.png", "PNG")
    print("OK  cb-grup-barna-logo-512.png  512x512")

    # Standard favicon PNGs
    for size in [16, 32, 48, 64, 96]:
        img = master_white_1024.resize((size, size), Image.LANCZOS)
        img.save(OUT / f"favicon-{size}x{size}.png", "PNG")
        print(f"OK  favicon-{size}x{size}.png")

    # Multi-resolution .ico — Google needs >=48px multiple, browsers pick best size
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (96, 96)]
    master_white_1024.save(
        OUT / "favicon.ico",
        format="ICO",
        sizes=ico_sizes,
        append_images=[master_white_1024.resize(s, Image.LANCZOS) for s in ico_sizes],
    )
    print(f"OK  favicon.ico  multi-res {ico_sizes}")

    # Apple touch icon — 180x180, NO transparency (iOS composites black on alpha)
    apple = master_white_1024.resize((180, 180), Image.LANCZOS).convert("RGB")
    apple.save(OUT / "apple-touch-icon.png", "PNG")
    print("OK  apple-touch-icon.png  180x180  (RGB, no alpha)")

    # Android Chrome / PWA
    for size in [192, 512]:
        img = master_white_1024.resize((size, size), Image.LANCZOS)
        img.save(OUT / f"android-chrome-{size}x{size}.png", "PNG")
        print(f"OK  android-chrome-{size}x{size}.png")

    # Maskable (Android adaptive) — shield must fit in 80% safe zone, more padding
    maskable_512 = square_canvas(logo, 512, WHITE, padding_pct=0.20)
    maskable_512.save(OUT / "android-chrome-maskable-512x512.png", "PNG")
    print("OK  android-chrome-maskable-512x512.png  512x512  (20% padding)")

    # Microsoft tile
    mstile = square_canvas(logo, 150, BRAND_NAVY, padding_pct=0.10)
    mstile.save(OUT / "mstile-150x150.png", "PNG")
    print("OK  mstile-150x150.png  150x150  (navy bg)")

    print("\nDone. Commit + deploy. Then Search Console > URL Inspection > Request Indexing.")


if __name__ == "__main__":
    main()
