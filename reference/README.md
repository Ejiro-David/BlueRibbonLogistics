# BRL site visuals

Everything visual the Blue Ribbon Logistics landing page needs, in one place for whoever builds it.

**What the site is:** one mobile-first page with one job: turn a visitor from an ad, a QR code or a WhatsApp status into a WhatsApp chat with a booking message already typed. Bookings stay on WhatsApp. See `06-page-map/BRL-landing-page-map.png` for the sections in order.

---

## What's in each folder

| Folder | What it holds | Where it goes on the page |
|---|---|---|
| `01-brand/logo` | Logo cropped from a social post. **Low resolution, so don't use it on the live site.** | Header, footer |
| `01-brand/colours` | `brl-colours.css` (colour codes ready to paste) and a colour and type sheet | Everywhere |
| `01-brand/fonts` | Barlow Condensed (headlines, buttons, labels) and Barlow (body text), as web fonts, with the free OFL licence | Everywhere |
| `01-brand/shapes` | Corner semicircles, side semicircle, the BRL wave as a section divider, and the ribbon wave, all as SVG | Hero corners and the joins between white and navy sections |
| `02-icons` | 16 line icons plus WhatsApp, in navy (for white sections) and white (for navy sections), with licences | How it works, Services, Prices, Why BRL, Areas, buttons |
| `03-share-and-favicon` | Link-preview image (1200×630) and browser icons at 32, 180, 192 and 512 px | Page `<head>`: og:image, favicon, apple-touch-icon |
| `04-photos` | Empty folders and the shot list | Hero, Services, For vendors, Why BRL |
| `05-content` | Tip 01 post and the referral reward drafts | Offer strip and the tips/trust area |
| `06-page-map` | Section map of the page | Planning and briefing |

The favicon is a **proposal** (white "BRL" on logo blue), because the full logo is unreadable at icon size. Change it if BRL already has a small mark.

---

## How the colours are used

- **White and navy sections alternate**, joined by the BRL wave.
- **Orange marks one thing per screen:** the "Book on WhatsApp" button, a price, or the current offer. Don't use it for decoration.
- **Pale blue** is only for corner shapes and soft panels.
- **Logo blue** is for small links and highlights. It isn't used for big areas, because orange on it is hard to read.

## The WhatsApp button (every button on the page)

Link format: `https://wa.me/234XXXXXXXXXX?text=<message>`, with the number in international format and no `+` or leading 0.

The booking message is already typed:

```
Hi Blue Ribbon 👋 I'd like to book a delivery.
Pickup:
Drop-off:
Item:
Pay on delivery? (Yes/No)
(ref: SITE)
```

The vendor button uses:

```
Hi Blue Ribbon, I'm a vendor and I'd like to set up regular deliveries. (ref: SITE-VENDOR)
```

- **Ref codes from the link:** if the page is opened as `...?src=fb-nov`, the message ends `(ref: FB-NOV)`. That way every chat shows which ad, flyer or QR code brought it. Use one code per ad or flyer.
- **Meta Pixel:** fire a `Contact` event on every WhatsApp button tap, so Facebook and Instagram ads can optimise for people who actually start a chat.
- **Sticky button:** keep a "Book on WhatsApp" bar fixed to the bottom of the screen on phones.

## Speed (most visitors are on phones with slow data)

- **Whole page under about 1 MB.**
- **Photos:** WebP, under about 200 KB each, and no wider than 1600 px.
- **Fonts:** load them from this folder (self-hosted), not from Google, and only the weights listed here.
- **No sliders, autoplay video, booking forms or logins.**

---

## Still needed before launch

1. **Original logo:** SVG or a large PNG with a transparent background, plus a white version if one exists.
2. **The WhatsApp booking number** for the buttons.
3. **Footer details:** phone, address or area, social handles, opening hours.
4. **Price list:** at least the starting price and a few typical routes, plus whether there's a cheaper scheduled "Saver" option.
5. **Photos:** see `04-photos/SHOT-LIST.md`.
6. **3–6 customer reviews:** WhatsApp screenshots with names and numbers hidden, used with the customer's permission.
7. **Domain.** After that, a QR code for flyers and packages that points to the page with its own ref code (e.g. `?src=qr-flyer`).
8. **The serif font used for body text in the tip posts,** if BRL wants it on the site instead of Barlow.
