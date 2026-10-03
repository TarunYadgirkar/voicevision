# VoiceVision

Adjustable reading tools for people with low vision and other access needs. Use voice, typing, or manual controls; common commands work without AI.

## What works

- Text size (100–200%), line spacing, brightness, optional contrast, color and motion adjustments.
- Need-based starting points, a personal reading preview, saved preferences, undo and reset.
- Keyboard controls and native radio groups; microphone errors explain typing/manual alternatives.
- Chrome/Edge extension applies the shared engine to ordinary webpages, with settings per site or globally.
- Cloud interpretation is off by default. Enable it to send unfamiliar command text and settings to the server and Google Gemini. Page content is not sent. Browser speech recognition may use the browser vendor's speech service separately.

These are adjustable access tools, not treatment. Blindness in one eye is different from loss of half the visual field. VoiceVision does not mask half the display to “help” either condition. Condition-only commands leave settings unchanged; compound requests apply only the requested adjustment. Color shifts and warm tint are optional preferences, not proven vision correction or eye protection. See [evidence and limits](docs/EVIDENCE.md) and [software validation](docs/VALIDATION.md).

## Run locally

Requires a Node version supported by Next.js 16.3.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Typing and manual controls work without an API key. For optional cloud parsing, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` server-side. Speech support depends on browser and microphone permissions; Chrome/Edge are the target extension browsers.

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run build:ext
```

## Install extension

1. Build with `npm run build:ext`.
2. Open `chrome://extensions` or Edge's Extensions page.
3. Enable Developer mode, choose Load unpacked, select `extension/`.
4. Open an ordinary website, then open VoiceVision from the toolbar.

Typing and manual controls are available in the popup. Alt+Shift+V opens it. Browser settings pages, extension stores, and some protected/PDF pages cannot be changed. Manual installation remains required; there is no Chrome Web Store release yet. See [extension privacy](extension/PRIVACY.md).

## Deployment and security boundaries

Next.js API uses validated command input/output and a server-only Gemini key. Local parser handles common requests; cloud responses time out and obsolete replies cannot overwrite newer settings. Rate limiting caps each client at 20/minute and each server instance at 100/minute, with bounded tracked keys. This is a per-instance quota guard, not distributed abuse protection or authentication. A public launch needs deployment-level/shared quotas and provider spending limits.

Production dependency audit was clean during October 2, 2026 checks. Development dependencies have upstream advisories; do not expose development/test servers publicly. Product changes still require checks with disabled users and live assistive technology; software tests do not establish clinical effectiveness.

Originally built at AI Collective Tri-Valley hackathon, June 2026. Current architecture and agent rules: [AGENTS.md](AGENTS.md).
