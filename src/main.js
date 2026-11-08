/* Blue Ribbon Logistics: page script (vanilla, no libraries).
   The page works without it: every button is already a plain wa.me link with the message typed in.
   This adds the visitor's ref code, the Meta Pixel event, and the motion. */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  /* Filled in by scripts/build.mjs from site.config.mjs */
  var WA_NUMBER = __WA_NUMBER__;
  var MSG = __MESSAGES__;
  var PIXEL_ID = __PIXEL_ID__;

  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in w;

  /* ---------------------------------------------------------------- WhatsApp links */
  var src = 'SITE';
  try {
    var q = new URLSearchParams(location.search).get('src');
    if (q) { q = q.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24).toUpperCase(); if (q) src = q; }
  } catch (e) {}

  function waLink(kind, area) {
    var t = (MSG[kind] || MSG.book).split('{SRC}').join(src).split('{AREA}').join(area || '');
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(t);
  }
  d.querySelectorAll('[data-wa]').forEach(function (a) {
    var kind = a.getAttribute('data-wa');
    a.href = waLink(kind, a.getAttribute('data-area'));
    a.addEventListener('click', function () {
      loadPixel();
      if (typeof w.fbq === 'function') w.fbq('track', 'Contact', { content_name: kind });
    });
  });

  /* Calls from the footer count as a Contact too */
  d.querySelectorAll('[data-call]').forEach(function (a) {
    a.addEventListener('click', function () {
      loadPixel();
      if (typeof w.fbq === 'function') w.fbq('track', 'Contact', { content_name: 'call' });
    });
  });

  /* ---------------------------------------------------------------- Meta Pixel (deferred) */
  var pixelLoaded = false;
  function loadPixel() {
    if (!PIXEL_ID || pixelLoaded) return;
    pixelLoaded = true;
    var s = d.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    d.head.appendChild(s);
  }
  if (PIXEL_ID) {
    /* Standard Meta stub: queues calls until fbevents.js arrives */
    var n = w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!w._fbq) w._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    w.fbq('init', PIXEL_ID);
    w.fbq('track', 'PageView');
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
      addEventListener(ev, loadPixel, { once: true, passive: true });
    });
    setTimeout(function () { (w.requestIdleCallback || setTimeout)(loadPixel, { timeout: 4000 }); }, 3000);
  }

  /* ---------------------------------------------------------------- hero ride: start when the rider is ready */
  var heroScene = d.getElementById('hero-scene');
  var heroBody = heroScene && heroScene.querySelector('.bike-photo .bike-body');
  function go() { html.classList.add('go'); }
  if (heroBody && heroBody.closest('.has-photo')) {
    var ready = heroBody.complete ? Promise.resolve() : new Promise(function (res) {
      heroBody.addEventListener('load', res, { once: true });
      heroBody.addEventListener('error', res, { once: true });
    });
    ready.then(function () { return heroBody.decode ? heroBody.decode().catch(function () {}) : 0; }).then(go);
    setTimeout(go, 1600);
  } else {
    go();
  }
  /* If the realistic rider fails to load, show the drawn bike instead */
  d.querySelectorAll('.bike-photo img').forEach(function (img) {
    function fail() { var r = img.closest('.rider'); if (r) r.classList.remove('has-photo'); }
    if (img.complete && !img.naturalWidth && img.currentSrc) fail();
    img.addEventListener('error', fail, { once: true });
  });

  /* ---------------------------------------------------------------- scroll: road, route tracker, depth, wheel speed */
  var top = d.getElementById('top'),
      road = d.querySelector('.road'),
      done = d.querySelector('.road-done'),
      pin = d.querySelector('.road-pin'),
      mini = d.querySelector('.road-bike'),
      steps = d.getElementById('steps'),
      fill = d.querySelector('.route-fill'),
      tracker = d.querySelector('.tracker'),
      tag = d.getElementById('rider-status'),
      stepEls = steps ? steps.querySelectorAll('.step') : [],
      routeEl = steps ? steps.querySelector('.route') : null;
  var scrollTimelines = w.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
  var centers = [0], routeH = 0, roadW = 0, maxScroll = 1, vh = innerHeight, heroVisible = true, lastTag = '';

  function layout() {
    vh = innerHeight;
    maxScroll = Math.max(1, html.scrollHeight - vh);
    roadW = road ? road.clientWidth : 0;
    if (steps) {
      centers = Array.prototype.map.call(stepEls, function (el) { return el.offsetTop + 28; });
      routeH = centers[centers.length - 1] - centers[0];
      routeEl.style.top = centers[0] + 'px';
      routeEl.style.height = routeH + 'px';
      tracker.style.top = centers[0] + 'px';
    }
  }

  function render() {
    var y = w.scrollY;
    var p = Math.min(1, Math.max(0, y / maxScroll));
    var travel = roadW - 40 - 22;
    if (mini) mini.style.transform = 'translateX(' + (p * travel).toFixed(1) + 'px)';
    if (done) done.style.transform = 'scaleX(' + Math.min(1, (p * travel + 20) / Math.max(1, roadW - 22)).toFixed(4) + ')';
    if (pin) pin.classList.toggle('hit', p > 0.985);
    if (top) top.classList.toggle('scrolled', y > 8);

    if (steps) {
      var r = steps.getBoundingClientRect();
      if (r.bottom > -200 && r.top < vh + 200) {
        var sp = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / (r.height * 0.9)));
        var ty = sp * routeH;
        fill.style.transform = 'scaleY(' + (routeH ? ty / routeH : 0).toFixed(4) + ')';
        tracker.style.transform = 'translateY(' + (ty - 10).toFixed(1) + 'px)';
        var label = sp < 0.3 ? 'Picking up' : sp < 0.98 ? 'On the way' : 'Delivered';
        if (label !== lastTag) {
          tag.textContent = label;
          if (lastTag && !reduce) { tag.classList.remove('swap'); void tag.offsetWidth; tag.classList.add('swap'); }
          lastTag = label;
        }
        for (var i = 0; i < stepEls.length; i++) stepEls[i].classList.toggle('reached', ty >= centers[i] - centers[0] - 2);
      }
    }
    /* Fallback for browsers without CSS scroll-driven animations */
    if (!scrollTimelines && !reduce && heroScene && heroVisible) {
      heroScene.style.setProperty('--hp', Math.min(1, y / (vh * 0.9)).toFixed(4));
    }
  }

  /* Wheel speed follows scroll speed: the header bike's wheels only turn while you scroll
     (backwards when you scroll up); the hero wheels speed up gently. */
  var miniAnims = [], heroAnims = [], vel = 0, lastY = w.scrollY, lastT = 0, spinning = false, lastScrollT = 0;
  function collectAnims() {
    if (!d.getAnimations && !Element.prototype.getAnimations) return;
    miniAnims = []; heroAnims = [];
    if (mini) mini.querySelectorAll('.wheel').forEach(function (el) { miniAnims = miniAnims.concat(el.getAnimations()); });
    if (heroScene) heroScene.querySelectorAll('.wheel').forEach(function (el) { heroAnims = heroAnims.concat(el.getAnimations()); });
  }
  function setRate(list, rate) {
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (Math.abs(a.playbackRate - rate) < 0.04) continue;
      if (a.updatePlaybackRate) a.updatePlaybackRate(rate); else a.playbackRate = rate;
    }
  }
  function spinTick(t) {
    var y = w.scrollY, dt = Math.max(8, t - lastT);
    var v = (y - lastY) / dt;                       // px per ms, signed
    vel += (v - vel) * 0.3;
    if (t - lastScrollT > 90) vel *= 0.86;           // ease off once scrolling stops
    lastY = y; lastT = t;
    var mag = Math.abs(vel);
    setRate(miniAnims, Math.max(-5, Math.min(5, vel * 2.6)));
    if (heroVisible) setRate(heroAnims, 1 + Math.min(0.7, mag * 0.9));
    if (mag > 0.01) { requestAnimationFrame(spinTick); }
    else { spinning = false; setRate(miniAnims, 0); setRate(heroAnims, 1); }
  }

  var ticking = false;
  addEventListener('scroll', function () {
    lastScrollT = performance.now();
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; render(); }); }
    if (!reduce && !spinning && (miniAnims.length || heroAnims.length)) {
      spinning = true; lastT = performance.now(); requestAnimationFrame(spinTick);
    }
  }, { passive: true });
  addEventListener('resize', function () { layout(); render(); });
  layout(); render();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { layout(); render(); });
  addEventListener('load', function () { layout(); render(); });
  if (!reduce && mini) {
    mini.classList.add('live');
    collectAnims();
    setRate(miniAnims, 0);
  }

  if (!hasIO) return;

  /* ---------------------------------------------------------------- reveal as things reach the screen */
  if (!reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
    d.querySelectorAll('.rv, #final-scene').forEach(function (el) {
      if (el.getBoundingClientRect().top > innerHeight) io.observe(el);
    });
    /* Wave ribbon lines: held back until the wave is properly on screen, then drawn */
    var wio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('pre');
        e.target.classList.add('in');
        wio.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
    d.querySelectorAll('.wave').forEach(function (el) {
      if (el.querySelector('.wave-line') && el.getBoundingClientRect().top > innerHeight) {
        el.classList.add('pre');
        wio.observe(el);
      }
    });
  }

  /* ---------------------------------------------------------------- count up the starting price */
  var count = d.getElementById('count');
  if (count && !reduce) {
    var cio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      cio.disconnect();
      var to = +count.getAttribute('data-to'), t0 = performance.now();
      (function tick(t) {
        var k = Math.min(1, (t - t0) / 1200), v = Math.round(to * (1 - Math.pow(1 - k, 3)) / 50) * 50;
        count.textContent = v.toLocaleString('en-NG');
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }, { rootMargin: '0px 0px 12% 0px' });
    if (count.getBoundingClientRect().top > innerHeight) cio.observe(count);
  }

  /* ---------------------------------------------------------------- pause every loop while it is off screen */
  var loops = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      e.target.classList.toggle('paused', !e.isIntersecting);
      if (e.target === heroScene) {
        heroVisible = e.isIntersecting;
        if (heroVisible && !heroAnims.length) collectAnims();
      }
    });
  });
  d.querySelectorAll('#hero-scene, #final-scene, .ticker, .lanes, .parcels, .status, .tracker, .btn-wa').forEach(function (el) {
    if (!el.closest('.sticky')) loops.observe(el);
  });

  /* ---------------------------------------------------------------- footer logo texture: fetched only when it is close */
  var foot = d.querySelector('.foot');
  if (foot) {
    var fio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { foot.classList.add('tex'); fio.disconnect(); }
    }, { rootMargin: '0px 0px 800px 0px' });
    fio.observe(foot);
  }

  /* ---------------------------------------------------------------- sticky WhatsApp bar */
  var sticky = d.getElementById('sticky'), heroVis = true, finalVis = false;
  function upd() { sticky.classList.toggle('show', !heroVis && !finalVis); }
  new IntersectionObserver(function (es) { heroVis = es[0].isIntersecting || es[0].boundingClientRect.top > 0; upd(); })
    .observe(d.getElementById('hero-cta'));
  new IntersectionObserver(function (es) { finalVis = es[0].isIntersecting; upd(); })
    .observe(d.getElementById('final-cta'));

  /* ---------------------------------------------------------------- desktop only: magnetic CTA, gentle card tilt */
  if (finePointer && !reduce) {
    d.querySelectorAll('.btn-wa, .btn-ghost').forEach(function (el) {
      if (el.closest('.sticky')) return;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--mx', (x * 10).toFixed(1) + 'px');
        el.style.setProperty('--my', (y * 8).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
    d.querySelectorAll('.card').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }
})();
