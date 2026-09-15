(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll reveals ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- hero glow follows the mouse (cheap rAF) ---------- */
  var hero = document.querySelector('.hero');
  var glow = document.querySelector('.hero-glow');
  if (hero && glow && !reduceMotion) {
    var tx = 0, cx = 0, raf = null;
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 120;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    function tick() {
      cx += (tx - cx) * 0.08;
      glow.style.transform = 'translateX(calc(-50% + ' + cx.toFixed(1) + 'px))';
      if (Math.abs(tx - cx) > 0.2) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }
  }

  /* ---------- interactive capture demo ---------- */
  var stage = document.getElementById('demoStage');
  var flash = document.getElementById('demoFlash');
  var captureBtn = document.getElementById('demoCapture');
  var strip = document.getElementById('demoStrip');
  var toast = document.getElementById('demoToast');

  // Mock "screen contents" — abstract gradients so every fake shot differs
  var shots = [
    'linear-gradient(135deg, #1b2a4a 0%, #0e1526 60%, #101014 100%)',
    'linear-gradient(135deg, #2a1b3d 0%, #171226 60%, #101014 100%)',
    'linear-gradient(135deg, #123a34 0%, #0e2422 60%, #101014 100%)',
    'linear-gradient(135deg, #4a2c14 0%, #26180e 60%, #101014 100%)',
    'linear-gradient(135deg, #3d1b26 0%, #230f16 60%, #101014 100%)'
  ];
  var shotIndex = 0;
  var shotCount = 0;
  var busy = false;
  var toastTimer = null;

  function fakeCapture() {
    if (busy) return; // throttle like the real app
    busy = true;

    // 1. shutter flash
    flash.classList.remove('go');
    void flash.offsetWidth;
    flash.classList.add('go');

    // 2. button pulse (mirrors the real pulse ring)
    captureBtn.classList.remove('firing');
    void captureBtn.offsetWidth;
    captureBtn.classList.add('firing');

    // 3. thumbnail flies into the strip
    setTimeout(function () {
      shotCount++;
      var thumb = document.createElement('div');
      thumb.className = 'demo-thumb fresh';
      thumb.style.background = shots[shotIndex % shots.length];
      thumb.textContent = 'snap-' + String(shotCount).padStart(2, '0');
      strip.querySelectorAll('.fresh').forEach(function (el) { el.classList.remove('fresh'); });
      strip.prepend(thumb);
      while (strip.children.length > 4) strip.removeChild(strip.lastChild);
      shotIndex++;

      // 4. copied toast
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1600);

      setTimeout(function () { busy = false; }, 350);
    }, reduceMotion ? 0 : 180);
  }

  captureBtn.addEventListener('click', fakeCapture);
  document.addEventListener('keydown', function (e) {
    if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      fakeCapture();
    }
  });

  // seed the strip so it never looks empty
  fakeCapture();

  /* ---------- copy SHA hashes ---------- */
  document.querySelectorAll('.hash').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var hash = btn.getAttribute('data-hash');
      function done() {
        btn.classList.add('copied');
        var original = btn.textContent;
        btn.textContent = 'copied to clipboard';
        setTimeout(function () {
          btn.classList.remove('copied');
          btn.textContent = original;
        }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(hash).then(done).catch(done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = hash;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { /* noop */ }
        document.body.removeChild(ta);
        done();
      }
    });
  });

  /* ---------- footer year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
