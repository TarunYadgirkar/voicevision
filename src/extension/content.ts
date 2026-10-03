import {
  applyBoldText,
  applyDimOverlay,
  applyHemianopia,
  applyReduceMotion,
  applyReadingPreferences,
  applyZoom,
  blendMatrixValues,
  buildFilterString,
  COLOR_ASSIST_MODES,
  COLOR_MATRICES,
  DICHROMACY_TYPES,
  resetFilters,
  updateColorMatrices,
} from '@/lib/filters';
import { parseIntent } from '@/lib/intent';
import { normalizeFilterState } from '@/lib/persistence';
import { hasCommandChanges, protectAssistiveCommand, validateCommand } from '@/lib/command';
import { AccessibilityCommand, FilterState } from '@/types';

type Scope = 'site' | 'global';

const PREFIX = 'vv-';
const GLOBAL_KEY = 'vvState';
const SCOPE_KEY = 'vvScope';

declare global {
  interface Window {
    __voicevisionInjected?: boolean;
  }
}

if (!window.__voicevisionInjected) {
  window.__voicevisionInjected = true;
  init();
}

function storageKey(scope: Scope): string {
  return scope === 'site' ? `${GLOBAL_KEY}:${location.origin}` : GLOBAL_KEY;
}

function statesEqual(left: FilterState, right: FilterState): boolean {
  return (Object.keys(left) as (keyof FilterState)[]).every(key => key === 'intensities'
    ? (Object.keys(left.intensities) as (keyof FilterState['intensities'])[]).every(name => left.intensities[name] === right.intensities[name])
    : left[key] === right[key]);
}

function hydrate(raw: unknown): FilterState {
  return normalizeFilterState(raw);
}

// Chrome Blink linearRGB values, one <filter> per (deficiency type × assist mode).
// color-interpolation-filters="linearRGB" is required or the matrix math runs in sRGB.
function injectFilterDefs(): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  const filters = COLOR_ASSIST_MODES.flatMap(assist =>
    DICHROMACY_TYPES.map(type => {
      const id = `${PREFIX}${type}-${assist}`;
      return `<filter id="${id}" color-interpolation-filters="linearRGB">
        <feColorMatrix id="${id}-matrix" type="matrix" values="${blendMatrixValues(COLOR_MATRICES[assist][type], 1)}"/>
      </filter>`;
    })
  );
  svg.innerHTML = `<defs>${filters.join('')}</defs>`;
  document.documentElement.appendChild(svg);
}

function init(): void {
  injectFilterDefs();
  const originalFilter = document.body.style.getPropertyValue('filter');
  const originalFilterPriority = document.body.style.getPropertyPriority('filter');
  const computedFilter = getComputedStyle(document.body).filter;
  const originalColorScheme = document.documentElement.style.getPropertyValue('color-scheme');
  const originalColorSchemePriority = document.documentElement.style.getPropertyPriority('color-scheme');
  const originalZoom = document.documentElement.style.getPropertyValue('zoom');
  const originalZoomPriority = document.documentElement.style.getPropertyPriority('zoom');

  function restorePageAppearance(): void {
    document.body.style.setProperty('filter', originalFilter, originalFilterPriority);
    document.documentElement.style.setProperty('color-scheme', originalColorScheme, originalColorSchemePriority);
    document.documentElement.style.setProperty('zoom', originalZoom, originalZoomPriority);
  }

  let scope: Scope = 'global';
  let state = hydrate(undefined);
  let previousState: FilterState | null = null;
  let revision = 0;
  let loadRevision = 0;

  function remember(): void {
    previousState = { ...state, intensities: { ...state.intensities } };
    revision += 1;
  }

  function applyAll(): void {
    updateColorMatrices(state.intensities.colorMode, PREFIX);
    // Safari does not render CSS `filter` on <html>, so it goes on <body>; every fixed
    // overlay therefore hangs off <html>, which is not a containing block for them.
    const filter = buildFilterString(state, PREFIX);
    if (filter === 'none') {
      document.body.style.setProperty('filter', originalFilter, originalFilterPriority);
    } else {
      document.body.style.setProperty('filter', [computedFilter && computedFilter !== 'none' ? computedFilter : '', filter].filter(Boolean).join(' '), originalFilterPriority);
    }
    document.documentElement.style.setProperty('color-scheme', state.darkMode ? 'dark' : originalColorScheme, originalColorSchemePriority);
    applyZoom(state.zoom, state.intensities.zoom);
    if (!state.zoom) document.documentElement.style.setProperty('zoom', originalZoom, originalZoomPriority);
    applyHemianopia(state.hemianopia);
    applyDimOverlay(state.dimOverlay, state.intensities.dimOverlay);
    applyBoldText(state.boldText);
    applyReduceMotion(state.reduceMotion);
    applyReadingPreferences(state);
  }

  function persist(): void {
    chrome.storage.local.set({ [storageKey(scope)]: state });
  }

  function resetAll(): void {
    state = hydrate(undefined);
    resetFilters();
    restorePageAppearance();
  }

  function resetCommand(): void {
    if (statesEqual(state, hydrate(undefined))) return;
    remember();
    resetAll();
  }

  function mergeCommand(cmd: AccessibilityCommand): void {
    if (cmd.reset) {
      resetCommand();
      return;
    }
    const pick = <T,>(value: T | null | undefined, fallback: T): T =>
      value !== null && value !== undefined ? value : fallback;
    const before = state;
    state = {
      colorMode: cmd.clear?.includes('colorMode') ? null : pick(cmd.colorMode, state.colorMode),
      colorAssist: pick(cmd.colorAssist, state.colorAssist),
      darkMode: pick(cmd.darkMode, state.darkMode),
      highContrast: pick(cmd.highContrast, state.highContrast),
      brightness: pick(cmd.brightness, state.brightness),
      warmTone: pick(cmd.warmTone, state.warmTone),
      invertColors: pick(cmd.invertColors, state.invertColors),
      blur: pick(cmd.blur, state.blur),
      hemianopia: cmd.clear?.includes('hemianopia') ? null : pick(cmd.hemianopia, state.hemianopia),
      zoom: cmd.clear?.includes('zoom') ? null : pick(cmd.zoom, state.zoom),
      dimOverlay: pick(cmd.dimOverlay, state.dimOverlay),
      boldText: pick(cmd.boldText, state.boldText),
      reduceMotion: pick(cmd.reduceMotion, state.reduceMotion),
      textWrap: pick(cmd.textWrap, state.textWrap),
      textScale: pick(cmd.textScale, state.textScale),
      lineSpacing: pick(cmd.lineSpacing, state.lineSpacing),
      intensities: cmd.intensities ? { ...state.intensities, ...cmd.intensities } : state.intensities,
    };
    if (statesEqual(before, state)) return;
    const next = state;
    state = before;
    remember();
    state = next;
    applyAll();
  }

  function loadScoped(next: Scope, done?: () => void): void {
    scope = next;
    const loading = ++loadRevision;
    const startingRevision = revision;
    // A site with no stored preferences yet inherits the global one rather than resetting.
    chrome.storage.local.get([storageKey(next), GLOBAL_KEY], (data: Record<string, Partial<FilterState> | undefined>) => {
      if (loading !== loadRevision || startingRevision !== revision) { done?.(); return; }
      remember();
      state = hydrate(data[storageKey(next)] ?? data[GLOBAL_KEY]);
      applyAll();
      done?.();
    });
  }

  chrome.storage.local.get(SCOPE_KEY, data => {
    loadScoped(data[SCOPE_KEY] === 'site' ? 'site' : 'global');
  });

  // Pick up state changes made from other tabs on the same scope key.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const change = changes[storageKey(scope)];
    if (!change?.newValue) return;
    const next = hydrate(change.newValue);
    if (statesEqual(next, state)) return;
    remember();
    state = next;
    applyAll();
  });

  // SpeechRecognition runs here (page origin) instead of the popup — chrome-extension://
  // popup origins can't hold a mic permission grant, but the page origin can. Streamed to
  // the popup over a port since recognition is async.
  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'voicevision-mic') return;
    let recognition: SpeechRecognition | null = null;
    let disconnected = false;
    function post(message: object): void {
      if (!disconnected) port.postMessage(message);
    }

    port.onMessage.addListener((msg: { type: string }) => {
      if (msg.type === 'STOP') {
        recognition?.stop();
        return;
      }
      if (msg.type !== 'START') return;

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        post({ type: 'error', error: 'unsupported' });
        return;
      }

      recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      recognition.onstart = () => post({ type: 'start' });
      recognition.onend = () => post({ type: 'end' });
      recognition.onerror = (e: SpeechRecognitionErrorEvent) => post({ type: 'error', error: e.error });
      recognition.onresult = e => post({ type: 'result', transcript: e.results[0][0].transcript });
      try { recognition.start(); } catch { post({ type: 'error', error: 'audio-capture' }); }
    });

    port.onDisconnect.addListener(() => { disconnected = true; recognition?.abort(); });
  });

  const OFF_VALUE_IS_NULL = ['colorMode', 'zoom', 'hemianopia', 'brightness'];

  type Message =
    | { type: 'GET_STATE' }
    | { type: 'APPLY_COMMAND'; command: unknown; expectedRevision?: number; transcript?: string }
    | { type: 'SET_READING'; key: 'textScale' | 'lineSpacing' | 'brightness'; value: number }
    | { type: 'UNDO' }
    | { type: 'REPLACE_STATE'; state: unknown }
    | { type: 'TOGGLE_FILTER'; key: string }
    | { type: 'SET_INTENSITY'; key: string; value: number }
    | { type: 'vv:scope'; scope: Scope }
    | { type: 'vv:interpret'; transcript: string };

  type Reply = (response: unknown) => void;

  function getState(_message: Extract<Message, { type: 'GET_STATE' }>, sendResponse: Reply): boolean | void {
    sendResponse(state);
    return;
    }

  function applyCommandMessage(message: Extract<Message, { type: 'APPLY_COMMAND' }>, sendResponse: Reply): boolean | void {
    const command = validateCommand(message.command);
    if (!command) { sendResponse({ error: 'Command not recognized. Use the reading controls.' }); return; }
    if (message.expectedRevision !== undefined && message.expectedRevision !== revision) {
      sendResponse({ error: 'Settings changed while the command was processing. Try again.' }); return;
    }
    const safe = protectAssistiveCommand(command, typeof message.transcript === 'string' ? message.transcript : '');
    if (hasCommandChanges(safe)) { mergeCommand(safe); persist(); }
    sendResponse(state);
    return;
    }

  function undoMessage(_message: Extract<Message, { type: 'UNDO' }>, sendResponse: Reply): boolean | void {
    if (previousState) {
      const restored = previousState;
      remember();
      state = restored;
      applyAll();
      persist();
    }
    sendResponse(state);
    return;
    }

  function replaceStateMessage(message: Extract<Message, { type: 'REPLACE_STATE' }>, sendResponse: Reply): boolean | void {
    remember();
    state = hydrate(message.state);
    applyAll(); persist(); sendResponse(state); return;
    }

  function setReadingMessage(message: Extract<Message, { type: 'SET_READING' }>, sendResponse: Reply): boolean | void {
    const bounds = { textScale: [1, 2], lineSpacing: [1.4, 2.4], brightness: [0.1, 1.5] };
    const range = bounds[message.key];
    if (!range || !Number.isFinite(message.value) || message.value < range[0] || message.value > range[1]) {
      sendResponse({ error: 'Reading value outside the supported range.' }); return;
    }
    remember();
    state = { ...state, [message.key]: message.value };
    applyAll(); persist(); sendResponse(state); return;
    }

  function toggleFilterMessage(message: Extract<Message, { type: 'TOGGLE_FILTER' }>, sendResponse: Reply): boolean | void {
    if (!['colorMode', 'zoom', 'hemianopia', 'brightness', 'darkMode', 'highContrast', 'warmTone', 'invertColors', 'blur', 'dimOverlay', 'boldText', 'reduceMotion', 'textWrap'].includes(message.key)) {
      sendResponse({ error: 'Unknown setting.' }); return;
    }
    remember();
    const off = OFF_VALUE_IS_NULL.includes(message.key) ? null : false;
    state = { ...state, [message.key]: off };
    applyAll();
    persist();
    sendResponse(state);
    return;
    }

  function setIntensityMessage(message: Extract<Message, { type: 'SET_INTENSITY' }>, sendResponse: Reply): boolean | void {
    if (!Number.isFinite(message.value) || (message.key === 'brightness' ? message.value < 0.1 || message.value > 1.5 : !Object.hasOwn(state.intensities, message.key) || message.value < 0 || message.value > 1)) {
      sendResponse({ error: 'Invalid strength value.' }); return;
    }
    remember();
    state = message.key === 'brightness'
      ? { ...state, brightness: message.value }
      : { ...state, intensities: { ...state.intensities, [message.key]: message.value } };
    applyAll();
    persist();
    sendResponse(state);
    return;
    }

  function scopeMessage(message: Extract<Message, { type: 'vv:scope' }>, sendResponse: Reply): boolean | void {
    if (message.scope !== 'site' && message.scope !== 'global') return;
    chrome.storage.local.set({ [SCOPE_KEY]: message.scope });
    loadScoped(message.scope, () => {
      persist();
      sendResponse({ scope: message.scope, state });
    });
    return true;
    }

  function interpretMessage(message: Extract<Message, { type: 'vv:interpret' }>, sendResponse: Reply): boolean | void {
    if (typeof message.transcript !== 'string' || !message.transcript.trim() || message.transcript.length > 300) { sendResponse({ handled: false, revision }); return; }
    const command = parseIntent(message.transcript, state);
    if (!command) {
      sendResponse({ handled: false, revision });
      return;
    }
    const safe = protectAssistiveCommand(command, typeof message.transcript === 'string' ? message.transcript : '');
    if (hasCommandChanges(safe)) { mergeCommand(safe); persist(); }
    sendResponse({ handled: true, command, state });
    return;
    }


  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    switch (message.type) {
      case 'GET_STATE': return getState(message, sendResponse);
      case 'APPLY_COMMAND': return applyCommandMessage(message, sendResponse);
      case 'UNDO': return undoMessage(message, sendResponse);
      case 'REPLACE_STATE': return replaceStateMessage(message, sendResponse);
      case 'SET_READING': return setReadingMessage(message, sendResponse);
      case 'TOGGLE_FILTER': return toggleFilterMessage(message, sendResponse);
      case 'SET_INTENSITY': return setIntensityMessage(message, sendResponse);
      case 'vv:scope': return scopeMessage(message, sendResponse);
      case 'vv:interpret': return interpretMessage(message, sendResponse);
    }
  });
}
