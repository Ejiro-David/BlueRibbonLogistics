# Blue Ribbon Logistics: landing page

## What this project is

A one-page, mobile-first website for **Blue Ribbon Logistics (BRL)**, a same-day motorcycle dispatch business in Benin City, Edo State, Nigeria. Tagline: "Delivering Excellence, Every Mile".

The page has **one job**: turn a visitor into a WhatsApp chat with a booking message already typed. Visitors arrive from Meta ads, QR codes on flyers and packages, WhatsApp status, Instagram bio links and Google. **Bookings happen only on WhatsApp.** No forms, logins, carts, blog or extra pages.

## Where things stand

- `site/index.html` is the **approved working version**. The owner said: "the style is great". It is one self-contained file with CSS, JS and SVG inline.
- **Your job:** turn it into a production static site, bring it to life, and make it sleeker wherever you can.
- **Keep** the look, the layout, the section order and the copy.
- `reference/` holds the brand kit, the page map and the original tip-post template the brand is built from. Treat it as read-only reference.
- `assets/` holds the source files the site uses or will use.

## Non-negotiables

1. **Keep the identity:** colours, fonts, the corner semicircles, the BRL wave dividers, condensed capital headlines, the animated motorcycle, and the section order below.
2. **Every call-to-action opens WhatsApp** through `https://wa.me/<number>?text=<message>`.
   - Use the exact message templates in the WhatsApp section below.
   - Add a ref code from `?src=` to the message.
   - Fire `fbq('track','Contact')` on tap when the Meta Pixel is present.
3. **Performance budget**, measured on a mid-range Android on slow 4G:
   - About 350 KB or less on first load, not counting the Pixel.
   - LCP under 2.5 s, CLS under 0.05.
   - Runtime JS 25 KB or less, minified and gzipped. Use vanilla JS: no React or animation libraries at runtime. A build step (Vite or plain scripts) is fine.
4. **Motion:**
   - Animate transform and opacity wherever possible.
   - Pause loops when they're off screen.
   - Fully respect `prefers-reduced-motion`.
   - The page must read completely without JS: content visible, and the links still plain `wa.me` links.
5. **Accessibility:**
   - Semantic HTML and visible focus states.
   - Tap targets of 44 px or more.
   - Real alt text.
   - WCAG AA contrast for all text.
6. **Screen sizes:** it must look right at 360×740, 390×844, 768, 1280 and 1440, with no horizontal scroll anywhere.

## Brand

| Token | Hex | Use |
|---|---|---|
| Navy | `#1B4557` | Headlines, dark sections, the wave |
| Navy deep | `#12303D` | Footer, final road |
| Logo blue | `#035DB1` | Logo, bike panels, small highlights. Never a big area behind orange text |
| Logo fold | `#033369` | Ribbon folds |
| Orange | `#F98715` | **One accent per screen:** the main WhatsApp button, prices, the current offer |
| Pale blue | `#C6DEE6` | Semicircles, soft shapes |
| Mist | `#EEF4F6` | Soft section and card backgrounds |
| White | `#FFFFFF` | Base |

- **Type:** Barlow Condensed 600/700/800 for headlines, labels and buttons, always in capitals. Barlow 400/500/600 for body text.
  - The site currently loads them from Google Fonts. Self-host the woff2 files in `assets/fonts/` instead: preload the two most used weights, and use `font-display: swap` with a metric-matched fallback so the headline doesn't jump.
- **₦ sign:** Barlow has no ₦ (U+20A6), so the site draws it with the `.naira` class: an N with two CSS strokes. Keep that, or switch to a face that has the glyph and still matches.
- **Shapes:** pale semicircle with a thin navy arc in the top-left corner; the BRL wave (an S-curve edge with a thin ribbon line) between white and navy sections; pill tags.
- **Logo:** `assets/img/logo/` has a **low-resolution crop**. Swap in the original as soon as the owner provides it. Don't redraw, recolour or stretch the logo, and keep it on white.
- **Voice:** plain, practical and friendly, in Nigerian English. Short sentences, no hype. Say what happens ("We collect payment from your customers at the door").

## Page structure (keep this order)

1. **Header:** logo, desktop nav, a small "Book" button, and a **progress road**: a dashed line with a mini bike that travels to an orange pin as you scroll.
2. **Hero:**
   - Eyebrow, headline "Same-day delivery across Benin City" with an orange swoosh under "Same-day", lede, orange WhatsApp button, "See prices" link, three chips.
   - **The stage:** sun, two parallax skyline layers (palm trees included), road with moving lane dashes, and the motorcycle riding.
   - On phones the stage sits between the headline and the lede, so the bike shows on the first screen.
3. **Offer ticker:** orange marquee with the current promo. It's a referral reward running 9–29 November with ₦7,000, ₦5,000 and ₦3,000 prizes. Make it easy to change or switch off.
4. **How it works (navy):** three real steps on a vertical route. A tracking dot follows scroll, a sticky "Rider: Picking up / On the way / Delivered" chip updates, and each step turns orange when reached.
5. **Services:** 6 cards whose icons draw themselves in.
6. **Prices (mist):** "From ₦2,500" counts up. Express and Saver tiers, plus "Recent runs".
7. **Areas:** two marquee rows of neighbourhood chips, plus "Not on the list?".
8. **For vendors (navy):** three ticks, a ghost button with the vendor message, and floating parcels.
9. **Why BRL:** three promises with icons.
10. **FAQ (mist):** accordion.
11. **Final call (navy):** "Got something to send?". The bike rides in and parks beside the button.
12. **Footer**, then a **sticky WhatsApp bar** that appears after the hero button scrolls away and hides at the final button.

## Motion: what exists and how to make it sleeker

The current hooks are `.rider`, `.bike-tilt`, `.bike-body`, `.wheel`, `.puff`, `.beam`, `.speed`, `.sky-far`, `.sky-near`, `.dashes`, `.rv` (reveal), `.draw` (icon line-draw), `.status`, `.tracker`, `.road-bike`.

Ideas, in rough priority order. Use judgement, and keep it tasteful: no scroll-jacking and no autoplay video.

1. **Swap in the realistic rider images** when they arrive (next section), keeping the SVG bike as the fallback.
2. **Scroll-linked depth in the hero:** as you scroll away, the skyline layers drift at different speeds and the bike pulls ahead and leans slightly. Use CSS scroll-driven animations (`animation-timeline: scroll()/view()`) with an IntersectionObserver fallback.
3. **Wheel speed follows scroll speed:** spin the mini bike's wheels (and the hero wheels, gently) faster when you scroll faster.
4. **A cleaner load sequence:** the bike ride-in, the headline words rising, the swoosh drawing and the button popping should feel like one orchestrated beat in about 1.4 s, with no layout shift from fonts.
5. **Section joins:** draw the thin ribbon line of each wave as it comes into view.
6. **Micro-interactions:**
   - Clear pressed states on buttons.
   - Very subtle magnetic or tilt hover on the main CTA and the cards (desktop only).
   - Haptic-feeling scale on tap.
7. **Useful extras:**
   - Tapping an area chip opens WhatsApp with "Hi Blue Ribbon, do you deliver to {area}?". Use ref `AREA`.
   - An "Open now" or hours line once the hours are confirmed.
8. **Keep every loop light:** off-screen loops pause. The marquees run on transform only. Lane dashes move a transformed element, not `background-position`.

## Realistic rider images (the owner will add them)

The owner is generating two images in ChatGPT; the prompts are in `prompts/gpt-image-prompts.md`. They'll be dropped into `assets/img/rider/`:

- `rider-body.png`: rider and motorcycle in flat side profile facing right, with a custom BRL box. Transparent background, or flat green `#00B140`.
- `wheel.png`: one wheel of the same bike, perfectly side-on, square, with flat lighting.

To integrate them:

1. **Clean up:** if the background is green, chroma-key it to alpha with edge despill. Trim to content.
2. **Measure** both wheel centres and tyre radii on the body image. Use a circle fit, or measure by hand.
3. **Cut the wheels out of the body:** erase each wheel disc (out to the tyre's outer edge) from the body image so it becomes a "body with holes". Keep parts that belong in front of the wheel (fork, fender, exhaust, chain guard) by masking around them.
4. **Layer** two copies of `wheel.png` *behind* the body, scaled to the measured diameter and centred on each hub. Spin them with CSS. The light is flat, so the rotation looks right.
5. **Hook up the existing motion:** keep the same classes so everything still works. Re-place `.puff` at the exhaust tip, `.beam` at the headlight, and the tilt origin at the rear tyre contact point.
6. **Export:** WebP with alpha at about 2× the largest display size. Aim for the body at 120 KB or less and the wheel at 25 KB or less, adding AVIF where it's smaller, through `<picture>`. Set explicit width and height so nothing jumps.
7. **Fix the box lettering if needed:** if GPT's "BRL" on the box comes out wrong, overlay `assets/svg/brl-box-face.svg` on the box face.
8. **Fallback:** if the images are missing or fail to load, show the SVG bike from `assets/svg/bike.svg`, which is what's in the page now.

The header mini bike can stay as the SVG.

## WhatsApp links

- `WA_NUMBER` is currently empty, which makes WhatsApp ask who to send to. Put it in one config spot, in international format with no `+` (e.g. `2348012345678`). **The owner still has to provide it.**
- **Ref code:** take `?src=` from the URL, sanitise it to `[A-Za-z0-9_-]`, cap it at 24 characters and uppercase it. Default it to `SITE`.
- **Booking message** (keep verbatim):

  ```
  Hi Blue Ribbon 👋 I'd like to book a delivery.
  Pickup:
  Drop-off:
  Item:
  Pay on delivery? (Yes/No)
  (ref: {SRC})
  ```

- **Vendor message:** `Hi Blue Ribbon, I'm a vendor and I'd like to set up regular deliveries. (ref: {SRC}-VENDOR)`
- **Meta Pixel:** leave a clearly marked place to paste the Pixel base code. Load it after first interaction or `requestIdleCallback` so it doesn't hurt LCP.

## Facts to confirm with the owner (never invent business facts)

The copy in `site/index.html` includes claims the owner hasn't confirmed yet. **Ask before publishing; don't change them on your own.**

- The **Saver tier** (cheaper when it can wait) is an idea, not a live product yet.
- The **"Recent runs"** prices come from the owner's June job logs:
  - Ekosodin → Isihor ₦2,500
  - BDPA → Ewere Street ₦3,000
  - Upper Ekenwan → Sapele Road ₦8,000
  - Okhun → Upper Sakponba ₦9,000
- **"From ₦2,500"** as the starting price.
- **Promises:**
  - The price is confirmed before pickup.
  - Customers get a WhatsApp message at pickup and at delivery.
  - Collected payments are passed on to vendors.
  - Waybills go to Lagos *and other states*.
- **"26 areas and counting"** and the areas list, which come from the job logs.
- **Reviews:** never add fake ones. A reviews section goes in only when real screenshots arrive, used with permission and with names and numbers hidden.

## Still missing from the owner

- The original logo (SVG or large PNG).
- The WhatsApp number.
- Footer details: phone, address or area, social handles and hours.
- An official price list.
- Real photos (`reference/04-photos/SHOT-LIST.md`).
- Reviews.
- The domain.
- The QR code, which comes after the domain.

## SEO and sharing

- A title and meta description.
- Open Graph and Twitter tags using `assets/share/link-preview_1200x630.png`, plus the favicon set.
- `LocalBusiness` / `CourierService`-style JSON-LD with the name, `areaServed` Benin City, and the telephone once it's known.
- Canonical URL once there's a domain.
- `lang="en-NG"`.

## Deliverable and definition of done

- **The build:** a static build in `dist/` that deploys as-is to Cloudflare Pages, Netlify or Vercel.
- **A short README** saying how to change:
  - The WhatsApp number.
  - The offer ticker.
  - The prices and recent runs.
  - The areas list.
  - The FAQ.
- **Lighthouse (mobile):** Performance, Accessibility, Best Practices and SEO all 95 or above.
- **Checks to pass:**
  - Every CTA opens WhatsApp with the right text and ref.
  - No horizontal scroll at 360 px.
  - Reduced motion is respected.
  - Content shows with JS off.
- **Screenshots** at 390 and 1280 px, shared with the owner before deploying.
