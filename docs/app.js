(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll reveals: rise + deblur ---------- */
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

  /* ---------- demo stage drifts gently with scroll ---------- */
  var stage = document.getElementById('demoStage');
  if (stage && !reduceMotion) {
    var scheduled = false;
    function parallax() {
      scheduled = false;
      var r = stage.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var offset = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      var y = Math.max(-1, Math.min(1, offset)) * -34;
      var s = 1 - Math.min(0.05, Math.abs(offset) * 0.05);
      stage.style.transform = 'translateY(' + y.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
    }
    window.addEventListener('scroll', function () {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(parallax);
      }
    }, { passive: true });
    parallax();
  }

  /* ---------- interactive capture demo ---------- */
  var flash = document.getElementById('demoFlash');
  var captureBtn = document.getElementById('demoCapture');
  var strip = document.getElementById('demoStrip');
  var toast = document.getElementById('demoToast');

  var shots = [
    'linear-gradient(135deg, #1b2a4a 0%, #0e1526 60%, #0b0b0e 100%)',
    'linear-gradient(135deg, #2a1b3d 0%, #171226 60%, #0b0b0e 100%)',
    'linear-gradient(135deg, #123a34 0%, #0e2422 60%, #0b0b0e 100%)',
    'linear-gradient(135deg, #4a2c14 0%, #26180e 60%, #0b0b0e 100%)',
    'linear-gradient(135deg, #3d1b26 0%, #230f16 60%, #0b0b0e 100%)'
  ];
  var shotIndex = 0;
  var shotCount = 0;
  var busy = false;
  var toastTimer = null;

  function fakeCapture() {
    if (busy) return; // throttle like the real app
    busy = true;

    flash.classList.remove('go');
    void flash.offsetWidth;
    flash.classList.add('go');

    captureBtn.classList.remove('firing');
    void captureBtn.offsetWidth;
    captureBtn.classList.add('firing');

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

  fakeCapture(); // seed the strip so it never looks empty

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
})();
