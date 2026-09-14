const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, screen, nativeImage, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let buttonWindow = null;
let previewWindow = null;
let galleryWindow = null;
let tray = null;
let isCapturing = false;

const SNAPTAPE_NAME = 'SnapTap';

function getSnapTapFolder() {
  const picturesPath = path.join(app.getPath('pictures'), SNAPTAPE_NAME);
  if (!fs.existsSync(picturesPath)) {
    fs.mkdirSync(picturesPath, { recursive: true });
  }
  return picturesPath;
}

function getGalleryImages() {
  const folder = getSnapTapFolder();
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter(f => f.endsWith('.png') && /^snap-\d+\.png$/.test(f))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(folder, a));
      const statB = fs.statSync(path.join(folder, b));
      return statB.mtimeMs - statA.mtimeMs;
    });
}

function isSafeFilename(filename) {
  if (typeof filename !== 'string') return false;
  if (filename.length === 0 || filename.length > 100) return false;
  if (!/^snap-\d+\.png$/.test(filename)) return false;
  const resolved = path.resolve(getSnapTapFolder(), filename);
  const folder = path.resolve(getSnapTapFolder());
  return resolved.startsWith(folder + path.sep) || resolved === folder;
}

// ─── Button Window ───
function createButtonWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  buttonWindow = new BrowserWindow({
    width: 50,
    height: 90,
    x: screenWidth - 60,
    y: Math.floor(screenHeight / 2) - 45,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    title: 'SnapTap',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  buttonWindow.loadFile(path.join(__dirname, 'renderer', 'button.html'));
  buttonWindow.setVisibleOnAllWorkspaces(true);
}

// ─── Preview Window ───
function createPreviewWindow(imageDataURL) {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.close();
  }

  const btnBounds = buttonWindow.getBounds();
  const previewWidth = 360;
  const previewHeight = 300;
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  let x = btnBounds.x - previewWidth - 15;
  let y = btnBounds.y - Math.floor(previewHeight / 2) + 45;

  if (x < 10) x = btnBounds.x + 60;
  if (y < 10) y = 10;
  if (y + previewHeight > screen.getPrimaryDisplay().workAreaSize.height) {
    y = screen.getPrimaryDisplay().workAreaSize.height - previewHeight - 10;
  }

  previewWindow = new BrowserWindow({
    width: previewWidth,
    height: previewHeight,
    x, y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    title: 'SnapTap',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  previewWindow.loadFile(path.join(__dirname, 'renderer', 'preview.html'));
  previewWindow.setVisibleOnAllWorkspaces(true);

  previewWindow.webContents.once('did-finish-load', () => {
    previewWindow.webContents.send('show-screenshot', imageDataURL);
  });

  previewWindow.on('closed', () => {
    previewWindow = null;
  });
}

// ─── Gallery Window ───
function createGalleryWindow() {
  if (galleryWindow && !galleryWindow.isDestroyed()) {
    galleryWindow.focus();
    return;
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  galleryWindow = new BrowserWindow({
    width: 600,
    height: 500,
    x: Math.floor(screenWidth / 2) - 300,
    y: Math.floor(screenHeight / 2) - 250,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    title: 'SnapTap',
    backgroundColor: '#121216',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  galleryWindow.loadFile(path.join(__dirname, 'renderer', 'gallery.html'));
  galleryWindow.setVisibleOnAllWorkspaces(true);

  galleryWindow.webContents.once('did-finish-load', () => {
    sendGalleryImages();
  });

  galleryWindow.on('closed', () => {
    galleryWindow = null;
  });
}

function sendGalleryImages() {
  if (galleryWindow && !galleryWindow.isDestroyed()) {
    const images = getGalleryImages();
    galleryWindow.webContents.send('load-gallery', images);
  }
}

// ─── Capture ───
async function captureScreen() {
  if (isCapturing) return;
  isCapturing = true;

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { desktopCapturer } = require('electron');

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (!sources || sources.length === 0) {
      isCapturing = false;
      return;
    }

    const source = sources.find(s =>
      String(s.display_id) === String(primaryDisplay.id)
    ) || sources[0];

    const image = source.thumbnail;
    if (image.isEmpty()) { isCapturing = false; return; }

    const dataURL = image.toDataURL();
    const folder = getSnapTapFolder();
    const filename = `snap-${Date.now()}.png`;
    const filePath = path.join(folder, filename);
    const buffer = image.toPNG();
    fs.writeFileSync(filePath, buffer);

    createPreviewWindow(dataURL);
    sendGalleryImages();
  } catch (err) {
    console.error('Capture failed:', err.message);
  } finally {
    isCapturing = false;
  }
}

// ─── Tray ───
function createTray() {
  try {
    tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
    updateTrayMenu();
    tray.setToolTip('SnapTap');
    tray.on('click', captureScreen);
  } catch (err) {
    console.error('Tray failed:', err.message);
  }
}

function updateTrayMenu() {
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Screenshot (Alt+S)', click: captureScreen },
    { label: 'Gallery (Alt+G)', click: createGalleryWindow },
    { type: 'separator' },
    { label: `Snapshots: ${getGalleryImages().length}`, enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
}

// ─── App Ready ───
app.whenReady().then(() => {
  createButtonWindow();
  createTray();

  globalShortcut.register('Alt+S', captureScreen);
  globalShortcut.register('Alt+G', createGalleryWindow);

  ipcMain.on('take-screenshot', () => captureScreen());
  ipcMain.on('open-gallery', createGalleryWindow);

  ipcMain.on('get-snaptap-folder', (event) => {
    event.returnValue = getSnapTapFolder();
  });

  ipcMain.on('copy-to-clipboard', (event, dataURL) => {
    if (typeof dataURL !== 'string' || !dataURL.startsWith('data:image/png;base64,')) return;
    try {
      const image = nativeImage.createFromDataURL(dataURL);
      clipboard.writeImage(image);
      if (previewWindow && !previewWindow.isDestroyed()) {
        previewWindow.close();
        previewWindow = null;
      }
    } catch (err) {
      console.error('Copy failed:', err.message);
    }
  });

  ipcMain.on('save-screenshot', (event, dataURL) => {
    if (typeof dataURL !== 'string' || !dataURL.startsWith('data:image/png;base64,')) return;
    try {
      const { dialog } = require('electron');
      const image = nativeImage.createFromDataURL(dataURL);
      dialog.showSaveDialog(buttonWindow, {
        title: 'Save Screenshot',
        defaultPath: `snap-${Date.now()}.png`,
        filters: [{ name: 'PNG', extensions: ['png'] }]
      }).then(result => {
        if (!result.canceled && result.filePath) {
          fs.writeFileSync(result.filePath, image.toPNG());
        }
      });
    } catch (err) {
      console.error('Save failed:', err.message);
    }
  });

  ipcMain.on('close-preview', () => {
    if (previewWindow && !previewWindow.isDestroyed()) {
      previewWindow.close();
      previewWindow = null;
    }
  });

  ipcMain.on('close-gallery', () => {
    if (galleryWindow && !galleryWindow.isDestroyed()) {
      galleryWindow.close();
      galleryWindow = null;
    }
  });

  ipcMain.on('get-gallery-images', (event) => {
    const images = getGalleryImages();
    event.returnValue = images;
  });

  ipcMain.on('delete-image', (event, filename) => {
    if (!isSafeFilename(filename)) return;
    try {
      const folder = getSnapTapFolder();
      const filePath = path.join(folder, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        sendGalleryImages();
        updateTrayMenu();
      }
    } catch (err) {
      console.error('Delete failed:', err.message);
    }
  });

  ipcMain.on('copy-from-gallery', (event, filename) => {
    if (!isSafeFilename(filename)) return;
    try {
      const folder = getSnapTapFolder();
      const filePath = path.join(folder, filename);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const image = nativeImage.createFromBuffer(buffer);
        clipboard.writeImage(image);
      }
    } catch (err) {
      console.error('Copy from gallery failed:', err.message);
    }
  });

  ipcMain.on('copy-dataurl-to-clipboard', (event, dataURL) => {
    if (typeof dataURL !== 'string' || !dataURL.startsWith('data:image/png;base64,')) return;
    try {
      const image = nativeImage.createFromDataURL(dataURL);
      clipboard.writeImage(image);
    } catch (err) {
      console.error('Copy failed:', err.message);
    }
  });
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('will-quit', () => globalShortcut.unregisterAll());
