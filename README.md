# VoiceVision

Voice-activated screen accessibility for people with visual impairments. Speak your needs — VoiceVision adapts your display in real time.

Built at AI Hackathon with The AI Collective Tri-Valley | Humans in AI Week, June 7, 2026.

---

## Setup (5 minutes)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd voicevision
npm install
```

### 2. Get your free API key

Go to **https://aistudio.google.com/apikey** — log in with Google, create a key.  
No credit card. No billing. Free tier: 1,500 requests/day.

### 3. Set your key

```bash
cp .env.example .env.local
# Edit .env.local — paste your key as GEMINI_API_KEY=AIza...
```

### 4. Run

```bash
npm run dev
```

Open **http://localhost:3000** in **Chrome or Edge** (required for voice).

---

## Deploy to Vercel (free)

```bash
npm i -g vercel
vercel
```

Add `GEMINI_API_KEY` in the Vercel dashboard under Project → Settings → Environment Variables.  
Or connect your GitHub repo at vercel.com/dashboard for auto-deploy on push.

---

## Voice Commands

| You say | What happens |
|---|---|
| "I have red-green colorblindness" | Deuteranopia filter |
| "Make it dark" | Dark mode |
| "Too bright in here" | Dark mode + reduced brightness |
| "High contrast please" | Contrast boost |
| "I'm light sensitive" | Dark mode + warm tone |
| "Macular degeneration" | Center magnification |
| "Reset to normal" | All filters cleared |

Commands stack. Say "dark mode" then "high contrast" and both apply.

---

## Stack

- **Next.js 14+** App Router, TypeScript
- **Web Speech API** — browser native, free, no signup
- **Google Gemini 2.5 Flash** — interprets natural language into commands (free tier)
- **SVG feColorMatrix** — clinically accurate color blindness simulation
- **Tailwind CSS**
- **Vercel** — free Hobby tier, HTTPS included

---

## Chrome Extension (use on any site)

The `extension/` folder is a Manifest V3 extension that applies the same adaptations to any
webpage, not just the VoiceVision demo site.

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** -> select the `extension/` folder
4. Pin the VoiceVision icon, open it on any site, and either press the mic or use the controls

**Voice is not the only way in.** The popup carries a labelled button for every adaptation
(dark mode, high contrast, warm tone, invert, bold text, reduce motion, dim screen, each color
vision mode, each magnifier, and left/right field loss), sliders for the strength of whatever is
on, a choice between correcting colors for you and previewing a deficiency, and a choice between
applying settings to this site or to all sites.

**Alt+Shift+V** opens the popup from anywhere. Rebind it at `chrome://extensions/shortcuts`.

Spoken commands are interpreted on the device first by the content script's own parser. Only when
that parser cannot place a phrase does the popup call `/api/interpret`, and then it sends just the
transcript and the currently active adaptations. `extension/PRIVACY.md` has the full account.

---

## Security

- **CORS allowlist.** `/api/interpret` answers with `Access-Control-Allow-Origin` only for the
  request's own origin, any `chrome-extension://` origin, and `http://localhost` (or `127.0.0.1`)
  for local development. Every other origin gets no allow header, so the browser blocks the read.
  Responses carry `Vary: Origin`.
- **Input caps.** `transcript` must be a non-empty string of 300 characters or fewer; anything
  else is a 400.
- **Rate limit.** 20 requests per minute per IP in a sliding window, answered with 429 and a
  `Retry-After` header. The counter lives in memory, so on serverless it is per-instance. It is a
  guard on the Gemini free-tier quota, not a security boundary.
- **Key handling.** The Gemini client is built inside the request handler. With `GEMINI_API_KEY`
  unset the route returns 503 with a clear message instead of failing at import time. The key
  never reaches the client.

---

## Browser Support

**Works:** Chrome 25+, Edge (Chromium)  
**Partial:** Safari (iOS 14.5+)  
**No:** Firefox  

Run the demo in Chrome.

---

## For AI Coding Assistants

Read `CLAUDE.md` (Claude Code) or `AGENTS.md` (Cursor, Windsurf, Copilot) for full context.  
Read `SKILLS.md` for copy-pasteable implementations of every major component.  
Architecture decisions, exact filter values, and API design are all documented.
