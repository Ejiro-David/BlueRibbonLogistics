# Blue Ribbon Logistics: landing page

One page, one job: start a WhatsApp chat with the booking message already typed.

```
npm install        # once (Node 20+; see .nvmrc)
npm run build      # writes the finished site to dist/
npm run preview    # opens it at http://localhost:4173
npm run check      # tests every WhatsApp link, screen sizes, JS off, reduced motion; saves screenshots in shots/
```

`dist/` is the whole website. Upload that folder to Cloudflare Pages, Netlify or Vercel as-is (build command `npm run build`, output folder `dist`).

## Changing things

Almost everything lives in **`site.config.mjs`**. Edit it, then run `npm run build`.

| To change | Edit in `site.config.mjs` |
|---|---|
| **WhatsApp number** | `whatsappNumber: '2348012345678'`: country code, no `+`, no leading 0 |
| **Offer strip** (orange ticker) | `offer.items` for the lines, `offer.enabled: false` to switch it off. It hides itself after `offer.endsAfter` |
| **Starting price** | `prices.from` |
| **Recent runs** | `prices.recentRuns`: one line per run, price as a plain number |
| **Areas** | `areas`: two lists, one per moving row. The "26 areas and counting" chip updates itself |
| **FAQ** | `faq`: question `q` and answer `a`, in order |
| **Meta Pixel** | `metaPixelId`: just the number from `fbq('init', '…')` |
| **Domain** | `siteUrl`: turns on the canonical link, full link-preview URLs and a sitemap |
| **Drawn bike instead of the realistic one** | `rider: 'svg'` |

Other copy (headlines, services, promises) is in `src/index.html`. Colours and layout are in `src/styles.css`.

## Ref codes

Add `?src=` to any link you share: `https://yourdomain/?src=fb-nov`. Every chat then ends `(ref: FB-NOV)` (or `FB-NOV-VENDOR` and `FB-NOV-AREA`). Without it the ref is `SITE`. Codes are cleaned to letters, numbers, `-` and `_`, and cut to 24 characters.

## Images and fonts

Source files are in `assets/`. The web versions in `src/img/` and `src/fonts/` are generated:

```
python3 -m venv .venv && .venv/bin/pip install pillow numpy fonttools brotli   # once
npm run images     # rider, wheel, parcels, logo → src/img (WebP + AVIF)
npm run fonts      # trims Barlow to the characters the page uses → src/fonts
```

- **Logo:** cut at full resolution from the owner's wallpaper `assets/img/brand/logo-pattern_white.png` into `assets/img/logo/BRL-logo_from-pattern.png` (transparent). The same step rebuilds the footer's faint logo-pattern tile and puts the sharp logo on the link-preview card. For a different logo, drop it into `assets/img/logo/` and run `npm run images`. Any file without `LOW-RES` in its name is used first.
- **New rider image:** the wheel positions in `scripts/images.py` were measured on the current image. Re-measure them for a new one (`npm run images -- --debug` writes overlays to `shots/debug/`).

## How the motion stays light

- Only `transform` and `opacity` animate.
- Every loop pauses off screen, and `prefers-reduced-motion` stops everything; the moving rows then wrap so nothing is hidden.
- The page works fully with JavaScript off: every button is a plain `wa.me` link with the message already in it.
- About 120 KB loads before the first scroll. The page script is under 3 KB gzipped.
