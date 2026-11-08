// Checks the built site and takes screenshots.   npm run check   (run npm run build first)
//  - every WhatsApp button opens wa.me with the right message and ref code
//  - no horizontal scroll at 360, 390, 768, 1280 and 1440 px
//  - the page reads with JavaScript off, and nothing moves with reduced motion
//  - the Meta Pixel "Contact" event fires on tap
//  - no console errors
// Screenshots land in shots/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'shots');
mkdirSync(SHOTS, { recursive: true });
const config = (await import(pathToFileURL(join(ROOT, 'site.config.mjs')).href)).default;
const PORT = 4174, BASE = `http://localhost:${PORT}/`;
const server = await serve(join(ROOT, 'dist'), PORT);
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`); if (!cond) failures++; };
const number = String(config.whatsappNumber || '').replace(/\D/g, '');
const expected = (kind, src, area = '') => config.messages[kind].split('{SRC}').join(src).split('{AREA}').join(area);

function watchErrors(page, label) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(e.message));
  return () => ok(errs.length === 0, `${label}: no console errors${errs.length ? ' → ' + errs.join(' | ') : ''}`);
}
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= h; y += 300) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(70); }
  await page.waitForTimeout(1200);
}

// ---------------------------------------------------------------- 1. WhatsApp links + ref codes
console.log('\nWhatsApp links');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const done = watchErrors(page, 'links page');
  for (const [query, src] of [['', 'SITE'], ['?src=fb-nov', 'FB-NOV'], ['?src=qr_flyer%3Cscript%3E!!', 'QR_FLYERSCRIPT'], ['?src=' + 'x'.repeat(40), 'X'.repeat(24)]]) {
    await page.goto(BASE + query);
    const links = await page.$$eval('[data-wa]', (as) => as.map((a) => ({
      kind: a.dataset.wa, area: a.dataset.area || '', href: a.href, target: a.target, rel: a.rel,
    })));
    let bad = 0;
    for (const l of links) {
      const u = new URL(l.href);
      const good = u.origin === 'https://wa.me' && u.pathname === '/' + number &&
        u.searchParams.get('text') === expected(l.kind, src, l.area) && l.target === '_blank' && /noopener/.test(l.rel);
      if (!good) { bad++; if (bad < 4) console.log('     ', l.kind, l.area, decodeURIComponent(l.href)); }
    }
    const kinds = links.reduce((m, l) => ((m[l.kind] = (m[l.kind] || 0) + 1), m), {});
    ok(bad === 0, `src "${query || '(none)'}" → ref ${src}: ${links.length} links correct (${Object.entries(kinds).map(([k, v]) => v + ' ' + k).join(', ')})`);
  }
  // Meta Pixel event on tap (a stand-in fbq records the call; wa.me is not contacted)
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ body: 'wa.me stub' }));
  await page.addInitScript(() => { window.__fbq = []; window.fbq = function () { window.__fbq.push([].slice.call(arguments)); }; });
  await page.goto(BASE);
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('#hero-cta')]);
  await popup.close();
  const calls = await page.evaluate(() => window.__fbq);
  ok(calls.some((c) => c[0] === 'track' && c[1] === 'Contact'), `tapping "Book on WhatsApp" fires fbq('track','Contact') → ${JSON.stringify(calls)}`);
  done();
  await ctx.close();
}

// ---------------------------------------------------------------- 2. sizes: no horizontal scroll + screenshots
console.log('\nScreen sizes');
for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1280, 800], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 800 ? 3 : 2, hasTouch: w < 800, isMobile: w < 800 });
  const page = await ctx.newPage();
  const done = watchErrors(page, `${w}px`);
  await page.goto(BASE);
  await page.waitForTimeout(2600);
  if (w === 390 || w === 1280) await page.screenshot({ path: join(SHOTS, `${w}-1-first-screen.png`) });
  await scrollThrough(page);
  const overflow = await page.evaluate(() => {
    document.documentElement.style.overflowX = 'visible';
    document.body.style.overflowX = 'visible';
    const sw = document.documentElement.scrollWidth, iw = window.innerWidth;
    const culprits = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > iw + 1 && !el.closest('.lanes,.ticker,.stage,.hero,.vendors,.final');
    }).slice(0, 5).map((el) => el.tagName + '.' + el.className);
    document.documentElement.style.overflowX = ''; document.body.style.overflowX = '';
    return { sw, iw, culprits };
  });
  ok(overflow.sw <= overflow.iw && overflow.culprits.length === 0, `${w}×${h}: no horizontal scroll (page ${overflow.sw}px wide)${overflow.culprits.length ? ' → ' + overflow.culprits.join(', ') : ''}`);
  if (w === 390 || w === 1280) {
    // Full page at 2x (Chrome tiles anything taller than 16,384 device px), sticky bar hidden
    // so it doesn't float over the middle of the long image.
    await page.evaluate(() => scrollTo(0, 0));
    await page.addStyleTag({ content: '.sticky{display:none!important}' });
    await page.waitForTimeout(400);
    const full = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const fp = await full.newPage();
    await fp.goto(BASE);
    await scrollThrough(fp);
    await fp.evaluate(() => scrollTo(0, 0));
    await fp.addStyleTag({ content: '.sticky{display:none!important}' });
    await fp.waitForTimeout(600);
    await fp.screenshot({ path: join(SHOTS, `${w}-2-full-page.png`), fullPage: true });
    await full.close();
  }
  done();
  await ctx.close();
}

// ---------------------------------------------------------------- 3. JavaScript off
console.log('\nJavaScript off');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const hidden = [...document.querySelectorAll('.rv, h1, h2, .lede, .btn, .faq-list, .runs')].filter((el) => {
      const s = getComputedStyle(el); return s.opacity === '0' || s.visibility === 'hidden' || s.display === 'none';
    }).length;
    const links = [...document.querySelectorAll('[data-wa]')];
    const good = links.filter((a) => a.href.startsWith('https://wa.me/') && /[?&]text=/.test(a.href) && /ref%3A%20SITE/.test(a.href)).length;
    return { hidden, links: links.length, good };
  });
  ok(r.hidden === 0, 'all content visible');
  ok(r.links > 0 && r.good === r.links, `${r.good}/${r.links} WhatsApp links are plain wa.me links with the message and ref SITE`);
  await page.screenshot({ path: join(SHOTS, 'no-js-390.png') });
  await ctx.close();
}

// ---------------------------------------------------------------- 4. reduced motion
console.log('\nReduced motion');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const done = watchErrors(page, 'reduced motion');
  await page.goto(BASE);
  await page.waitForTimeout(800);
  await scrollThrough(page);
  const r = await page.evaluate(() => {
    const running = document.getAnimations().filter((a) => a.playState === 'running').length;
    const rows = [...document.querySelectorAll('.lane-row')].map((el) => el.scrollWidth <= el.clientWidth + 1);
    const riderT = getComputedStyle(document.querySelector('#hero-scene .rider')).transform;
    return { running, rowsFit: rows.every(Boolean), riderT };
  });
  ok(r.running === 0, `no animations running (${r.running})`);
  ok(r.rowsFit, 'every area chip is visible (rows wrap instead of scrolling)');
  ok(r.riderT === 'none', 'hero rider shown parked in place');
  await page.evaluate(() => document.getElementById('areas').scrollIntoView());
  await page.screenshot({ path: join(SHOTS, 'reduced-motion-areas-390.png') });
  done();
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed\n` : '\nAll checks passed. Screenshots are in shots/\n');
process.exit(failures ? 1 : 0);
