const API_URL = 'https://voicevision-eight.vercel.app/api/interpret';
const SITE_URL = 'https://voicevision-eight.vercel.app';
const MAX_TRANSCRIPT_CHARS = 300;

const micBtn = document.getElementById('micBtn');
const micLabel = document.getElementById('micLabel');
const openSiteBtn = document.getElementById('openSiteBtn');
const transcriptEl = document.getElementById('transcript');
const explanationEl = document.getElementById('explanation');
const filtersEl = document.getElementById('filters');
const controlsEl = document.getElementById('controls');

const CHECK_SVG = `<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>`;

// Every adaptation the content script understands, grouped so related controls sit together.
// `key` is the state field; `value` is what an on-press sets it to (true for plain switches).
const CONTROL_GROUPS = [
  {
    title: 'Display',
    items: [
      { key: 'darkMode', value: true, label: 'Dark mode' },
      { key: 'highContrast', value: true, label: 'High contrast' },
      { key: 'warmTone', value: true, label: 'Warm tone' },
      { key: 'invertColors', value: true, label: 'Invert colors' },
      { key: 'boldText', value: true, label: 'Bold text' },
      { key: 'reduceMotion', value: true, label: 'Reduce motion' },
      { key: 'dimOverlay', value: true, label: 'Dim screen' },
    ],
  },
  {
    title: 'Color vision',
    items: [
      { key: 'colorMode', value: 'deuteranopia', label: 'Deuteranopia' },
      { key: 'colorMode', value: 'protanopia', label: 'Protanopia' },
      { key: 'colorMode', value: 'tritanopia', label: 'Tritanopia' },
      { key: 'colorMode', value: 'achromatopsia', label: 'No color vision' },
    ],
  },
  {
    title: 'Magnify',
    items: [
      { key: 'zoom', value: 'full', label: 'Whole page' },
      { key: 'zoom', value: 'center', label: 'Around the center' },
      { key: 'zoom', value: 'peripheral', label: 'Around the edges' },
    ],
  },
  {
    title: 'Field loss after a stroke',
    items: [
      { key: 'hemianopia', value: 'left', label: 'Left side is missing' },
      { key: 'hemianopia', value: 'right', label: 'Right side is missing' },
    ],
  },
];

const COLOR_ASSIST_SEGMENT = {
  title: 'What the color change is for',
  field: 'colorAssist',
  options: [
    { value: 'correct', label: 'Correct colors for me' },
    { value: 'simulate', label: 'Preview the deficiency' },
  ],
};

const SCOPE_SEGMENT = {
  title: 'Where these settings apply',
  field: 'scope',
  options: [
    { value: 'site', label: 'This site' },
    { value: 'global', label: 'All sites' },
  ],
};

const SLIDER_ROWS = [
  { key: 'colorMode', intensityKey: 'colorMode', label: 'Color vision' },
  { key: 'darkMode', intensityKey: 'darkMode', label: 'Dark mode' },
  { key: 'highContrast', intensityKey: 'highContrast', label: 'High contrast' },
  { key: 'warmTone', intensityKey: 'warmTone', label: 'Warm tone' },
  { key: 'invertColors', intensityKey: 'invertColors', label: 'Invert colors' },
  { key: 'blur', intensityKey: 'blur', label: 'Clarity boost' },
  { key: 'zoom', intensityKey: 'zoom', label: 'Magnification' },
  { key: 'dimOverlay', intensityKey: 'dimOverlay', label: 'Screen dimming' },
];

let lastState = null;
let scope = 'site';
let activePort = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function isOn(state, item) {
  if (!state) return false;
  return item.value === true ? state[item.key] === true : state[item.key] === item.value;
}

function toggleHtml(pressed, dataAttrs, label) {
  return `<button type="button" class="toggle" aria-pressed="${pressed}" ${dataAttrs}>
    ${CHECK_SVG}<span class="toggle-label">${escapeHtml(label)}</span>
  </button>`;
}

function groupHtml(group, state) {
  const buttons = group.items
    .map((item) =>
      toggleHtml(
        isOn(state, item),
        `data-key="${item.key}" data-value="${escapeHtml(item.value)}"`,
        item.label
      )
    )
    .join('');
  return `<h2 class="group-title">${escapeHtml(group.title)}</h2>
    <div class="toggle-grid">${buttons}</div>`;
}

function segmentHtml(segment, current) {
  const buttons = segment.options
    .map((option) =>
      toggleHtml(current === option.value, `data-segment="${segment.field}" data-value="${option.value}"`, option.label)
    )
    .join('');
  return `<h2 class="group-title">${escapeHtml(segment.title)}</h2>
    <div class="segmented" role="group" aria-label="${escapeHtml(segment.title)}">${buttons}</div>`;
}

function renderControls(state) {
  const groups = CONTROL_GROUPS.map((group) => groupHtml(group, state)).join('');
  const colorAssist = segmentHtml(COLOR_ASSIST_SEGMENT, state?.colorAssist ?? null);
  const scopeSegment = segmentHtml(SCOPE_SEGMENT, scope);
  controlsEl.innerHTML = groups + colorAssist + scopeSegment;
}

function sliderRowHtml(row, state) {
  const value = state.intensities?.[row.intensityKey] ?? 1;
  return `<div class="filter-row">
    <span class="filter-label">${escapeHtml(row.label)}</span>
    <input type="range" class="filter-slider" data-intensity-key="${row.intensityKey}"
      min="0" max="1" step="0.05" value="${value}"
      aria-label="${escapeHtml(row.label)} strength">
  </div>`;
}

function brightnessRowHtml(state) {
  return `<div class="filter-row">
    <span class="filter-label">Brightness</span>
    <input type="range" class="filter-slider" data-intensity-key="brightness"
      min="0.1" max="1.5" step="0.05" value="${state.brightness}" aria-label="Brightness">
  </div>`;
}

function renderSliders(state) {
  const rows = SLIDER_ROWS.filter((row) => Boolean(state?.[row.key])).map((row) => sliderRowHtml(row, state));
  if (state && state.brightness !== null && state.brightness !== undefined) {
    rows.push(brightnessRowHtml(state));
  }
  filtersEl.innerHTML = rows.length
    ? rows.join('')
    : '<span class="empty">Nothing is on yet</span>';
}

function render(state) {
  if (state) lastState = state;
  renderSliders(lastState);
  renderControls(lastState);
}

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    return null; // no content script here (chrome:// pages, the web store, a tab still loading)
  }
}

function coerceValue(raw) {
  return raw === 'true' ? true : raw;
}

// On-press sends APPLY_COMMAND so the content script merges the field into its state;
// off-press sends TOGGLE_FILTER, the same message the popup has always used to clear one filter.
async function toggleAdaptation(key, rawValue) {
  const value = coerceValue(rawValue);
  const item = { key, value };
  const message = isOn(lastState, item)
    ? { type: 'TOGGLE_FILTER', key }
    : { type: 'APPLY_COMMAND', command: { [key]: value, reset: false } };
  render(await sendToActiveTab(message));
}

async function setColorAssist(value) {
  const next = lastState?.colorAssist === value ? null : value;
  render(await sendToActiveTab({ type: 'APPLY_COMMAND', command: { colorAssist: next, reset: false } }));
}

async function setScope(value) {
  scope = value;
  const state = await sendToActiveTab({ type: 'vv:scope', scope: value });
  render(state);
}

controlsEl.addEventListener('click', (e) => {
  const button = e.target.closest('.toggle');
  if (!button) return;
  const { segment, key, value } = button.dataset;
  if (segment === 'colorAssist') return void setColorAssist(value);
  if (segment === 'scope') return void setScope(value);
  if (key) return void toggleAdaptation(key, value);
});

filtersEl.addEventListener('change', async (e) => {
  if (!e.target.matches('.filter-slider')) return;
  const key = e.target.dataset.intensityKey;
  const value = parseFloat(e.target.value);
  render(await sendToActiveTab({ type: 'SET_INTENSITY', key, value }));
});

async function interpretRemotely(text) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: text, currentState: lastState }),
  });
  return res.json();
}

async function handleTranscript(rawText) {
  const text = rawText.slice(0, MAX_TRANSCRIPT_CHARS);
  transcriptEl.textContent = `“${text}”`;
  explanationEl.textContent = 'Working on it…';

  try {
    const command = await interpretRemotely(text);
    if (command.error) {
      explanationEl.textContent = command.error;
      return;
    }
    explanationEl.textContent = command.explanation ?? '';
    render(await sendToActiveTab({ type: 'APPLY_COMMAND', command }));
  } catch {
    explanationEl.textContent = 'Could not reach VoiceVision — check your connection.';
  }
}

function setMicIdle() {
  micBtn.classList.remove('listening');
  micLabel.textContent = 'Speak a command';
}

function handleMicError(error) {
  setMicIdle();
  if (error === 'unsupported') {
    transcriptEl.textContent = 'Voice is not supported on this page — try Chrome on a regular https:// site.';
    return;
  }
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    transcriptEl.textContent =
      'Microphone access is blocked. Open site settings from the address bar of this tab, allow the microphone, then try again.';
    return;
  }
  transcriptEl.textContent = `Microphone error: ${error}`;
}

function handlePortMessage(msg) {
  if (msg.type === 'start') {
    micBtn.classList.add('listening');
    micLabel.textContent = 'Listening — press to stop';
    return;
  }
  if (msg.type === 'end') {
    activePort = null;
    setMicIdle();
    return;
  }
  if (msg.type === 'result') return void handleTranscript(msg.transcript);
  if (msg.type === 'error') handleMicError(msg.error);
}

// Recognition runs in the content script (page origin) — chrome-extension:// popup
// origins can't hold a mic permission grant. Results stream back over a port.
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
    setMicIdle();
    if (chrome.runtime.lastError) {
      transcriptEl.textContent = 'Open a regular webpage (not a chrome:// page) to use voice commands.';
    }
  });
  port.onMessage.addListener(handlePortMessage);
  port.postMessage({ type: 'START' });
}

micBtn.addEventListener('click', () => {
  if (!activePort) return void startListening();
  activePort.postMessage({ type: 'STOP' });
  activePort.disconnect();
  activePort = null;
  setMicIdle();
});

openSiteBtn.addEventListener('click', () => chrome.tabs.create({ url: SITE_URL }));

sendToActiveTab({ type: 'GET_STATE' }).then(render);
