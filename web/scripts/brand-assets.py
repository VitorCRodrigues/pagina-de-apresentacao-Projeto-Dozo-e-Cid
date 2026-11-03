# Builds the flat brand files the app uses from the official artwork in src/assets/brand/source.
# Run with: python scripts/brand-assets.py (needs Pillow). The app never uses the gradient
# versions: the symbol keeps its exact outline, filled with one colour.
from pathlib import Path

from PIL import Image, ImageDraw

brand = Path(__file__).resolve().parent.parent / "src" / "assets" / "brand"
source = brand / "source"

# Brand tokens (src/styles/tokens.css).
NAVY = (0x0B, 0x1F, 0x3A)
CREAM = (0xF7, 0xF4, 0xEE)

HEIGHT = 120  # px, margin included; shown at 28 to 36 px, so sharp up to 3x screens.
MARGIN = 0.06  # of the ink height, on every side: resampling must not shave the outer curves.


def save(image, box, name):
    """Crops to the ink plus a margin, scales to HEIGHT and saves."""
    left, top, right, bottom = box
    pad = round((bottom - top) * MARGIN)
    framed = Image.new("RGBA", (right - left + 2 * pad, bottom - top + 2 * pad), (0, 0, 0, 0))
    framed.paste(image.crop(box), (pad, pad))
    size = (round(framed.width * HEIGHT / framed.height), HEIGHT)
    framed.resize(size, Image.LANCZOS).save(brand / name, optimize=True)
    return size


def wordmark():
    """Flat wordmark on white -> transparent, in its own two inks, and all in cream."""
    im = Image.open(source / "wordmark-flat-on-white.png").convert("RGB")
    w, h = im.size
    px = im.load()

    # "Open" is navy and "Dollars" green: the split is the first column whose solid ink is green.
    def solid(x):
        return [px[x, y] for y in range(h) if max(px[x, y]) < 120]

    first = next(x for x in range(w) if solid(x))
    split = next(x for x in range(first, w) if any(g - r > 40 for r, g, _ in solid(x)))

    def ink(x0, x1):
        dark = sorted(px[x, y] for x in range(x0, x1, 3) for y in range(0, h, 3) if max(px[x, y]) < 120)
        return dark[len(dark) // 2]

    inks = (ink(first, split), ink(split, w))
    colour = Image.new("RGBA", (w, h))
    cream = Image.new("RGBA", (w, h))
    out, out_cream = colour.load(), cream.load()
    for x in range(w):
        tone = inks[0] if x < split else inks[1]
        for y in range(h):
            # On white, the red channel is the one with the widest range for both inks.
            a = round(255 * min(1, max(0, (255 - px[x, y][0]) / (255 - tone[0]))))
            out[x, y] = (*tone, a)
            out_cream[x, y] = (*CREAM, a)

    box = colour.getchannel("A").getbbox()
    save(colour, box, "wordmark.png")
    print("wordmark:", save(cream, box, "wordmark-cream.png"), "inks:", ["#%02x%02x%02x" % c for c in inks])


def symbol():
    """The symbol's exact outline, filled flat: navy for cream backgrounds, cream for navy."""
    mask = Image.open(source / "symbol-gradient.png").convert("RGBA").getchannel("A")
    box = mask.getbbox()
    for name, rgb in (("symbol.png", NAVY), ("symbol-cream.png", CREAM)):
        flat = Image.new("RGBA", mask.size, (*rgb, 0))
        flat.putalpha(mask)
        size = save(flat, box, name)
    print("symbol:", size)


def icon(size, radius, inset):
    """Cream symbol on a navy square: the app icon and the favicon."""
    symbol = Image.open(source / "symbol-gradient.png").convert("RGBA")
    mask = symbol.getchannel("A")
    mask = mask.crop(mask.getbbox())
    room = size - 2 * inset
    scale = min(room / mask.width, room / mask.height)
    mask = mask.resize((round(mask.width * scale), round(mask.height * scale)), Image.LANCZOS)

    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, size - 1, size - 1), radius, fill=(*NAVY, 255))
    fill = Image.new("RGBA", mask.size, (*CREAM, 255))
    tile.paste(fill, ((size - mask.width) // 2, (size - mask.height) // 2), mask)
    return tile


if __name__ == "__main__":
    wordmark()
    symbol()
    # iOS rounds the corners itself; the favicon gets its own small radius.
    icon(180, 0, 30).save(brand / "apple-touch-icon.png", optimize=True)
    icon(32, 6, 4).save(brand / "favicon-32.png", optimize=True)
