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

  /* ---------- tour stage drifts gently with scroll ---------- */
  var stage = document.getElementById('tourStage');
  if (stage && !reduceMotion) {
    var scheduled = false;
    function parallax() {
      scheduled = false;
      var r = stage.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var offset = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      var y = Math.max(-1, Math.min(1, offset)) * -30;
      stage.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
    }
    window.addEventListener('scroll', function () {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(parallax);
      }
    }, { passive: true });
    parallax();
  }

  /* ---------- product tour: auto-playing steps ---------- */
  var DURATION = 4500;
  var steps = Array.prototype.slice.call(document.querySelectorAll('.tour-step'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.tour-panel'));
  var current = 0;
  var timer = null;

  function show(i) {
    current = (i + steps.length) % steps.length;
    steps.forEach(function (s, k) {
      var bar = s.querySelector('.tour-progress > span');
      s.classList.remove('active');
      if (bar && !reduceMotion) {
        bar.style.animation = 'none';
        void bar.offsetWidth; // restart the progress animation
        bar.style.animation = '';
        bar.style.animationDuration = DURATION + 'ms';
      }
      if (k === current) s.classList.add('active');
    });
    panels.forEach(function (p, k) {
      p.classList.toggle('active', k === current);
    });
  }

  function restartAuto() {
    if (timer) clearInterval(timer);
    if (!reduceMotion) {
      timer = setInterval(function () { show(current + 1); }, DURATION);
    }
  }

  steps.forEach(function (s, k) {
    s.querySelector('button').addEventListener('click', function () {
      show(k);
      restartAuto();
    });
  });

  // pause while the visitor is interacting with the mock gallery
  var gallery = document.querySelector('.mock-gallery');
  if (gallery) {
    gallery.addEventListener('pointerenter', function () { if (timer) clearInterval(timer); });
    gallery.addEventListener('pointerleave', restartAuto);
  }

  show(0);
  restartAuto();

  /* ---------- mock gallery copy micro-interaction ---------- */
  document.querySelectorAll('.mock-mini-copy').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      btn.classList.add('ok');
      setTimeout(function () { btn.classList.remove('ok'); }, 1200);
    });
  });

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
