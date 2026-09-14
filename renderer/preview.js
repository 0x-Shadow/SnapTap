const img = document.getElementById('preview-image');
const copyBtn = document.getElementById('copy-btn');
const saveBtn = document.getElementById('save-btn');
const closeBtn = document.getElementById('close-btn');
const status = document.getElementById('copy-status');
const shimmer = document.getElementById('loading-shimmer');
let currentDataURL = null;

shimmer.classList.add('visible');
img.classList.remove('loaded');

window.screenshotAPI.onScreenshot((dataURL) => {
  currentDataURL = dataURL;

  img.onload = () => {
    shimmer.classList.remove('visible');
    img.classList.add('loaded');
  };
  img.src = dataURL;

  copyBtn.classList.remove('copied');
  copyBtn.querySelector('span').textContent = 'Copy';
  status.textContent = '';
});

copyBtn.addEventListener('click', () => {
  if (!currentDataURL) return;

  window.screenshotAPI.copyToClipboard(currentDataURL);

  copyBtn.classList.add('copied');
  copyBtn.querySelector('span').textContent = 'Copied!';
  status.textContent = 'Closing...';

  setTimeout(() => {
    window.screenshotAPI.closePreview();
  }, 400);
});

saveBtn.addEventListener('click', () => {
  if (!currentDataURL) return;

  window.screenshotAPI.saveScreenshot(currentDataURL);
  status.textContent = 'Save dialog opened';
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
    if (currentDataURL) {
      window.screenshotAPI.copyToClipboard(currentDataURL);
      copyBtn.classList.add('copied');
      copyBtn.querySelector('span').textContent = 'Copied!';
      status.textContent = 'Closing...';
      setTimeout(() => {
        window.screenshotAPI.closePreview();
      }, 400);
    }
  }
});
