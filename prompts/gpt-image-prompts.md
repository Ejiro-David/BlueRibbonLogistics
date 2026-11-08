# GPT image prompts: realistic BRL rider

Use **one ChatGPT chat** for both prompts, so the wheel matches the bike. Download the **full-size originals**, not WhatsApp-compressed copies, and save them as:

- `assets/img/rider/rider-body.png`
- `assets/img/rider/wheel.png`

Then tell Claude Code: "The rider images are in." It will cut them out, separate the wheels so they spin, and swap them into the animation.

---

## Prompt 1: rider and motorcycle with a custom BRL box

```
A realistic studio render of a Nigerian dispatch rider on a commuter motorcycle (like a Bajaj Boxer), shown in a perfectly flat side profile facing right, camera at wheel height, no perspective tilt. The whole bike is in frame with some empty margin around it.

Motorcycle: royal blue tank and side panels (#035DB1), black seat, chrome exhaust. Both wheels fully visible, perfectly round and the same size, with spoke rims.

Rear rack carries a custom branded BRL delivery box:
- glossy white box body with rounded corners
- dark navy lid (#1B4557) with a thin orange (#F98715) trim line just under the lid
- across the side of the box, a royal-blue (#035DB1) ribbon banner like a sash, slightly tilted, with folded darker-blue tails sticking out past both edges of the box
- on the ribbon, the letters "BRL" in bold, white, slanted condensed capitals, spelled exactly B-R-L
- a solid orange (#F98715) stripe along the bottom edge of the box
No other text or logos anywhere.

Rider: sitting upright and leaning slightly forward, both hands on the handlebars. Orange hi-vis vest with silver reflective stripes over a blue long-sleeve shirt, dark trousers, black boots, white full-face helmet with a dark visor.

Soft, even studio lighting. No motion blur, no ground shadow, no background: transparent PNG. If transparency isn't possible, use a flat solid green (#00B140) background with nothing else on it.
Landscape 3:2, highest resolution.
```

**If "BRL" comes out misspelled or blurry,** keep the image anyway. Claude Code will put the exact BRL box face over it (`assets/svg/brl-box-face.svg`).

## Prompt 2: the wheel on its own (same chat)

```
Now only one wheel from that same motorcycle: same tyre, rim, spokes and hub. Viewed exactly side-on so it's a perfect circle, not an oval, centred in a square image with a little margin.
Flat, even lighting with no shiny highlights or reflections, so it looks right when it spins. No motion blur, no shadow, transparent background (or the same flat green #00B140).
```

---

## Optional extras

**Floating parcels for the vendor section:**

```
Three realistic sealed cardboard parcels stacked casually: two at the bottom, one on top. Wrapped with royal-blue (#035DB1) packing tape and a small orange (#F98715) label on each. Studio render, soft even light, no text, no shadow, transparent background, square.
```

**Hero background:** not needed. The city skyline and road are drawn in code so they can loop and move.

**Photos of the real riders** should come from the photo shot list (`reference/04-photos/SHOT-LIST.md`), not from AI. Customers trust real riders.
