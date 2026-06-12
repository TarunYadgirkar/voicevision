const API_URL = 'https://voicevision-eight.vercel.app/api/interpret';
const SITE_URL = 'https://voicevision-eight.vercel.app';

const micBtn = document.getElementById('micBtn');
const openSiteBtn = document.getElementById('openSiteBtn');
const transcriptEl = document.getElementById('transcript');
const explanationEl = document.getElementById('explanation');
const badgesEl = document.getElementById('badges');

const MODE_LABELS = {
  deuteranopia: 'Deuteranopia',
  protanopia: 'Protanopia',
  tritanopia: 'Tritanopia',
  achromatopsia: 'Grayscale',
};

const ZOOM_LABELS = {
  center: 'Central Vision Loss',
  peripheral: 'Tunnel Vision',
  full: 'Magnified',
};

const HEMIANOPIA_LABELS = {
  left: 'Hemianopia (Left)',
  right: 'Hemianopia (Right)',
};

let lastState = null;
let activePort = null;

function renderBadges(state) {
  if (!state) return;
  lastState = state;
  const active = [];
  if (state.colorMode) active.push(MODE_LABELS[state.colorMode] ?? state.colorMode);
  if (state.darkMode) active.push('Dark Mode');
  if (state.highContrast) active.push('High Contrast');
  if (state.warmTone) active.push('Warm Tone');
  if (state.invertColors) active.push('Inverted');
  if (state.blur) active.push('Cataracts (Clarity Boost)');
  if (state.brightness !== null && state.brightness !== undefined) active.push(`Brightness ${state.brightness}`);
  if (state.zoom) active.push(ZOOM_LABELS[state.zoom] ?? state.zoom);
  if (state.hemianopia) active.push(HEMIANOPIA_LABELS[state.hemianopia] ?? state.hemianopia);

  badgesEl.innerHTML = active.length
    ? active.map((label) => `<span class="badge">${label}</span>`).join('')
    : '<span class="empty">No filters active</span>';
}

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    return null; // content script not present (e.g. chrome:// pages)
  }
}

async function handleTranscript(text) {
  transcriptEl.textContent = `“${text}”`;
  explanationEl.textContent = 'Thinking…';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text, currentState: lastState }),
    });
    const command = await res.json();
    if (command.error) {
      explanationEl.textContent = command.error;
      return;
    }
    explanationEl.textContent = command.explanation ?? '';
    const state = await sendToActiveTab({ type: 'APPLY_COMMAND', command });
    renderBadges(state);
  } catch {
    explanationEl.textContent = 'Could not reach VoiceVision API — check your connection.';
  }
}

// Recognition runs in the content script (page origin) — chrome-extension:// popup
// origins can't hold a mic permission grant. Streamed back over a port.
async function startListening() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    transcriptEl.textContent = 'No active tab — open a regular webpage to use voice commands.';
    return;
  }

  let port;
  try {
    port = chrome.tabs.connect(tab.id, { name: 'voicevision-mic' });
  } catch {
    transcriptEl.textContent = 'Open a regular webpage to use voice commands.';
    return;
  }

  activePort = port;

  port.onDisconnect.addListener(() => {
    activePort = null;
    micBtn.classList.remove('listening');
    micBtn.textContent = '🎤 Hold to Speak';
    if (chrome.runtime.lastError) {
      transcriptEl.textContent = 'Open a regular webpage (not a chrome:// page) to use voice commands.';
    }
  });

  port.onMessage.addListener((msg) => {
    if (msg.type === 'start') {
      micBtn.classList.add('listening');
      micBtn.textContent = '🎤 Listening…';
      return;
    }
    if (msg.type === 'end') {
      activePort = null;
      micBtn.classList.remove('listening');
      micBtn.textContent = '🎤 Hold to Speak';
      return;
    }
    if (msg.type === 'result') {
      handleTranscript(msg.transcript);
      return;
    }
    if (msg.type === 'error') {
      micBtn.classList.remove('listening');
      micBtn.textContent = '🎤 Hold to Speak';
      if (msg.error === 'unsupported') {
        transcriptEl.textContent = 'Voice not supported on this page — try Chrome on a regular https:// site.';
        return;
      }
      if (msg.error === 'not-allowed' || msg.error === 'service-not-allowed') {
        transcriptEl.textContent = 'Microphone access denied. Click the lock icon in the address bar of this tab → Site settings → allow Microphone, then try again.';
        return;
      }
      transcriptEl.textContent = `Mic error: ${msg.error}`;
    }
  });

  port.postMessage({ type: 'START' });
}

micBtn.addEventListener('click', () => {
  if (activePort) {
    activePort.postMessage({ type: 'STOP' });
    activePort.disconnect();
    activePort = null;
    micBtn.classList.remove('listening');
    micBtn.textContent = '🎤 Hold to Speak';
    return;
  }
  startListening();
});
openSiteBtn.addEventListener('click', () => chrome.tabs.create({ url: SITE_URL }));

// Reflect whatever filters are already active on this tab when the popup opens
sendToActiveTab({ type: 'GET_STATE' }).then(renderBadges);
