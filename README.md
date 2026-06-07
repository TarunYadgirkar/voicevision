# VoiceVision

**Speak how you see — VoiceVision adapts the screen for you, instantly.**

VoiceVision is a voice-activated accessibility layer. Say something like *"I can't tell red from green"* or *"everything is too bright"*, and Gemini interprets your intent and applies the right combination of color-vision filters, contrast, brightness, dark mode, and zoom — live, with no page reload.

🔗 **Live demo:** https://voicevision-eight.vercel.app

Built at the AI Hackathon with The AI Collective Tri-Valley | Humans in AI Week, June 7, 2026.

---

## How it works

1. You tap the mic and speak naturally — no fixed command syntax required.
2. The transcript is sent to **Gemini 2.5 Flash**, which returns structured JSON describing exactly which adaptations to apply (and a one-sentence explanation of why).
3. VoiceVision composes those into a single CSS `filter` string — SVG `feColorMatrix` filters for color-vision simulation, plus `brightness`, `contrast`, `sepia`, `invert`, and `grayscale` — and applies it to the whole page in real time.
4. Commands stack and compose: say "dark mode," then "high contrast," and both stay active. Say "reset" or "normal" to clear everything.

You don't need to memorize commands — just describe your symptoms or needs in plain language, or tap a tile in the **Supported Adaptations** panel to toggle a mode directly.

---

## Supported adaptations

| Category | Modes |
|---|---|
| **Color Vision** | Deuteranopia (red-green), Protanopia (red weakness), Tritanopia (blue-yellow), Achromatopsia (full grayscale) |
| **Vision Conditions** | Macular Degeneration (center magnification), Tunnel Vision (peripheral magnification), Low Vision (full-page zoom) |
| **Display Comfort** | Dark Mode, High Contrast, Warm Tone (reduced blue light), Invert Colors |

Plus adjustable **brightness** (e.g. "it's too bright, turn it down").

### Example things to say

| You say | What happens |
|---|---|
| "I have red-green colorblindness" | Deuteranopia filter applied |
| "Everything is too bright, it hurts my eyes" | Dark mode + reduced brightness |
| "I'm light sensitive" | Dark mode + warm tone |
| "I have macular degeneration" | Center-zoom magnification |
| "I have tunnel vision" / "glaucoma" | Peripheral-zoom magnification |
| "Colors look washed out, boost the contrast" | High-contrast mode |
| "Turn off the dark mode but keep high contrast" | Compound command — removes one mode, keeps the other |
| "Reset to normal" | All filters cleared |

---

## Project structure

```
src/
  app/
    layout.tsx               # Injects SVG filter defs into the DOM
    page.tsx                 # Main UI, control card, supported-adaptations panel, test content
    api/interpret/route.ts   # POST handler — transcript → Gemini → AccessibilityCommand JSON
  components/
    VoiceButton.tsx          # Mic button; wraps useSpeechRecognition
    FilterOverlay.tsx        # Hidden SVG <feColorMatrix> filter definitions
    ActiveModes.tsx          # Badges for currently active modes (with per-mode removal)
    CommandHistory.tsx       # Trail of recent commands + AI explanations
  hooks/
    useSpeechRecognition.ts  # Web Speech API wrapper (SSR-safe)
  lib/
    filters.ts               # buildFilterString / applyFilters / resetFilters
  types/
    index.ts                 # AccessibilityCommand & FilterState definitions
extension/                   # Manifest V3 Chrome extension — runs VoiceVision on any website
```

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/TarunYadgirkar/voicevision.git
cd voicevision
npm install
```

### 2. Get a free Gemini API key

Go to **https://aistudio.google.com/apikey**, sign in with Google, and create a key.
No credit card, no billing — the free tier covers **20 requests/day** comfortably for trying things out (Google's published limit is 1,500/day, 15/min; actual availability can vary).

### 3. Configure your environment

```bash
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=AIza...
```

`GEMINI_API_KEY` is read server-side only (in the `/api/interpret` route) — it's never exposed to the browser.

### 4. Run it

```bash
npm run dev
```

Open **http://localhost:3000** in **Chrome or Edge** — voice input requires the Web Speech API, which only those browsers support. Microphone access works over plain `http://localhost` in development.

---

## Browser extension

The `extension/` folder contains a Manifest V3 Chrome extension that brings VoiceVision to *any* website — not just the demo page. It captures voice input, calls the deployed `/api/interpret` endpoint, and injects the same SVG color-matrix filters and CSS adaptations directly into the page you're browsing.

To load it locally: open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `extension/` folder.

---

## Deploying your own copy

```bash
npm i -g vercel
vercel
```

Add `GEMINI_API_KEY` under **Project → Settings → Environment Variables** in the Vercel dashboard (or via `vercel env add`), or connect your GitHub repo at vercel.com/dashboard for automatic deploys on every push to `main`.

---

## Stack

- **Next.js 16** (App Router) + **TypeScript**, **React 19**
- **Tailwind CSS 4**
- **Web Speech API** (`webkitSpeechRecognition` / `SpeechRecognition`) — native, free, no signup
- **`@google/genai`** — Gemini 2.5 Flash, with `responseMimeType: 'application/json'` so responses are guaranteed valid JSON (no markdown fences, no parsing errors)
- **SVG `feColorMatrix`** filters with `color-interpolation-filters="linearRGB"` — scientifically accurate color-blindness simulation matching Chrome's Blink renderer
- **Vercel** — Hobby tier, HTTPS included, deploys on push

---

## Browser support

| Browser | Voice input |
|---|---|
| Chrome 25+, Edge (Chromium) | ✅ Full support |
| Safari (iOS 14.5+) | ⚠️ Partial |
| Firefox | ❌ Not supported (no Web Speech API) |

The visual filters themselves work everywhere — only the *voice* capture needs Chrome/Edge/Safari. On unsupported browsers, use the **Supported Adaptations** panel to toggle modes by tapping instead of speaking.

---

## A note on usage limits

Voice parsing is powered by the Gemini API, which has its own free daily quota — currently capped at **20 voice requests/day** for this deployment. VoiceVision itself is completely free; if you hit the daily cap, the **Supported Adaptations** panel works without limits since it doesn't call the AI at all.

---

## For AI coding assistants

- `CLAUDE.md` — context for Claude Code
- `AGENTS.md` — context for Cursor, Windsurf, Copilot, and other agents
- `SKILLS.md` — copy-pasteable reference implementations for every major component
- `PRD.md` / `BUILDPLAN.md` — original product spec and build plan

These document the architecture, the exact `AccessibilityCommand` schema, the SVG filter matrix values, and the gotchas worth knowing before modifying the interpret pipeline or filter composition.
