# SnapTap

A lightweight, always-on-top floating screenshot tool for Windows. Capture your screen with one click or keyboard shortcut, instantly save to disk, and browse your gallery.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Floating button** — stays on top of all windows, always accessible
- **One-click capture** — click the camera button or press `Alt+S`
- **Auto-copy** — every screenshot goes straight to clipboard, just paste
- **Full-resolution option** — tray toggle for pixel-perfect captures
- **Multi-monitor support** — captures the display under your cursor, or pick one from the tray
- **Disk storage** — screenshots auto-save to `Pictures/SnapTap/`
- **Gallery** — browse all screenshots, click any thumbnail to enlarge, copy, or delete
- **Instant copy** — copy any screenshot to clipboard with one click
- **Save as PNG** — export any capture as a file
- **Global shortcuts** — `Alt+S` capture, `Alt+G` open gallery
- **Tray icon** — quick access from the system tray
- **Draggable** — reposition the button anywhere along the screen edge
- **Minimal UI** — dark glass-morphism design, doesn't get in your way

## Installation

### Download

Download the latest release from [Releases](https://github.com/0x-Shadow/SnapTap/releases).

- **Installer** — Standard Windows installer with Start Menu shortcut
- **Portable** — No installation needed, just run the `.exe`

### Build from source

```bash
# Clone the repo
git clone https://github.com/0x-Shadow/SnapTap.git
cd SnapTap

# Install dependencies
npm install

# Run in development
npm start

# Build installer
npm run build

# Build portable version
npm run build:portable
```

## Usage

| Action | Method |
|--------|--------|
| Take screenshot | Click the camera button or press `Alt+S` |
| Open gallery | Click the grid button or press `Alt+G` |
| Copy screenshot | Click Copy in the preview, or `Ctrl+C` |
| Save to file | Click Save in the preview window |
| Reposition button | Drag the floating buttons up or down |
| Close any popup | Press `Escape` |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+S` | Take screenshot (global — works in any app) |
| `Alt+G` | Open screenshot gallery |
| `Ctrl+C` | Copy current screenshot (in preview) |
| `Escape` | Close any popup |

## How it works

1. Two buttons float on the right edge of your screen (camera + gallery)
2. Click the camera (or press `Alt+S`) to capture the display under your cursor
3. The screenshot is saved to `Pictures/SnapTap/` **and** copied to clipboard instantly
4. A preview appears with Copy and Save options
5. Click the gallery button (or press `Alt+G`) to browse all captures
6. Click any thumbnail to enlarge it, then copy or delete

### Settings (tray icon, right-click)

- **Full resolution capture** — capture at native display resolution instead of 1080p
- **Capture display** — "Display under cursor" (default) or lock to a specific monitor

## Screenshots

Screenshots are stored at:
```
%USERPROFILE%\Pictures\SnapTap\
```

## Tech Stack

- [Electron](https://www.electronjs.org/) — Desktop framework
- `desktopCapturer` API — Screen capture
- Pure HTML/CSS/JS — No frameworks, minimal footprint
- Glass-morphism UI — Dark theme with blur effects

## Security

- **Context Isolation** — All renderer processes use isolated contexts
- **Sandboxed** — Renderers run in sandboxed mode
- **No Node.js in renderer** — All system access goes through secure preload bridge
- **Input validation** — Filenames and data validated before processing
- **Path traversal protection** — File operations restricted to SnapTap folder
- **XSS prevention** — User content sanitized before DOM insertion
- **No network requests** — Fully offline, zero telemetry

## Privacy

- Screenshots are stored **locally only** in your Pictures folder
- No network requests — the app is fully offline
- No telemetry, no analytics, no tracking

## License

[MIT](LICENSE)
