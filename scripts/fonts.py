"""
Trim the Barlow web fonts to the characters this page can use.   npm run fonts

  Barlow Condensed (600/700/800): every use on the page is set in capitals by CSS
  (text-transform: uppercase), so it keeps capitals, digits and punctuation, plus
  accented capitals in case a name needs one.
  Barlow (400/500/600): body text, so it keeps full Latin (both cases, accents).

Reads assets/fonts/*.woff2, writes src/fonts/*.woff2 (the build uses these).
If you ever show lowercase text in the condensed face, add a-z to CONDENSED below
and run this again.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "fonts"
OUT = ROOT / "src" / "fonts"

PUNCT = "U+0020-0040,U+005B-0060,U+007B-007E,U+00A0,U+00A9,U+00AB,U+00B7,U+00BB,U+2013-2014,U+2018-201E,U+2022,U+2026"
CONDENSED = PUNCT + ",U+0041-005A,U+00C0-00DE"                # capitals (+ accented capitals)
BODY = PUNCT + ",U+0041-005A,U+0061-007A,U+00A1-00FF,U+20AC"   # full Latin-1

def unicodes(spec):
    out = []
    for part in spec.split(","):
        part = part.strip()[2:]
        a, _, b = part.partition("-")
        out.extend(range(int(a, 16), int(b or a, 16) + 1))
    return out

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total_in = total_out = 0
    for f in sorted(SRC.glob("*-normal.woff2")):
        spec = CONDENSED if "condensed" in f.name else BODY
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]          # keep kerning, tabular numbers, etc.
        opts.hinting = False                  # phones and Macs ignore hints
        opts.desubroutinize = True
        opts.name_IDs = ["*"]                 # keep the licence and name records
        opts.notdef_outline = True
        font = TTFont(f)
        s = subset.Subsetter(opts)
        s.populate(unicodes=unicodes(spec))
        s.subset(font)
        dest = OUT / f.name
        font.flavor = "woff2"
        font.save(dest)
        a, b = f.stat().st_size, dest.stat().st_size
        total_in += a; total_out += b
        print(f"  {f.name:38} {a/1024:5.1f} KB -> {b/1024:5.1f} KB")
    print(f"  total {total_in/1024:.0f} KB -> {total_out/1024:.0f} KB")

if __name__ == "__main__":
    main()
