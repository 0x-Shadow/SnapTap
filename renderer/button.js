const screenshotBtn = document.getElementById('screenshot-btn');
const galleryBtn = document.getElementById('gallery-btn');
const buttonStack = document.getElementById('button-stack');

let isDragging = false;
let dragStartY = 0;
let windowStartY = 0;

buttonStack.addEventListener('mousedown', (e) => {
  isDragging = false;
  dragStartY = e.screenY;
  windowStartY = window.screenY;

  const onMove = (ev) => {
    if (Math.abs(ev.screenY - dragStartY) > 5) isDragging = true;
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

screenshotBtn.addEventListener('click', (e) => {
  if (isDragging) return;
  window.screenshotAPI.takeScreenshot();
});

galleryBtn.addEventListener('click', (e) => {
  if (isDragging) return;
  window.screenshotAPI.openGallery();
});

screenshotBtn.addEventListener('mousemove', (e) => {
  if (e.buttons === 1) {
    const newY = windowStartY + (e.screenY - dragStartY);
    const { height: screenH } = window.screen;
    window.moveTo(window.screenX, Math.max(0, Math.min(newY, screenH - 90)));
  }
});
