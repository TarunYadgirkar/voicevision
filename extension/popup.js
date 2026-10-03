const extensionTabs = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;
const LOCAL_ONLY = typeof VOICEVISION_LOCAL_ONLY !== 'undefined' && VOICEVISION_LOCAL_ONLY;
const API_URL = 'https://voicevision-eight.vercel.app/api/interpret';
const SITE_URL = 'https://voicevision-eight.vercel.app';
const MAX_TRANSCRIPT_CHARS = 300;
const el = id => document.getElementById(id);
const micBtn = el('micBtn');
const micLabel = el('micLabel');
if (LOCAL_ONLY) { micBtn.disabled = true; micLabel.textContent = 'Voice unavailable in this local package — use typing'; }
const explanationEl = el('explanation');
const controlsEl = el('controls');
const filtersEl = el('filters');
let lastState = null;
let scope = 'global';
let activePort = null;
let requestRevision = 0;
let pendingController = null;
const GROUPS = [
  ['Display', [['darkMode', true, 'Dark mode'], ['highContrast', true, 'High contrast'], ['warmTone', true, 'Warm tone'], ['invertColors', true, 'Invert colors'], ['textWrap', true, 'Wrap long lines'], ['boldText', true, 'Bold text'], ['reduceMotion', true, 'Reduce motion'], ['dimOverlay', true, 'Dim screen']]],
  ['Optional color adjustments', [['colorMode', 'deuteranopia', 'Deutan adjustment'], ['colorMode', 'protanopia', 'Protan adjustment'], ['colorMode', 'tritanopia', 'Tritan adjustment'], ['colorMode', 'achromatopsia', 'Contrast adjustment']]],
];
const PRESETS = { reading: { textScale: 1.3, lineSpacing: 1.9, boldText: true }, glare: { brightness: 0.8, warmTone: true }, contrast: { highContrast: true, boldText: true }, calm: { reduceMotion: true } };
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`); }
function invalidate() { requestRevision += 1; pendingController?.abort(); pendingController = null; const port = activePort; activePort = null; port?.disconnect(); setMicIdle(); }
function status(text) { explanationEl.textContent = text; }
async function send(message) {
  try {
    const [tab] = await extensionTabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active page');
    return await extensionTabs.sendMessage(tab.id, message);
  } catch {
    status('Open a regular website, then reopen VoiceVision. Browser settings, extension stores and some PDF pages cannot be adjusted.');
    return null;
  }
}
function render(state) {
  if (!state || state.error) { if (state?.error) status(state.error); return; }
  lastState = state;
  const focused = document.activeElement.dataset.controlId;
  filtersEl.innerHTML = [['textScale', 'Text size', 1, 2, 0.1, state.textScale ?? 1], ['lineSpacing', 'Line spacing', 1.4, 2.4, 0.1, state.lineSpacing ?? 1.6], ['brightness', 'Brightness', 0.1, 1.5, 0.05, state.brightness ?? 1]].map(([key, label, min, max, step, value]) => `<div class="filter-row"><label for="reading-${key}">${label}<output>${key === 'lineSpacing' ? Number(value).toFixed(1) : `${Math.round(value * 100)}%`}</output></label><input id="reading-${key}" data-control-id="${key}" data-reading="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-valuetext="${key === 'lineSpacing' ? `${value} times` : `${Math.round(value * 100)} percent`}"></div>`).join('');
  controlsEl.innerHTML = GROUPS.map(([title, items]) => `<section><h2>${title}</h2><div class="toggle-grid">${items.map(([key, value, label]) => `<button type="button" data-control-id="${key}-${value}" data-key="${key}" data-value="${value}" aria-pressed="${state[key] === value}">${escapeHtml(label)}</button>`).join('')}</div></section>`).join('') + `<section><h2>Save settings for</h2><div class="segmented">${['site', 'global'].map(value => `<button type="button" data-control-id="scope-${value}" data-scope="${value}" aria-pressed="${scope === value}">${value === 'site' ? 'This site' : 'All sites'}</button>`).join('')}</div></section>`;
  if (focused) document.querySelector(`[data-control-id="${focused}"]`)?.focus();
}
async function manual(message) {
  invalidate();
  const revision = requestRevision;
  const result = await send(message);
  if (revision !== requestRevision) return;
  if (result?.state) { scope = result.scope; render(result.state); }
  else render(result);
  if (result && !result.error) status('Settings applied. Undo restores your previous settings.');
}
controlsEl.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.scope) return void manual({ type: 'vv:scope', scope: button.dataset.scope });
  const { key, value: raw } = button.dataset;
  const value = raw === 'true' ? true : raw;
  void manual(lastState?.[key] === value ? { type: 'TOGGLE_FILTER', key } : { type: 'APPLY_COMMAND', command: { [key]: value, colorAssist: 'correct', reset: false } });
});
filtersEl.addEventListener('change', event => {
  if (!event.target.dataset.reading) return;
  void manual({ type: 'SET_READING', key: event.target.dataset.reading, value: Number(event.target.value) });
});
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => void manual({ type: 'APPLY_COMMAND', command: { ...PRESETS[button.dataset.preset], reset: false } })));
el('undoBtn').addEventListener('click', () => void manual({ type: 'UNDO' }));
el('resetBtn').addEventListener('click', () => void manual({ type: 'APPLY_COMMAND', command: { reset: true } }));
el('cloudOptIn').addEventListener('change', () => { if (LOCAL_ONLY) return; invalidate(); chrome.storage.local.set({ vvCloudOptIn: el('cloudOptIn').checked }); status(el('cloudOptIn').checked ? 'Cloud interpretation enabled for unrecognized commands.' : 'Cloud interpretation off. Common commands and buttons still work.'); });
async function handleTranscript(rawText) {
  const text = typeof rawText === 'string' ? rawText.trim().slice(0, MAX_TRANSCRIPT_CHARS) : '';
  if (!text) { status('Enter a command first.'); return; }
  invalidate();
  const revision = requestRevision;
  el('transcript').textContent = `“${text}”`;
  if (/^undo( last( change)?)?$/i.test(text)) { await manual({ type: 'UNDO' }); return; }
  status('Checking command…');
  const local = await send({ type: 'vv:interpret', transcript: text });
  if (revision !== requestRevision || !local) return;
  if (local.handled) { render(local.state); status(local.command.explanation || 'Applied on this device.'); return; }
  if (LOCAL_ONLY || !el('cloudOptIn').checked) { status('Command not recognized. Try “larger text”, “less glare”, or use the buttons. Cloud interpretation is optional in privacy settings.'); return; }
  await interpretRemotely(text, local.revision, revision);
}
async function interpretRemotely(text, expectedRevision, revision) {
  const controller = new AbortController();
  pendingController = controller;
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: text, currentState: lastState }), signal: controller.signal });
    if (!response.ok) throw new Error('Unavailable');
    const command = await response.json();
    if (revision !== requestRevision) return;
    const result = await send({ type: 'APPLY_COMMAND', command, expectedRevision, transcript: text });
    if (revision !== requestRevision || !result) return;
    render(result);
    if (!result.error) status('Cloud command applied. Undo restores your previous settings.');
  } catch {
    if (revision === requestRevision) status('Cloud interpretation unavailable or timed out. Use a common command or the buttons.');
  } finally { clearTimeout(timer); if (pendingController === controller) pendingController = null; }
}
el('commandForm').addEventListener('submit', event => { event.preventDefault(); void handleTranscript(el('commandInput').value); });
function setMicIdle() { micBtn.classList.remove('listening'); micBtn.setAttribute('aria-pressed', 'false'); micLabel.textContent = 'Speak a command'; }
function micError(error) {
  const port = activePort;
  activePort = null;
  port?.disconnect();
  setMicIdle();
  const errors = { unsupported: 'Voice unavailable in this browser. Type a command or use the buttons.', 'not-allowed': 'Microphone blocked. Allow microphone access in this site’s browser settings, or type a command.', 'service-not-allowed': 'Speech service blocked. Type a command or use the buttons.', 'audio-capture': 'No microphone found. Type a command or use the buttons.', 'no-speech': 'No speech heard. Try again or type a command.', network: 'Speech service unavailable. Type a command or use the buttons.' };
  status(errors[error] || 'Voice command failed. Try again, type a command, or use the buttons.');
}
async function startListening() {
  invalidate();
  const revision = requestRevision;
  try {
    const [tab] = await extensionTabs.query({ active: true, currentWindow: true });
    if (revision !== requestRevision) return;
    if (!tab?.id) { status('Open a regular website to use voice commands.'); return; }
    const port = extensionTabs.connect(tab.id, { name: 'voicevision-mic' });
    activePort = port;
    port.onDisconnect.addListener(() => { if (activePort !== port) return; activePort = null; setMicIdle(); if (chrome.runtime.lastError) status('Voice cannot connect to this page. Open a regular website or use typing.'); });
    port.onMessage.addListener(message => {
      if (activePort !== port || revision !== requestRevision) return;
      if (message.type === 'start') { micBtn.classList.add('listening'); micBtn.setAttribute('aria-pressed', 'true'); micLabel.textContent = 'Listening — press to stop'; status('Listening…'); }
      if (message.type === 'end') { if (activePort === port) activePort = null; setMicIdle(); port.disconnect(); }
      if (message.type === 'result') void handleTranscript(message.transcript);
      if (message.type === 'error') micError(message.error);
    });
    port.postMessage({ type: 'START' });
  } catch { status('Voice cannot connect. Type a command or use the buttons.'); setMicIdle(); }
}
micBtn.addEventListener('click', () => { if (!activePort) return void startListening(); activePort.postMessage({ type: 'STOP' }); activePort.disconnect(); activePort = null; setMicIdle(); });
el('openSiteBtn').addEventListener('click', () => extensionTabs.create({ url: SITE_URL }));
chrome.storage.local.get(['vvScope', 'vvCloudOptIn'], data => { scope = data.vvScope === 'site' ? 'site' : 'global'; el('cloudOptIn').checked = !LOCAL_ONLY && data.vvCloudOptIn === true; el('cloudOptIn').disabled = LOCAL_ONLY; if (LOCAL_ONLY) el('cloudOptIn').parentElement.append(' — unavailable in this local Firefox package'); void send({ type: 'GET_STATE' }).then(state => { render(state); if (state) status('Ready. Settings save on this device.'); }); });
