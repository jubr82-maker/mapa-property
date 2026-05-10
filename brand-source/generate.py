#!/usr/bin/env python3
"""Génère les brand assets MAPA Property : logo SVG, favicons, PWA icons, OG."""
from __future__ import annotations
import os
import struct
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Couleurs (depuis master prompt)
COPPER = (184, 134, 90)       # #B8865A
NAVY   = (61, 79, 99)         # #3D4F63
NAVY_DARK = (45, 63, 83)      # #2D3F53
IVORY  = (245, 242, 234)      # #F5F2EA
INK    = (26, 26, 26)         # #1A1A1A
WHITE  = (255, 255, 255)

OUT_PUBLIC = Path("/Users/MAPA_Claude_Code/Documents/Projects/mapa-property-nextjs/public")
OUT_PUBLIC.mkdir(parents=True, exist_ok=True)

# Fonts (macOS)
FONT_SERIF = "/System/Library/Fonts/Supplemental/Times New Roman.ttf"
FONT_SERIF_BOLD = "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf"
FONT_SANS = "/System/Library/Fonts/Helvetica.ttc"

if not Path(FONT_SERIF).exists():
    # Fallback macOS
    FONT_SERIF = "/System/Library/Fonts/Times.ttc"
    FONT_SERIF_BOLD = FONT_SERIF


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


# ---------- SVG generators ----------

def write_logo_svg(path: Path, fg: str, sub: str, bg: str | None = None) -> None:
    """Logo horizontal MAPA + filet + PROPERTY."""
    bg_rect = (
        f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ""
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" role="img" aria-label="MAPA Property">
  {bg_rect}
  <g font-family="Georgia, 'Times New Roman', serif" text-anchor="middle">
    <text x="160" y="42" font-size="40" font-weight="700" letter-spacing="6" fill="{fg}">MAPA</text>
    <line x1="80" y1="50" x2="240" y2="50" stroke="#B8865A" stroke-width="1.5"/>
    <text x="160" y="68" font-family="'Helvetica Neue', Arial, sans-serif" font-size="9" letter-spacing="6" fill="{sub}">PROPERTY</text>
  </g>
</svg>
"""
    path.write_text(svg, encoding="utf-8")
    print(f"  ✓ {path.name}")


def write_mark_svg(path: Path, fg: str, bg: str | None = None) -> None:
    """Mark only : monogramme M dans cercle copper."""
    bg_circle = (
        f'<circle cx="48" cy="48" r="44" fill="{bg}" stroke="#B8865A" stroke-width="2"/>'
        if bg
        else f'<circle cx="48" cy="48" r="44" fill="none" stroke="#B8865A" stroke-width="3"/>'
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="MAPA">
  {bg_circle}
  <text x="48" y="60" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="700"
        text-anchor="middle" fill="{fg}">M</text>
</svg>
"""
    path.write_text(svg, encoding="utf-8")
    print(f"  ✓ {path.name}")


# ---------- Raster generators ----------

def make_mark_png(size: int, bg=None, ring=COPPER, fg=NAVY) -> Image.Image:
    """Génère un PNG du monogramme M (mark only)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if bg is None else bg)
    draw = ImageDraw.Draw(img)
    # Cercle copper
    margin = max(2, size // 24)
    draw.ellipse(
        (margin, margin, size - margin, size - margin),
        outline=ring,
        width=max(2, size // 32),
        fill=bg if bg else None,
    )
    # M centré
    font_size = int(size * 0.55)
    font = load_font(FONT_SERIF_BOLD, font_size)
    text = "M"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1] - int(size * 0.02)
    draw.text((x, y), text, font=font, fill=fg)
    return img


def make_horizontal_png(width: int, height: int, bg=IVORY, fg_main=NAVY) -> Image.Image:
    """Génère un PNG du logo horizontal MAPA / filet / PROPERTY."""
    img = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(img)
    # MAPA
    main_size = int(height * 0.45)
    main_font = load_font(FONT_SERIF_BOLD, main_size)
    text = "MAPA"
    bbox = draw.textbbox((0, 0), text, font=main_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (width - tw) // 2 - bbox[0]
    y = int(height * 0.22) - bbox[1]
    # letter-spacing fake: render letters separately
    draw.text((x, y), text, font=main_font, fill=fg_main)
    # Filet copper
    filet_y = y + th + int(height * 0.04)
    filet_w = int(width * 0.35)
    draw.rectangle(
        (
            (width - filet_w) // 2,
            filet_y,
            (width + filet_w) // 2,
            filet_y + max(2, height // 80),
        ),
        fill=COPPER,
    )
    # PROPERTY
    sub_size = int(height * 0.10)
    sub_font = load_font(FONT_SANS, sub_size)
    sub_text = "P R O P E R T Y"
    sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    stw = sub_bbox[2] - sub_bbox[0]
    sx = (width - stw) // 2 - sub_bbox[0]
    sy = filet_y + int(height * 0.05)
    draw.text((sx, sy), sub_text, font=sub_font, fill=fg_main)
    return img


def make_og_image(width: int, height: int, tagline: str) -> Image.Image:
    """OG image 1200x630 : navy bg + logo copper centré + tagline."""
    img = Image.new("RGB", (width, height), NAVY)
    draw = ImageDraw.Draw(img)

    # Border copper subtle
    border_inset = 32
    draw.rectangle(
        (border_inset, border_inset, width - border_inset, height - border_inset),
        outline=COPPER,
        width=2,
    )

    # MAPA en gros au milieu-haut
    main_size = int(height * 0.20)
    main_font = load_font(FONT_SERIF_BOLD, main_size)
    text = "MAPA"
    bbox = draw.textbbox((0, 0), text, font=main_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (width - tw) // 2 - bbox[0]
    y = int(height * 0.28) - bbox[1]
    draw.text((x, y), text, font=main_font, fill=COPPER)

    # Filet copper
    filet_y = y + th + int(height * 0.025)
    filet_w = int(width * 0.30)
    draw.rectangle(
        (
            (width - filet_w) // 2,
            filet_y,
            (width + filet_w) // 2,
            filet_y + 3,
        ),
        fill=COPPER,
    )

    # PROPERTY
    sub_size = int(height * 0.045)
    sub_font = load_font(FONT_SANS, sub_size)
    sub_text = "P R O P E R T Y"
    sb = draw.textbbox((0, 0), sub_text, font=sub_font)
    stw = sb[2] - sb[0]
    sx = (width - stw) // 2 - sb[0]
    sy = filet_y + int(height * 0.04)
    draw.text((sx, sy), sub_text, font=sub_font, fill=WHITE)

    # Tagline en bas
    tag_size = int(height * 0.045)
    tag_font = load_font(FONT_SERIF, tag_size)
    tag_bbox = draw.textbbox((0, 0), tagline, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_x = (width - tag_w) // 2 - tag_bbox[0]
    tag_y = int(height * 0.72)
    draw.text((tag_x, tag_y), tagline, font=tag_font, fill=IVORY)

    # Petit eyebrow tout en bas
    eb_size = int(height * 0.025)
    eb_font = load_font(FONT_SANS, eb_size)
    eb_text = "AGENCE IMMOBILIÈRE LUXEMBOURGEOISE · BROKER INTERNATIONAL"
    eb_bbox = draw.textbbox((0, 0), eb_text, font=eb_font)
    eb_w = eb_bbox[2] - eb_bbox[0]
    eb_x = (width - eb_w) // 2 - eb_bbox[0]
    eb_y = int(height * 0.83)
    draw.text((eb_x, eb_y), eb_text, font=eb_font, fill=COPPER)

    return img


def save_ico(path: Path, png_paths: list[Path]) -> None:
    """Combine plusieurs PNG (16, 32, 48) dans un seul ICO."""
    images = [Image.open(p) for p in png_paths]
    images[0].save(
        path,
        format="ICO",
        sizes=[(im.width, im.height) for im in images],
        append_images=images[1:] if len(images) > 1 else [],
    )
    print(f"  ✓ {path.name}")


def make_offmarket_hero(width: int, height: int) -> Image.Image:
    """Hero off-market : navy radial avec OFF MARKET serif copper."""
    # Radial gradient : créer un mask
    img = Image.new("RGB", (width, height), NAVY_DARK)
    cx, cy = width // 2, height // 2
    max_r = int((cx**2 + cy**2) ** 0.5)
    # Faux radial : couches concentriques
    for r in range(max_r, 0, -8):
        t = r / max_r  # 1 au bord, 0 au centre
        # Fade vers navy clair au centre
        c = (
            int(NAVY_DARK[0] + (NAVY[0] - NAVY_DARK[0]) * (1 - t)),
            int(NAVY_DARK[1] + (NAVY[1] - NAVY_DARK[1]) * (1 - t)),
            int(NAVY_DARK[2] + (NAVY[2] - NAVY_DARK[2]) * (1 - t)),
        )
        Image.new("RGB", (1, 1), c)
        # Dessiner un disque
        d = ImageDraw.Draw(img)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)

    draw = ImageDraw.Draw(img)
    # Cadre copper subtil
    inset = 80
    draw.rectangle(
        (inset, inset, width - inset, height - inset),
        outline=COPPER,
        width=2,
    )

    # Eyebrow
    eb_size = int(height * 0.025)
    eb_font = load_font(FONT_SANS, eb_size)
    eb_text = "ACCÈS CONFIDENTIEL"
    ebb = draw.textbbox((0, 0), eb_text, font=eb_font)
    ebx = (width - (ebb[2] - ebb[0])) // 2 - ebb[0]
    eby = int(height * 0.36) - ebb[1]
    draw.text((ebx, eby), eb_text, font=eb_font, fill=COPPER)

    # OFF MARKET
    main_size = int(height * 0.13)
    main_font = load_font(FONT_SERIF_BOLD, main_size)
    main_text = "OFF MARKET"
    mb = draw.textbbox((0, 0), main_text, font=main_font)
    mw, mh = mb[2] - mb[0], mb[3] - mb[1]
    mx = (width - mw) // 2 - mb[0]
    my = (height - mh) // 2 - mb[1]
    draw.text((mx, my), main_text, font=main_font, fill=COPPER)

    # Soustitre
    sub_size = int(height * 0.025)
    sub_font = load_font(FONT_SERIF, sub_size)
    sub_text = "Sous mandat. Sous NDA. Hors portails."
    sb = draw.textbbox((0, 0), sub_text, font=sub_font)
    sx = (width - (sb[2] - sb[0])) // 2 - sb[0]
    sy = my + mh + int(height * 0.04)
    draw.text((sx, sy), sub_text, font=sub_font, fill=IVORY)

    return img


# ---------- Main ----------

def main() -> None:
    print("=== MAPA Property — Brand assets generation ===")

    # 1. SVG logos
    print("\n[1] SVG logos")
    write_logo_svg(
        OUT_PUBLIC / "logo-mapa-property.svg",
        fg="#3D4F63",
        sub="#3D4F63",
        bg=None,
    )
    write_logo_svg(
        OUT_PUBLIC / "logo-mapa-property-dark.svg",
        fg="#F5F2EA",
        sub="#F5F2EA",
        bg=None,
    )
    write_mark_svg(
        OUT_PUBLIC / "logo-mark.svg",
        fg="#3D4F63",
        bg="#F5F2EA",
    )

    # 2. Favicons (PNG + ICO)
    print("\n[2] Favicons")
    fav_sizes = [16, 32, 48]
    fav_paths = []
    for s in fav_sizes:
        p = OUT_PUBLIC / f"favicon-{s}.png"
        img = make_mark_png(s, bg=IVORY)
        img.save(p)
        fav_paths.append(p)
        print(f"  ✓ favicon-{s}.png")
    save_ico(OUT_PUBLIC / "favicon.ico", fav_paths)

    # 3. Apple touch icon
    print("\n[3] Apple touch icon")
    apple = make_mark_png(180, bg=IVORY)
    apple.save(OUT_PUBLIC / "apple-touch-icon.png")
    print("  ✓ apple-touch-icon.png")

    # 4. PWA icons
    print("\n[4] PWA icons")
    for s in [192, 384, 512]:
        img = make_mark_png(s, bg=IVORY)
        img.save(OUT_PUBLIC / f"pwa-{s}.png")
        print(f"  ✓ pwa-{s}.png")
    # Maskable : safe area 80% au centre, padding 10% chaque côté
    maskable = Image.new("RGBA", (512, 512), IVORY)
    inner = make_mark_png(int(512 * 0.78), bg=IVORY)
    pad = (512 - inner.width) // 2
    maskable.paste(inner, (pad, pad))
    maskable.save(OUT_PUBLIC / "pwa-512-maskable.png")
    print("  ✓ pwa-512-maskable.png")

    # 5. OG image
    print("\n[5] OG / social cards")
    og = make_og_image(1200, 630, "L'immobilier ne se vend pas. Il se confie.")
    og.save(OUT_PUBLIC / "og-image.png", optimize=True)
    print("  ✓ og-image.png (1200x630)")
    twitter = make_og_image(1200, 600, "L'immobilier ne se vend pas. Il se confie.")
    twitter.save(OUT_PUBLIC / "twitter-card.png", optimize=True)
    print("  ✓ twitter-card.png (1200x600)")

    # 6. Off-market hero
    print("\n[6] Off-market hero")
    hero = make_offmarket_hero(1600, 1000)
    hero.save(OUT_PUBLIC / "offmarket_hero.png", optimize=True)
    print("  ✓ offmarket_hero.png (1600x1000)")

    # 7. Site webmanifest
    print("\n[7] PWA manifest")
    manifest = """{
  "name": "MAPA Property",
  "short_name": "MAPA",
  "description": "Agence immobilière luxembourgeoise et broker international.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F2EA",
  "theme_color": "#3D4F63",
  "icons": [
    { "src": "/pwa-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/pwa-384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/pwa-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/pwa-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
"""
    (OUT_PUBLIC / "site.webmanifest").write_text(manifest, encoding="utf-8")
    print("  ✓ site.webmanifest")

    print("\n=== DONE ===")


if __name__ == "__main__":
    main()
