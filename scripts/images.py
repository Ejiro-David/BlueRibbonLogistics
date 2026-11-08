"""
BRL image pipeline: turns the owner's source images into small web files.

  npm run images        (runs .venv/bin/python scripts/images.py)

Inputs (assets/img/...):
  rider/rider-body.png   GPT rider + motorcycle, transparent background
  rider/wheel.png        GPT wheel, side-on (this one came with a painted checkerboard)
  parcels/parcels.png    GPT parcel stack for the vendor section
  logo/*.png             logo (swap in the original when the owner sends it)

Outputs (src/img/...) plus src/img/manifest.json, which the build reads
for image sizes and for where the wheels, exhaust and headlight sit.

The measurements below (wheel centres, the parts that sit in front of the
wheels) were taken from these exact source files. If the rider image is
replaced, re-measure them: run with --debug to get overlay images.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "img"
OUT = ROOT / "src" / "img"
DEBUG = "--debug" in sys.argv
DBG = ROOT / "shots" / "debug"

# --------------------------------------------------------------------------
# Measured on rider-body.png (1536x1024). Circles fitted to the tyre edges.
REAR = dict(cx=386.2, cy=850.4, r=198.0)
FRONT = dict(cx=1264.1, cy=841.3, r=196.8)
EXHAUST_TIP = (281, 866)      # left end of the silencer
HEADLIGHT = (1236, 486)       # front face of the headlamp

# Parts of the bike that sit IN FRONT of each wheel and must stay on the body.
# Shapes: ("capsule", (x1, y1), (x2, y2), radius) | ("circle", (x, y), r) | ("poly", [...])
KEEP_FRONT = [
    ("capsule", (1190, 630), (1262, 812), 18),     # fork tube
    ("capsule", (1248, 780), (1276, 838), 20),     # fork slider
    ("circle", (1281, 846), 17),                   # axle nut
]
FENDER_ZONE = [(1040, 600), (1250, 600), (1250, 690), (1170, 690), (1110, 740),
               (1090, 820), (1085, 900), (1040, 900)]
KEEP_REAR = [
    ("poly", [(292, 828), (450, 846), (604, 864), (606, 920), (450, 907), (292, 897),
              (284, 889), (279, 863), (283, 836)]),  # silencer
    ("capsule", (486, 648), (440, 800), 18),       # shock absorber spring
    ("capsule", (440, 790), (426, 826), 14),       # shock lower body
    ("circle", (428, 828), 13),                    # shock eye bolt
    ("circle", (497, 836), 17),                    # swingarm bolt
    ("poly", [(490, 822), (606, 818), (606, 842), (490, 850)]),  # swingarm
    ("capsule", (563, 722), (523, 815), 7),        # brake rod
]


def log(*a):
    print("  ", *a)


def save_web(im, name, widths, q_webp=80, q_avif=52, manifest=None):
    """Save WebP (and AVIF when it is smaller) at the given widths."""
    OUT.mkdir(parents=True, exist_ok=True)
    entry = {"w": im.width, "h": im.height, "files": []}
    for w in widths:
        h = round(im.height * w / im.width)
        r = im.resize((w, h), Image.LANCZOS) if w != im.width else im
        webp = OUT / f"{name}-{w}.webp"
        r.save(webp, "WEBP", quality=q_webp, alpha_quality=90, method=6)
        f = {"w": w, "h": h, "webp": webp.name, "webpBytes": webp.stat().st_size}
        avif = OUT / f"{name}-{w}.avif"
        try:
            r.save(avif, "AVIF", quality=q_avif, speed=4)
            if avif.stat().st_size < webp.stat().st_size * 0.92:
                f["avif"], f["avifBytes"] = avif.name, avif.stat().st_size
            else:
                avif.unlink()
        except Exception as e:  # AVIF encoder missing: WebP only
            log("avif skipped:", e)
        entry["files"].append(f)
        log(f"{name}-{w}: webp {f['webpBytes']//1024} KB" + (f", avif {f['avifBytes']//1024} KB" if "avif" in f else ""))
    if manifest is not None:
        manifest[name] = entry
    return entry


def shape_mask(size, shapes):
    W, H = size
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    out = np.zeros((H, W), bool)
    for s in shapes:
        if s[0] == "poly":
            d.polygon(s[1], fill=255)
        elif s[0] == "circle":
            (x, y), r = s[1], s[2]
            d.ellipse((x - r, y - r, x + r, y + r), fill=255)
        elif s[0] == "capsule":
            (x1, y1), (x2, y2), r = s[1], s[2], s[3]
            vx, vy = x2 - x1, y2 - y1
            t = np.clip(((xx - x1) * vx + (yy - y1) * vy) / (vx * vx + vy * vy), 0, 1)
            out |= (xx - (x1 + t * vx)) ** 2 + (yy - (y1 + t * vy)) ** 2 <= r * r
    return out | (np.array(m) > 0)


def dilate(mask, n):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    return np.array(im.filter(ImageFilter.MaxFilter(2 * n + 1))) > 0


def erode(mask, n):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    return np.array(im.filter(ImageFilter.MinFilter(2 * n + 1))) > 0


def bleed_edges(arr, alpha, passes=6):
    """Replace the colour of soft/transparent edge pixels with the nearest solid colour
    (stops pale or coloured fringes from the original background)."""
    rgb = arr[..., :3].astype(np.float32)
    solid = alpha > 0.9
    for _ in range(passes):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(alpha.shape, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == dy == 0:
                    continue
                s = np.roll(np.roll(solid, dy, 0), dx, 1)
                acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * s[..., None]
                cnt += s
        grow = (~solid) & (cnt > 0)
        rgb[grow] = acc[grow] / cnt[grow][:, None]
        solid = solid | grow
    out = arr.copy()
    out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    return out


# --------------------------------------------------------------------------
def make_wheel(manifest):
    print("wheel")
    src = Image.open(SRC / "rider" / "wheel.png").convert("RGB")
    w = np.array(src).astype(np.float32)
    H, W = w.shape[:2]
    g = w.mean(2)
    sat = w.max(2) - w.min(2)
    bg = (g > 208) & (sat < 16)            # the painted checkerboard (both tones)

    # Outer tyre edge: fit an axis-aligned ellipse, then resample to a true circle.
    cx0, cy0 = W / 2, H / 2
    pts = []
    for t in np.linspace(0, 2 * np.pi, 720, endpoint=False):
        c, s = np.cos(t), np.sin(t)
        for r in np.arange(min(W, H) * 0.53, min(W, H) * 0.38, -0.5):
            ok = True
            for k in (0, 1, 2, 3):
                x, y = int(round(cx0 + (r - k) * c)), int(round(cy0 + (r - k) * s))
                if not (0 <= x < W and 0 <= y < H) or bg[y, x]:
                    ok = False
                    break
            if ok:
                pts.append((cx0 + r * c, cy0 + r * s))
                break
    p = np.array(pts)
    M = np.c_[p[:, 0] ** 2, p[:, 1] ** 2, p[:, 0], p[:, 1]]
    A, C, D, E = np.linalg.lstsq(M, np.ones(len(p)), rcond=None)[0]
    cx, cy = -D / (2 * A), -E / (2 * C)
    F = 1 + D * D / (4 * A) + E * E / (4 * C)
    a, b = np.sqrt(F / A), np.sqrt(F / C)
    log(f"ellipse centre=({cx:.1f},{cy:.1f}) a={a:.1f} b={b:.1f}")

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rn = np.sqrt(((xx - cx) / a) ** 2 + ((yy - cy) / b) ** 2)

    # Spokes: darker than the checkerboard, with bright highlights between dark edges.
    core = (g < 200) | (sat > 22)
    spokes = dilate(core, 1) & ~(bg & ~dilate(core, 1))
    spokes = erode(dilate(spokes, 1), 1)                 # close pinholes
    solid = (rn <= 0.29) | ((rn >= 0.672) & (rn <= 1.0))  # hub, rim and tyre
    alpha = np.where(solid, 1.0, 0.0)
    band = (rn > 0.29) & (rn < 0.672)
    alpha[band] = spokes[band].astype(np.float32)
    alpha[rn > 1.0] = 0
    # Soft edge on the tyre and on the spokes.
    a_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    edge = np.clip((1.0 - rn) * max(a, b) + 0.5, 0, 1)  # 1px anti-aliased outer edge
    alpha = np.minimum(np.array(a_img) / 255.0, edge)
    rgba = np.dstack([w.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    rgba = bleed_edges(rgba, alpha, passes=3)

    # Resample the ellipse to a circle centred in a square canvas.
    R = (a + b) / 2
    size = int(np.ceil(2 * R + 4))
    im = Image.fromarray(rgba, "RGBA")
    sx, sy = a / R, b / R
    # output (u,v) -> input (x,y): x = cx + (u - size/2) * sx, y = cy + (v - size/2) * sy
    im = im.transform((size, size), Image.AFFINE,
                      (sx, 0, cx - size / 2 * sx, 0, sy, cy - size / 2 * sy), resample=Image.BICUBIC)
    if DEBUG:
        DBG.mkdir(parents=True, exist_ok=True)
        bgc = Image.new("RGBA", im.size, (255, 0, 255, 255))
        bgc.alpha_composite(im)
        bgc.convert("RGB").save(DBG / "wheel-on-magenta.png")
    # Tyre fills the square edge to edge (2px margin) so CSS can size it by diameter.
    e = save_web(im, "wheel", [208], q_webp=78, q_avif=50, manifest=manifest)
    e["margin"] = (size - 2 * R) / 2 / size   # transparent margin, as a fraction of the canvas


def make_body(manifest):
    print("rider body")
    src = Image.open(SRC / "rider" / "rider-body.png").convert("RGBA")
    arr = np.array(src)
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    alpha = arr[..., 3].astype(np.float32) / 255

    def disc(c, extra=6):
        return (xx - c["cx"]) ** 2 + (yy - c["cy"]) ** 2 <= (c["r"] + extra) ** 2

    rgb = arr[..., :3].astype(np.int32)
    blue = (rgb[..., 2] > rgb[..., 0] + 40) & (rgb[..., 2] > rgb[..., 1] + 25)
    fender = erode(dilate(blue & shape_mask((W, H), [("poly", FENDER_ZONE)]), 3), 3)
    keep_front = shape_mask((W, H), KEEP_FRONT) | fender
    keep_rear = shape_mask((W, H), KEEP_REAR)
    hole = (disc(FRONT) & ~keep_front) | (disc(REAR) & ~keep_rear)
    hole_soft = np.array(Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))) / 255
    alpha = alpha * (1 - hole_soft)
    arr = arr.copy()
    arr[..., 3] = (alpha * 255).astype(np.uint8)

    # Canvas = body content + both full wheel circles (the tyres run off the source's bottom edge).
    ys, xs = np.where(alpha > 0.03)
    x0 = min(xs.min(), REAR["cx"] - REAR["r"], FRONT["cx"] - FRONT["r"]) - 4
    x1 = max(xs.max(), REAR["cx"] + REAR["r"], FRONT["cx"] + FRONT["r"]) + 4
    y0 = ys.min() - 4
    y1 = max(REAR["cy"] + REAR["r"], FRONT["cy"] + FRONT["r"]) + 4
    x0, y0, x1, y1 = int(np.floor(x0)), int(np.floor(y0)), int(np.ceil(x1)), int(np.ceil(y1))
    canvas = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    canvas.paste(Image.fromarray(arr, "RGBA"), (-x0, -y0))
    cw, ch = canvas.size
    log(f"canvas {cw}x{ch} (from x{x0} y{y0})")

    if DEBUG:
        DBG.mkdir(parents=True, exist_ok=True)
        bgc = Image.new("RGBA", canvas.size, (255, 0, 255, 255))
        bgc.alpha_composite(canvas)
        bgc.convert("RGB").save(DBG / "body-holes-on-magenta.png")

    save_web(canvas, "rider", [480, 720], q_webp=80, q_avif=55, manifest=manifest)

    def rel(x, y):
        return [round((x - x0) / cw, 5), round((y - y0) / ch, 5)]

    manifest["rider"].update({
        "wheels": [
            {"c": rel(REAR["cx"], REAR["cy"]), "d": round(2 * REAR["r"] / cw, 5)},
            {"c": rel(FRONT["cx"], FRONT["cy"]), "d": round(2 * FRONT["r"] / cw, 5)},
        ],
        "exhaust": rel(*EXHAUST_TIP),
        "headlight": rel(*HEADLIGHT),
        "rearContact": rel(REAR["cx"], REAR["cy"] + REAR["r"]),
        # wheelbase in source pixels, so the build can scale the photo to the SVG bike
        "wheelbase": round((FRONT["cx"] - REAR["cx"]) / cw, 5),
    })


def make_parcels(manifest):
    print("parcels")
    src = Image.open(SRC / "parcels" / "parcels.png").convert("RGBA")
    arr = np.array(src)
    alpha = arr[..., 3].astype(np.float32) / 255
    # The edge pixels carry an orange/red fringe from the original background:
    # pull the alpha in by about a pixel and recolour what is left of the edge.
    a = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) / 255
    a = np.array(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))) / 255
    a = np.minimum(a, alpha)
    arr = bleed_edges(arr, a, passes=4)
    arr[..., 3] = (a * 255).astype(np.uint8)
    im = Image.fromarray(arr, "RGBA")
    im = im.crop(im.getbbox())
    log(f"trimmed {im.size}")
    if DEBUG:
        DBG.mkdir(parents=True, exist_ok=True)
        bgc = Image.new("RGBA", im.size, (27, 69, 87, 255))
        bgc.alpha_composite(im)
        bgc.convert("RGB").save(DBG / "parcels-on-navy.png")
    save_web(im, "parcels", [360, 720], q_webp=78, q_avif=50, manifest=manifest)


# The owner's logo wallpaper (assets/img/brand/logo-pattern_white.png): every logo is about
# 912x1064 px; they repeat every 1100 px across and 1296 px down, each column 432 px lower.
PATTERN_LOGO_BOX = (720, 632, 1632, 1696)
PATTERN = dict(col=1100 / 912, period=1296 / 912, shift=432 / 912)   # as multiples of the logo width


def extract_logo():
    """Cut one full-resolution logo out of the white wallpaper, with a transparent background."""
    src_path = SRC / "brand" / "logo-pattern_white.png"
    dest = SRC / "logo" / "BRL-logo_from-pattern.png"
    if not src_path.exists():
        return
    print("logo (cut from the wallpaper)")
    x0, y0, x1, y1 = PATTERN_LOGO_BOX
    pad = 24
    im = Image.open(src_path).convert("RGB").crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
    a = np.array(im)
    white = a.min(2) > 238
    # Background = the white connected to the edge. White letters inside the ribbon are not
    # connected to it, so they stay solid.
    m = Image.fromarray((white * 255).astype(np.uint8)).copy()   # .copy(): fromarray images are read-only
    for seed in [(0, 0), (m.width - 1, 0), (0, m.height - 1), (m.width - 1, m.height - 1)]:
        if m.getpixel(seed) == 255:
            ImageDraw.floodfill(m, seed, 128)
    outside = np.array(m) == 128
    inside = ~outside
    band = inside & dilate(outside, 2)               # anti-aliased rim next to the background
    solid = inside & ~band
    rgba = np.dstack([a, (solid * 255).astype(np.uint8)])
    bled = bleed_edges(rgba, solid.astype(np.float32), passes=4)[..., :3].astype(np.float32)
    est = np.clip((255 - a.min(2).astype(np.float32)) / np.maximum(1, 255 - bled.min(2)), 0, 1)
    alpha = solid.astype(np.float32)
    alpha[band] = est[band]
    out = a.copy()
    out[band] = bled[band].astype(np.uint8)
    logo = Image.fromarray(np.dstack([out, (alpha * 255).astype(np.uint8)]), "RGBA")
    logo = logo.crop(logo.getbbox())
    logo.save(dest)
    log(f"saved {dest.relative_to(ROOT)} {logo.size}")
    if DEBUG:
        DBG.mkdir(parents=True, exist_ok=True)
        for name, colour in [("navy", (18, 48, 61, 255)), ("magenta", (255, 0, 255, 255))]:
            bgc = Image.new("RGBA", logo.size, colour)
            bgc.alpha_composite(logo)
            bgc.convert("RGB").save(DBG / f"logo-on-{name}.png")


def make_pattern(manifest):
    """A small repeating tile of the logo wallpaper, for the footer."""
    src_path = SRC / "logo" / "BRL-logo_from-pattern.png"
    if not src_path.exists():
        return
    print("logo pattern tile")
    logo = Image.open(src_path).convert("RGBA")
    L = 150                                            # logo width in the tile (shown at half size)
    lh = round(logo.height * L / logo.width)
    logo = logo.resize((L, lh), Image.LANCZOS)
    col, period, shift = round(PATTERN["col"] * L), round(PATTERN["period"] * L), PATTERN["shift"] * L
    # Draw three periods of the lattice, then keep the middle one: logos that cross the
    # top/bottom edge are then complete when the tile repeats.
    big = Image.new("RGBA", (3 * col, 3 * period), (0, 0, 0, 0))
    for i in range(3):
        y = round(i * shift) % period
        for k in range(-1, 3):
            big.paste(logo, (i * col + (col - L) // 2, y + k * period), logo)
    tile = big.crop((0, period, 3 * col, 2 * period))
    save_web(tile, "pattern", [tile.width], q_webp=82, q_avif=60, manifest=manifest)


def make_link_preview(manifest):
    """Swap the logo on the link-preview card (WhatsApp/Facebook) for the full-resolution one."""
    src_path = SRC / "logo" / "BRL-logo_from-pattern.png"
    card_path = ROOT / "assets" / "share" / "link-preview_1200x630.png"
    if not src_path.exists() or not card_path.exists():
        return
    print("link preview")
    card = Image.open(card_path).convert("RGBA")
    c = np.array(card).astype(np.int16)
    # The old logo is the blue artwork top-right (plus its tagline underneath).
    blueish = (c[..., 2] > c[..., 0] + 60)
    blueish[:, :850] = False
    blueish[320:, :] = False
    ys, xs = np.where(blueish)
    bx0, by0, bx1, by1 = xs.min() - 6, ys.min() - 6, xs.max() + 6, ys.max() + 6
    d = ImageDraw.Draw(card)
    d.rectangle((bx0, by0, bx1, by1), fill=(255, 255, 255, 255))
    logo = Image.open(src_path).convert("RGBA")
    h = by1 - by0
    w = round(logo.width * h / logo.height)
    logo = logo.resize((w, h), Image.LANCZOS)
    card.alpha_composite(logo, (round((bx0 + bx1) / 2 - w / 2), by0))
    OUT.mkdir(parents=True, exist_ok=True)
    card.convert("RGB").save(OUT / "link-preview.png", optimize=True)
    log(f"logo box was {bx0},{by0}-{bx1},{by1}; saved src/img/link-preview.png")


def make_logo(manifest):
    print("logo")
    files = sorted((SRC / "logo").glob("*.png")) + sorted((SRC / "logo").glob("*.webp"))
    # Prefer a file that is not the low-res crop, once the owner adds the original.
    files.sort(key=lambda f: ("LOW-RES" in f.name, f.name))
    src = Image.open(files[0]).convert("RGBA")
    src = src.crop(src.getbbox())
    log(f"using {files[0].name} {src.size}")
    # Header shows it 58px tall: 2x = 116px (3x when the source allows).
    h = min(src.height, 174)
    w = round(src.width * h / src.height)
    im = src.resize((w, h), Image.LANCZOS) if h != src.height else src
    save_web(im, "logo", [w], q_webp=90, q_avif=70, manifest=manifest)


if __name__ == "__main__":
    manifest = {}
    make_wheel(manifest)
    make_body(manifest)
    make_parcels(manifest)
    extract_logo()
    make_logo(manifest)
    make_pattern(manifest)
    make_link_preview(manifest)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print("wrote", (OUT / "manifest.json").relative_to(ROOT))
