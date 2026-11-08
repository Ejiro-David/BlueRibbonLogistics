// Builds the static site into dist/.   npm run build
// Reads site.config.mjs (content), src/ (page, styles, script) and src/img/manifest.json (images).
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const ASSETS = join(ROOT, 'assets');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const config = (await import(pathToFileURL(join(ROOT, 'site.config.mjs')).href + '?t=' + Date.now())).default;
const manifest = JSON.parse(read('src/img/manifest.json'));

// ---------------------------------------------------------------- checks on the config
const fail = (msg) => { console.error('\n✗ site.config.mjs: ' + msg + '\n'); process.exit(1); };
const waNumber = String(config.whatsappNumber || '').replace(/\D/g, '');
if (config.whatsappNumber && !/^[1-9]\d{7,14}$/.test(waNumber)) fail('whatsappNumber should look like 2348012345678 (country code, no + or leading 0).');
for (const k of ['book', 'vendor', 'area']) if (!config.messages?.[k]) fail(`messages.${k} is missing.`);
if (!Array.isArray(config.areas) || config.areas.length !== 2) fail('areas should be two lists (one per moving row).');
const siteUrl = String(config.siteUrl || '').replace(/\/+$/, '');

// ---------------------------------------------------------------- output folder + fingerprinted assets
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });
const hashed = new Map();
function asset(file, from) {
  // Copies a file into dist/assets with a content hash in its name and returns its URL.
  const key = from + '/' + file;
  if (hashed.has(key)) return hashed.get(key);
  const buf = readFileSync(join(from, file));
  const h = createHash('sha256').update(buf).digest('hex').slice(0, 8);
  const name = `${basename(file, extname(file))}.${h}${extname(file)}`;
  writeFileSync(join(DIST, 'assets', name), buf);
  const url = 'assets/' + name;
  hashed.set(key, url);
  return url;
}
const img = (file) => asset(file, join(SRC, 'img'));
// Trimmed fonts from npm run fonts (src/fonts), or the full originals if that step hasn't run.
const FONTS = existsSync(join(SRC, 'fonts')) ? join(SRC, 'fonts') : join(ASSETS, 'fonts');
const font = (name) => asset(name + '.woff2', FONTS);

// Unhashed files at the site root (stable URLs for link previews and icons).
for (const f of ['favicon-32.png', 'favicon-192.png', 'favicon-512.png', 'apple-touch-icon-180.png']) {
  cpSync(join(ASSETS, 'share', f), join(DIST, f));
}
// Link preview: the version with the full-resolution logo (npm run images) when it exists.
cpSync(existsSync(join(SRC, 'img', 'link-preview.png')) ? join(SRC, 'img', 'link-preview.png') : join(ASSETS, 'share', 'link-preview_1200x630.png'),
  join(DIST, 'link-preview.png'));
const ogImage = (siteUrl ? siteUrl + '/' : '') + 'link-preview.png';

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const NAIRA = '<span class="naira" aria-hidden="true">N</span><span class="sr-only">₦</span>';
const withNaira = (text) => esc(text).replace(/₦/g, NAIRA);
function waLink(kind, area = '', src = 'SITE') {
  const t = config.messages[kind].split('{SRC}').join(src).split('{AREA}').join(area);
  return 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(t);
}
const pct = (n) => +(n * 100).toFixed(3) + '%';

function picture(name, { cls = '', sizes, alt = '', lazy = false, priority = false }) {
  const e = manifest[name];
  if (!e) throw new Error('No image "' + name + '" in src/img/manifest.json. Run npm run images.');
  const files = e.files, big = files[files.length - 1];
  const set = (k) => files.filter((f) => f[k]).map((f) => `${img(f[k])} ${f.w}w`).join(', ');
  const avif = set('avif');
  const sz = sizes ? ` sizes="${sizes}"` : '';
  return `<picture>${avif ? `<source type="image/avif" srcset="${avif}"${sz}>` : ''}` +
    `<img${cls ? ` class="${cls}"` : ''} src="${img(big.webp)}" srcset="${set('webp')}"${sz} width="${big.w}" height="${big.h}" alt="${esc(alt)}"` +
    `${lazy ? ' loading="lazy"' : ''} decoding="async"${priority ? ' fetchpriority="high"' : ''}></picture>`;
}

// ---------------------------------------------------------------- the bike (SVG fallback + realistic photo)
const bikeSvg = read('src/partials/bike.svg');
const ellipse = bikeSvg.match(/<ellipse[^>]*\/>/)[0];
const tiltGroup = bikeSvg.slice(bikeSvg.indexOf('<g class="bike-tilt">'));
const usePhoto = config.rider !== 'svg' && manifest.rider && manifest.wheel;

function rider(where) {
  const hero = where === 'hero';
  const sizes = hero ? '(min-width:980px) 318px, min(50vw, 227px)' : '(min-width:980px) 295px, min(46vw, 238px)';
  let photo = '';
  if (usePhoto) {
    const wheel = (n) => picture('wheel', { cls: 'wheel w' + n, lazy: !hero }).replace('<img ', '<img ');
    photo = `<div class="bike-photo"><div class="bike-tilt">${wheel(1)}${wheel(2)}` +
      picture('rider', { cls: 'bike-body', sizes, lazy: !hero, priority: hero }) +
      '<i class="puff"></i><i class="puff"></i><i class="puff"></i><i class="beam"></i></div></div>';
  }
  return `<div class="rider${usePhoto ? ' has-photo' : ''}">` +
    `<svg class="rider-svg" viewBox="-140 -10 580 290" aria-hidden="true" focusable="false">${ellipse}<g class="svg-bike">${tiltGroup}</g></svg>` +
    `<div class="speed"><i></i><i></i><i></i></div>${photo}</div>`;
}

function riderCss() {
  if (!usePhoto) return '';
  // Scale the photo so its wheelbase matches the drawn bike (rear hub x=110, front hub x=322,
  // tyres touching y=262 in the 580x290 rider box) so it sits on the road exactly like the SVG.
  const R = manifest.rider, W = manifest.wheel;
  const aspect = R.w / R.h;
  const Wu = 212 / R.wheelbase, Hu = Wu / aspect;
  const [rcx, rcy] = R.wheels[0].c;
  const contactY = R.rearContact[1];
  const left = 110 - rcx * Wu, topU = 262 - contactY * Hu;
  const css = [];
  css.push(`.bike-photo{left:${pct((left + 140) / 580)};top:${pct((topU + 10) / 290)};width:${pct(Wu / 580)};aspect-ratio:${R.w}/${R.h}}`);
  css.push(`.bike-photo .bike-tilt{transform-origin:${pct(R.rearContact[0])} ${pct(R.rearContact[1])}}`);
  R.wheels.forEach((wh, i) => {
    const d = wh.d / (1 - 2 * (W.margin || 0));
    const dh = d * aspect;
    css.push(`.bike-photo .w${i + 1}{left:${pct(wh.c[0] - d / 2)};top:${pct(wh.c[1] - dh / 2)};width:${pct(d)}}`);
  });
  css.push(`.bike-photo .puff{left:${pct(R.exhaust[0])};top:${pct(R.exhaust[1])};width:${pct(18 / Wu)}}`);
  const bw = 98 / Wu, bh = 72 / Hu;
  css.push(`.bike-photo .beam{left:${pct(R.headlight[0])};top:${pct(R.headlight[1] - bh / 2)};width:${pct(bw)};height:${pct(bh)}}`);
  return css.join('\n');
}

// Header mini bike: the drawn bike, without exhaust puffs (no JS needed to show it)
const miniBike = `<svg viewBox="30 0 400 280" aria-hidden="true" focusable="false">` +
  tiltGroup.replace('<g class="bike-tilt">', '<g>').replace(/<circle class="puff"[^>]*\/>/g, '') + '</svg>';

// ---------------------------------------------------------------- data-driven sections
function ticker() {
  const o = config.offer || {};
  if (!o.enabled || !o.items?.length) return '';
  // inner <span> keeps "₦7,000" together (the outer span is a flex row with the dot after it)
  const item = (t) => `<span>${esc(t).replace(/₦/g, '<span class="naira">N</span>')}</span>`;
  const set = (dup) => o.items.map((t) => `<span${dup ? ' data-dup' : ''}>${item(t)}</span>`).join('');
  return `<div class="ticker"><p class="sr-only">${esc(o.label || o.items.join('. '))}</p>` +
    `<div class="ticker-track" aria-hidden="true">${set(false)}${set(true)}${set(true)}${set(true)}</div></div>`;
}
function runs() {
  const list = config.prices.recentRuns.map((r) =>
    `<li><span class="from-to">${esc(r.from)} <svg class="arr" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg><span class="sr-only">to</span> ${esc(r.to)}</span>` +
    `<b>${NAIRA}${money(r.price)}</b></li>`).join('');
  return `<ul class="runs">${list}</ul>`;
}
function areas() {
  const chip = (a, dup) => `<a class="area" data-wa="area" data-area="${esc(a)}" href="${esc(waLink('area', a))}" target="_blank" rel="noopener"` +
    (dup ? ' aria-hidden="true" tabindex="-1" data-dup' : ` aria-label="Ask on WhatsApp if we deliver to ${esc(a)}"`) +
    `><svg class="i" aria-hidden="true" focusable="false"><use href="#i-pin"/></svg>${esc(a)}</a>`;
  const row = (list, cls) => `<div class="lane-row${cls}">${list.map((a) => chip(a, false)).join('')}${list.map((a) => chip(a, true)).join('')}</div>`;
  const all = config.areas.flat();
  return `<div class="lanes">${row(config.areas[0], '')}${row(config.areas[1], ' rev')}</div>\n` +
    `    <p class="sr-only">Areas we cover: ${esc(all.join(', '))}.</p>`;
}
function faq() {
  return config.faq.map((f, i) =>
    `<details class="rv" style="--d:${i}"><summary>${esc(f.q)}<span class="plus" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('\n      ');
}
function parcels() {
  if (!manifest.parcels) return '';
  return `<div class="parcels rv" style="--d:2">${picture('parcels', { sizes: '(min-width:760px) 360px, min(calc(100vw - 32px), 360px)', lazy: true })}</div>`;
}

// ---------------------------------------------------------------- CSS + JS
let css = read('src/styles.css')
  .replace('{{sky-css}}', read('src/partials/sky.css').trim())
  .replace('{{rider-css}}', riderCss())
  .replace(/\{\{font:([\w-]+)\}\}/g, (_, n) => font(n))
  .replace(/\{\{img:(\w+):(webp|avif)\}\}/g, (_, name, kind) => {
    const f = manifest[name]?.files?.[0];
    return f ? img(f[kind] || f.webp) : 'none';
  });
const cssMin = (await esbuild.transform(css, {
  loader: 'css', minify: true, target: ['chrome111', 'safari16.4', 'firefox115', 'edge111'], logLevel: 'error',
})).code.trim();

const jsMin = (await esbuild.transform(read('src/main.js'), {
  loader: 'js', minify: true, target: 'es2017', logLevel: 'error',
  define: {
    __WA_NUMBER__: JSON.stringify(waNumber),
    __MESSAGES__: JSON.stringify(config.messages),
    __PIXEL_ID__: JSON.stringify(String(config.metaPixelId || '').replace(/\D/g, '')),
  },
})).code.trim();

const offerEnd = config.offer?.enabled && config.offer?.endsAfter ? Date.parse(config.offer.endsAfter + 'T23:59:59+01:00') : 0;
const headJs = (await esbuild.transform(
  `(function(h){h.classList.add('js');var e=${offerEnd || 0};if(e&&Date.now()>e)h.classList.add('no-offer');setTimeout(function(){h.classList.add('go')},2500)})(document.documentElement)`,
  { loader: 'js', minify: true, target: 'es2017' })).code.trim();

// ---------------------------------------------------------------- structured data
const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Blue Ribbon Logistics',
  alternateName: 'BRL',
  slogan: 'Delivering Excellence, Every Mile',
  description: 'Same-day motorcycle dispatch riders in Benin City, Edo State. Pickups, drop-offs and pay on delivery, booked on WhatsApp.',
  areaServed: { '@type': 'City', name: 'Benin City', containedInPlace: { '@type': 'State', name: 'Edo State' } },
  address: { '@type': 'PostalAddress', addressLocality: 'Benin City', addressRegion: 'Edo', addressCountry: 'NG' },
  image: ogImage,
  logo: (siteUrl ? siteUrl + '/' : '') + img(manifest.logo.files[0].webp),
};
if (siteUrl) jsonld.url = siteUrl + '/';
// Call line: tel: link in international form, shown the Nigerian way (0815 852 7977).
const telDigits = String(config.telephone || '').replace(/\D/g, '');
const telIntl = telDigits ? '+' + (telDigits.startsWith('0') ? '234' + telDigits.slice(1) : telDigits) : '';
const telLocal = telIntl.startsWith('+234') ? ('0' + telIntl.slice(4)).replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3') : telIntl;
if (telIntl) jsonld.telephone = telIntl;
if (waNumber) jsonld.contactPoint = { '@type': 'ContactPoint', contactType: 'customer service', url: 'https://wa.me/' + waNumber };

// ---------------------------------------------------------------- assemble the page
const areaCount = config.areas.flat().length;
const logo = manifest.logo.files[0];
const tokens = {
  css: cssMin,
  js: jsMin,
  headScript: headJs,
  jsonld: JSON.stringify(jsonld).replace(/</g, '\\u003c'),
  canonical: siteUrl ? `<link rel="canonical" href="${siteUrl}/">` : '',
  ogUrl: siteUrl ? `<meta property="og:url" content="${siteUrl}/">` : '',
  ogImage,
  logo: img(logo.webp),
  callLink: telIntl ? ` · <a href="tel:${telIntl}" data-call>Call ${telLocal}</a>` : '',
  logoAvif: logo.avif ? `<source type="image/avif" srcset="${img(logo.avif)}">` : '',
  logoW: logo.w,
  logoH: logo.h,
  fromPrice: config.prices.from,
  fromPriceText: money(config.prices.from),
  areaCount,
  year: new Date().getFullYear(),
};
let html = read('src/index.html')
  .replace('<!-- @ticker -->', ticker())
  .replace('<!-- @runs -->', runs())
  .replace('<!-- @areas -->', areas())
  .replace('<!-- @faq -->', faq())
  .replace('<!-- @parcels -->', parcels())
  .replace('<!-- @rider:hero -->', rider('hero'))
  .replace('<!-- @rider:final -->', rider('final'))
  .replace('<!-- @minibike -->', miniBike)
  .replace(/<span class="naira">N<\/span>/g, NAIRA)
  .replace(/\{\{wa:(\w+)\}\}/g, (_, k) => esc(waLink(k)))
  .replace(/\{\{asset:([\w.-]+)\}\}/g, (_, f) => f)
  .replace(/\{\{font:([\w-]+)\}\}/g, (_, n) => font(n))
  .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in tokens ? String(tokens[k]) : m));
const left = html.match(/\{\{[^}]+\}\}|<!-- @\w+/g);
if (left) throw new Error('Unfilled template tokens: ' + [...new Set(left)].join(', '));
html = html.replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n');
writeFileSync(join(DIST, 'index.html'), html);

// ---------------------------------------------------------------- hosting extras
writeFileSync(join(DIST, '_headers'), [
  '/assets/*', '  Cache-Control: public, max-age=31536000, immutable', '',
  '/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin', '',
].join('\n'));
writeFileSync(join(DIST, 'robots.txt'), 'User-agent: *\nAllow: /\n' + (siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''));
if (siteUrl) {
  writeFileSync(join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}/</loc></url></urlset>\n`);
}

// ---------------------------------------------------------------- size report
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const htmlBuf = Buffer.from(html);
console.log('\nBuilt dist/');
console.log(`  index.html     ${kb(htmlBuf.length)} raw, ${kb(gz(htmlBuf))} gzipped (CSS ${kb(gz(Buffer.from(cssMin)))}, JS ${kb(gz(Buffer.from(jsMin)))} gzipped)`);
const files = readdirSync(join(DIST, 'assets')).map((f) => ({ f, s: statSync(join(DIST, 'assets', f)).size }));
for (const { f, s } of files) console.log(`  assets/${f.padEnd(44)} ${kb(s)}`);
// What a phone with AVIF support downloads before scrolling: page, the fonts the first screen uses, logo, rider + wheel.
const firstScreen = ['barlow-condensed-800-normal', 'barlow-condensed-700-normal', 'barlow-condensed-600-normal', 'barlow-body-400-normal', 'barlow-body-600-normal']
  .map((n) => statSync(join(DIST, font(n))).size);
const imgSize = (name, w) => { const f = manifest[name].files.find((x) => x.w === w) || manifest[name].files[0]; return f.avifBytes || f.webpBytes; };
const firstLoad = gz(htmlBuf) + firstScreen.reduce((a, b) => a + b, 0) + imgSize('logo') + (usePhoto ? imgSize('rider', 720) + imgSize('wheel') : 0);
console.log(`\n  First screen on a phone: about ${kb(firstLoad)} (budget 350 KB, Pixel not counted)\n`);
