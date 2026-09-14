const img = document.getElementById('preview-image');
const copyBtn = document.getElementById('copy-btn');
const revealBtn = document.getElementById('reveal-btn');
const closeBtn = document.getElementById('close-btn');
const status = document.getElementById('copy-status');
const shimmer = document.getElementById('loading-shimmer');
let hasImage = false;

shimmer.classList.add('visible');
img.classList.remove('loaded');

function fileURL(filePath) {
  return 'file:///' + String(filePath).replace(/\\/g, '/').replace(/ /g, '%20');
}

function doCopy() {
  if (!hasImage) return;
  window.screenshotAPI.copyToClipboard();
  copyBtn.classList.add('copied');
  copyBtn.querySelector('span').textContent = 'Copied!';
  status.textContent = 'Closing...';
  setTimeout(() => {
    window.screenshotAPI.closePreview();
  }, 400);
}

window.screenshotAPI.onScreenshot((filePath) => {
  if (typeof filePath !== 'string' || !filePath) return;
  hasImage = true;

  shimmer.classList.add('visible');
  img.classList.remove('loaded');
  img.onload = () => {
    shimmer.classList.remove('visible');
    img.classList.add('loaded');
  };
  img.onerror = () => {
    shimmer.classList.remove('visible');
    status.textContent = 'Failed to load';
  };
  img.src = fileURL(filePath);

  copyBtn.classList.remove('copied');
  copyBtn.querySelector('span').textContent = 'Copy';
  status.textContent = '';
});

copyBtn.addEventListener('click', doCopy);

revealBtn.addEventListener('click', () => {
  if (!hasImage) return;
  window.screenshotAPI.revealInFolder();
  status.textContent = 'Opened folder';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

closeBtn.addEventListener('click', () => {
  window.screenshotAPI.closePreview();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.screenshotAPI.closePreview();
  }
  if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
    doCopy();
  }
});
