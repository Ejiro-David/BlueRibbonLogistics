# Start here: handing the BRL site to Claude Code

## 1. Open the folder in Claude Code

1. Unzip this folder somewhere you keep projects, for example `Documents/BRL-website`.
2. Open it in VS Code and start Claude Code there. You can also run `claude` in a terminal inside the folder.
3. Claude Code reads `CLAUDE.md` automatically. That file is the full brief: brand, layout, motion, budgets, and what not to change.

## 2. Paste this as your first message

```
This folder is the Blue Ribbon Logistics landing page. Read CLAUDE.md first. It has the brief, the brand rules and the limits.

site/index.html is the approved version: keep its style, layout, section order and copy. Turn it into a production static site, then bring it to life and make it sleeker using the "Motion" list in CLAUDE.md. Keep it light and fast on phones.

Don't change any line that states a fact about the business (prices, promises, areas). Those are listed under "Facts to confirm"; ask me about them instead.

Start by setting up the project and showing me your plan. Then build it and show me screenshots at phone and desktop size.
```

## 3. When your GPT images are ready

1. Make the images with the prompts in `prompts/gpt-image-prompts.md`, using one ChatGPT chat for both.
2. Save them as `assets/img/rider/rider-body.png` and `assets/img/rider/wheel.png`.
3. Tell Claude Code: **"The rider images are in. Integrate them as described in CLAUDE.md."**

## 4. Things only you can give it

Send these to Claude Code as you get them:

- [ ] The WhatsApp booking number
- [ ] The original logo file (SVG or a large PNG)
- [ ] Footer details: phone, location, social handles, opening hours
- [ ] Your price list, and whether Saver pricing is real yet
- [ ] Yes or no on each item under "Facts to confirm" in CLAUDE.md
- [ ] Real photos (see `reference/04-photos/SHOT-LIST.md`)
- [ ] 3–6 customer reviews as WhatsApp screenshots, used with permission
- [ ] Your domain, for going live and for the flyer QR code

## 5. Going live

Ask Claude Code: **"Deploy this to Cloudflare Pages"** (or Netlify). It will walk you through it. Both are free for a site like this.
