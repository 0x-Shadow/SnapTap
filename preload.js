const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenshotAPI', {
  takeScreenshot: () => ipcRenderer.send('take-screenshot'),
  openGallery: () => ipcRenderer.send('open-gallery'),
  copyToClipboard: () => ipcRenderer.send('copy-to-clipboard'),
  revealInFolder: () => ipcRenderer.send('reveal-in-folder'),
  closePreview: () => ipcRenderer.send('close-preview'),
  closeGallery: () => ipcRenderer.send('close-gallery'),
  getGalleryImages: () => ipcRenderer.sendSync('get-gallery-images'),
  deleteImage: (filename) => ipcRenderer.send('delete-image', filename),
  copyFromGallery: (filename) => ipcRenderer.send('copy-from-gallery', filename),
  getSnapTapFolder: () => ipcRenderer.sendSync('get-snaptap-folder'),
  onScreenshot: (cb) => ipcRenderer.on('show-screenshot', (e, d) => cb(d)),
  onLoadGallery: (cb) => ipcRenderer.on('load-gallery', (e, images) => cb(images)),
  onPulse: (cb) => ipcRenderer.on('pulse-button', () => cb())
});
