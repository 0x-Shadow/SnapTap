const grid = document.getElementById('gallery-grid');
const count = document.getElementById('gallery-count');
const closeBtn = document.getElementById('gallery-close');
const emptyState = document.getElementById('gallery-empty');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxTime = document.getElementById('lightbox-time');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxBackdrop = document.getElementById('lightbox-backdrop');
const lightboxCopy = document.getElementById('lightbox-copy');
const lightboxDelete = document.getElementById('lightbox-delete');
let lightboxFile = null;

function openLightbox(filename) {
  if (!/^snap-\d+\.png$/.test(filename)) return;
  lightboxFile = filename;
  lightboxImage.src = getImageSrc(filename);
  lightboxTitle.textContent = filename;
  lightboxTime.textContent = formatTimestamp(filename);
  lightbox.classList.remove('hidden');
}

function closeLightbox() {
  lightbox.classList.add('hidden');
  lightboxImage.removeAttribute('src');
  lightboxFile = null;
}

function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTimestamp(filename) {
  const match = filename.match(/snap-(\d+)\.png/);
  if (!match) return filename;
  const ts = parseInt(match[1], 10);
  const d = new Date(ts);
  return d.toLocaleString();
}

function getImageSrc(filename) {
  if (!/^snap-\d+\.png$/.test(filename)) return '';
  const folder = window.screenshotAPI.getSnapTapFolder();
  const fullPath = folder + '\\' + filename;
  return 'file:///' + fullPath.replace(/\\/g, '/').replace(/ /g, '%20');
}

function renderGallery(images) {
  grid.querySelectorAll('.gallery-item').forEach(el => el.remove());

  if (!images || images.length === 0) {
    emptyState.style.display = 'flex';
    count.textContent = '0';
    return;
  }

  emptyState.style.display = 'none';
  count.textContent = images.length;

  images.forEach(filename => {
    if (!/^snap-\d+\.png$/.test(filename)) return;

    const el = document.createElement('div');
    el.className = 'gallery-item';
    el.innerHTML = `
      <div class="gallery-thumb">
        <img src="${getImageSrc(filename)}" alt="Screenshot">
      </div>
      <div class="gallery-info">
        <span class="gallery-filename">${sanitize(filename)}</span>
        <span class="gallery-time">${formatTimestamp(filename)}</span>
      </div>
      <div class="gallery-actions">
        <button class="gallery-btn gallery-copy" title="Copy to clipboard">
          <svg viewBox="-1 -1 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="gallery-btn gallery-delete" title="Delete">
          <svg viewBox="-1 -1 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
    grid.appendChild(el);

    el.querySelector('.gallery-thumb').addEventListener('click', () => {
      openLightbox(filename);
    });

    el.querySelector('.gallery-copy').addEventListener('click', (e) => {
      e.stopPropagation();
      window.screenshotAPI.copyFromGallery(filename);
      const btn = e.currentTarget;
      btn.classList.add('copied');
      btn.innerHTML = `<svg viewBox="-1 -1 26 26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `<svg viewBox="-1 -1 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      }, 1200);
    });

    el.querySelector('.gallery-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      window.screenshotAPI.deleteImage(filename);
    });
  });
}

window.screenshotAPI.onLoadGallery((images) => {
  renderGallery(images);
});

closeBtn.addEventListener('click', () => {
  window.screenshotAPI.closeGallery();
});

lightboxClose.addEventListener('click', closeLightbox);
lightboxBackdrop.addEventListener('click', closeLightbox);

lightboxCopy.addEventListener('click', () => {
  if (!lightboxFile) return;
  window.screenshotAPI.copyFromGallery(lightboxFile);
  lightboxCopy.classList.add('copied');
  setTimeout(() => lightboxCopy.classList.remove('copied'), 1200);
});

lightboxDelete.addEventListener('click', () => {
  if (!lightboxFile) return;
  window.screenshotAPI.deleteImage(lightboxFile);
  closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!lightbox.classList.contains('hidden')) {
      closeLightbox();
    } else {
      window.screenshotAPI.closeGallery();
    }
  }
});

const initialImages = window.screenshotAPI.getGalleryImages();
renderGallery(initialImages);
