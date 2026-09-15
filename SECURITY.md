# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.2.x   | :white_check_mark: |
| < 2.2   | :x:                |

Only the latest release is supported. Older Electron runtimes may contain
unpatched Chromium vulnerabilities — please upgrade instead of reporting
issues against outdated versions.

## Reporting a Vulnerability

**Do not open a public issue for security reports.**

Open a [private security advisory](https://github.com/0x-Shadow/SnapTap/security/advisories/new)
or contact the maintainer through the email listed on the
[GitHub profile](https://github.com/0x-Shadow).

What to include:

- Affected version(s) and platform
- Steps to reproduce (proof of concept preferred)
- Impact assessment — what can an attacker achieve, and what must they already control?
- Whether the issue requires local access, user interaction, or works remotely

You can expect an initial response within 7 days. If a report is confirmed,
a fix is released as soon as it is ready, and the reporter is credited in the
release notes (unless anonymity is requested).

## Security Architecture

SnapTap is designed so that a compromise of any single layer does not hand
over the machine:

- **Sandboxed renderers** — every window runs with `sandbox: true`,
  `nodeIntegration: false`, and `contextIsolation: true`. Renderer code has
  zero direct access to Node.js, the filesystem, or Electron APIs.
- **Minimal preload bridge** — the only code crossing the isolation boundary
  is a small `contextBridge` API with no unsanitized pass-throughs.
- **Validated IPC** — filenames must match `snap-<digits>.png` and resolve
  inside the SnapTap folder (path-traversal proof); no image data crosses IPC,
  only short file paths.
- **Strict CSP** — `default-src 'self' data:; script-src 'self'` on every window.
- **Fully offline** — the app makes zero network requests. No auto-updater
  (nothing can silently ship new code), no telemetry, no analytics.
- **Packaged integrity** — releases ship as asar with integrity validation;
  `npm audit` is clean (0 vulnerabilities) at release time.
- **Crash containment** — captures are throttled, the preview window is reused
  instead of churned, and renderer crashes trigger recovery, not silent death.

## Privacy

- Screenshots are written only to `%USERPROFILE%\Pictures\SnapTap\` on the
  user's own machine and are never transmitted anywhere.
- Settings live in the OS app-data folder (`settings.json`: capture quality
  and display choice only).
- The clipboard is written to, never read.
- Screen capture is the app's stated purpose and is disclosed in the README;
  captures are triggered explicitly by the user (button, tray, or hotkey).
