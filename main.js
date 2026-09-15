const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, screen, nativeImage, Tray, Menu, shell } = require('electron');
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
  let files = [];
  try {
    files = fs.readdirSync(folder)
      .filter(f => f.endsWith('.png') && /^snap-\d+\.png$/.test(f));
  } catch {
    return [];
  }
  // statSync can throw if a file vanishes mid-listing (TOCTOU) — drop it, don't crash
  const withTime = [];
  for (const f of files) {
    try {
      withTime.push({ f, t: fs.statSync(path.join(folder, f)).mtimeMs });
    } catch { /* raced deletion — skip */ }
  }
  return withTime.sort((a, b) => b.t - a.t).map(x => x.f);
}

// ─── Settings (persisted in userData/settings.json) ───
const DEFAULT_SETTINGS = { fullResolution: false, captureDisplay: 'cursor' };

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function getSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Save settings failed:', err.message);
  }
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

// ─── Preview Window (single instance, reused — never churned) ───
let previewReady = false;
let pendingPreviewPath = null;

function sendToPreview(filePath) {
  if (!previewWindow || previewWindow.isDestroyed() || !previewReady) return false;
  try {
    previewWindow.webContents.send('show-screenshot', filePath);
    return true;
  } catch {
    return false; // window died mid-send — caller recreates
  }
}

function showInPreview(filePath) {
  pendingPreviewPath = filePath;
  // Reuse the existing window if alive — avoids destroy/recreate churn on spam
  if (previewWindow && !previewWindow.isDestroyed()) {
    if (sendToPreview(filePath)) pendingPreviewPath = null;
    return;
  }
  createPreviewWindow();
}

function createPreviewWindow() {
  const previewWidth = 360;
  const previewHeight = 300;
  const workArea = screen.getPrimaryDisplay().workAreaSize;

  let x;
  let y;
  try {
    if (!buttonWindow || buttonWindow.isDestroyed()) throw new Error('no button');
    const btnBounds = buttonWindow.getBounds();
    x = btnBounds.x - previewWidth - 15;
    y = btnBounds.y - Math.floor(previewHeight / 2) + 45;
    if (x < 10) x = btnBounds.x + 60;
    if (y < 10) y = 10;
    if (y + previewHeight > workArea.height) y = workArea.height - previewHeight - 10;
  } catch {
    // Button window gone — center on screen instead of crashing
    x = Math.floor(workArea.width / 2) - Math.floor(previewWidth / 2);
    y = Math.floor(workArea.height / 2) - Math.floor(previewHeight / 2);
  }

  previewReady = false;
  try {
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
  } catch (err) {
    console.error('Preview window failed:', err.message);
    previewWindow = null;
    return;
  }

  previewWindow.loadFile(path.join(__dirname, 'renderer', 'preview.html'));
  previewWindow.setVisibleOnAllWorkspaces(true);

  previewWindow.webContents.once('did-finish-load', () => {
    previewReady = true;
    if (pendingPreviewPath) {
      sendToPreview(pendingPreviewPath);
      pendingPreviewPath = null;
    }
  });

  previewWindow.on('closed', () => {
    previewWindow = null;
    previewReady = false;
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
    try {
      galleryWindow.webContents.send('load-gallery', getGalleryImages());
    } catch {
      // window died mid-send — harmless, it reloads on next open
    }
  }
}

function pulseButton() {
  if (buttonWindow && !buttonWindow.isDestroyed()) {
    try {
      buttonWindow.webContents.send('pulse-button');
    } catch {
      // best-effort feedback only
    }
  }
}

// ─── Capture ───
function getCaptureDisplay() {
  const settings = getSettings();
  if (settings.captureDisplay && settings.captureDisplay !== 'cursor') {
    const picked = screen.getAllDisplays().find(d =>
      String(d.id) === String(settings.captureDisplay)
    );
    if (picked) return picked;
  }
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

const MIN_CAPTURE_INTERVAL_MS = 800; // ignore spam-clicks faster than this
let lastCaptureAt = 0;
let lastCapturePath = null; // file backing the current preview (copy/reveal target)

async function captureScreen() {
  const now = Date.now();
  if (isCapturing || now - lastCaptureAt < MIN_CAPTURE_INTERVAL_MS) return;
  lastCaptureAt = now;
  isCapturing = true;

  try {
    const targetDisplay = getCaptureDisplay();
    const settings = getSettings();
    const { desktopCapturer } = require('electron');

    const scale = targetDisplay.scaleFactor || 1;
    const thumbnailSize = settings.fullResolution
      ? {
          width: Math.floor(targetDisplay.size.width * scale),
          height: Math.floor(targetDisplay.size.height * scale)
        }
      : { width: 1920, height: 1080 };

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize
    });

    if (!sources || sources.length === 0) {
      isCapturing = false;
      return;
    }

    const source = sources.find(s =>
      String(s.display_id) === String(targetDisplay.id)
    ) || sources[0];

    const image = source.thumbnail;
    if (image.isEmpty()) { isCapturing = false; return; }

    const folder = getSnapTapFolder();
    const filename = `snap-${Date.now()}.png`;
    const filePath = path.join(folder, filename);
    fs.writeFileSync(filePath, image.toPNG());
    lastCapturePath = filePath;

    // Auto-copy to clipboard for fast paste workflow
    clipboard.writeImage(image);
    pulseButton();

    // Pass only the file path over IPC — never multi-MB image data
    showInPreview(filePath);
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
  if (!tray || tray.isDestroyed()) return;
  try {
    buildTrayMenu();
  } catch (err) {
    console.error('Tray menu failed:', err.message);
  }
}

function buildTrayMenu() {
  const settings = getSettings();
  const displays = screen.getAllDisplays();

  const displayOptions = [
    {
      label: 'Display under cursor',
      type: 'radio',
      checked: settings.captureDisplay === 'cursor',
      click: () => {
        saveSettings({ ...getSettings(), captureDisplay: 'cursor' });
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    ...displays.map((d, i) => ({
      label: `Display ${i + 1} (${d.size.width}x${d.size.height})${d.id === screen.getPrimaryDisplay().id ? ' — Primary' : ''}`,
      type: 'radio',
      checked: String(settings.captureDisplay) === String(d.id),
      click: () => {
        saveSettings({ ...getSettings(), captureDisplay: String(d.id) });
        updateTrayMenu();
      }
    }))
  ];

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Screenshot (Alt+S)', click: captureScreen },
    { label: 'Gallery (Alt+G)', click: createGalleryWindow },
    { type: 'separator' },
    {
      label: 'Full resolution capture',
      type: 'checkbox',
      checked: settings.fullResolution,
      click: (item) => {
        saveSettings({ ...getSettings(), fullResolution: item.checked });
      }
    },
    { label: 'Capture display', submenu: displayOptions },
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

  screen.on('display-added', updateTrayMenu);
  screen.on('display-removed', updateTrayMenu);
  screen.on('display-metrics-changed', updateTrayMenu);

  globalShortcut.register('Alt+S', captureScreen);
  globalShortcut.register('Alt+G', createGalleryWindow);

  ipcMain.on('take-screenshot', () => captureScreen());
  ipcMain.on('open-gallery', createGalleryWindow);

  ipcMain.on('get-snaptap-folder', (event) => {
    event.returnValue = getSnapTapFolder();
  });

  // Copies the last capture straight from disk — no image data crosses IPC
  ipcMain.on('copy-to-clipboard', () => {
    if (!lastCapturePath) return;
    try {
      if (!fs.existsSync(lastCapturePath)) return;
      const image = nativeImage.createFromBuffer(fs.readFileSync(lastCapturePath));
      if (image.isEmpty()) return;
      clipboard.writeImage(image);
      pulseButton();
      if (previewWindow && !previewWindow.isDestroyed()) {
        previewWindow.close();
        previewWindow = null;
      }
    } catch (err) {
      console.error('Copy failed:', err.message);
    }
  });

  // Captures already auto-save — this just reveals the file in Explorer
  ipcMain.on('reveal-in-folder', () => {
    if (!lastCapturePath) return;
    try {
      if (!fs.existsSync(lastCapturePath)) return;
      shell.showItemInFolder(path.resolve(lastCapturePath));
    } catch (err) {
      console.error('Reveal failed:', err.message);
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
        if (lastCapturePath === filePath) lastCapturePath = null;
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
        pulseButton();
      }
    } catch (err) {
      console.error('Copy from gallery failed:', err.message);
    }
  });

});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('will-quit', () => globalShortcut.unregisterAll());

// ─── Crash containment: log and recover instead of dying ───
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (contained):', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (contained):', reason);
});

app.on('render-process-gone', (event, webContents, details) => {
  console.error('Renderer gone:', details && details.reason);
  if (buttonWindow && webContents === buttonWindow.webContents) {
    // Main UI died — rebuild it so the app stays usable
    try { buttonWindow.destroy(); } catch { /* already dead */ }
    buttonWindow = null;
    try {
      createButtonWindow();
    } catch (err) {
      console.error('Button rebuild failed:', err.message);
    }
  } else if (previewWindow && webContents === previewWindow.webContents) {
    previewWindow = null;
    previewReady = false;
  } else if (galleryWindow && webContents === galleryWindow.webContents) {
    galleryWindow = null;
  }
});
