/**
 * VoiceVision content script. Bundled to extension/content.js by `npm run build:ext`.
 * Shares src/lib/filters.ts and src/lib/intent.ts with the web app so both consumers
 * stay in lockstep; only the SVG filter ids are namespaced (vv-) to avoid colliding
 * with ids on the host page.
 *
 * Message protocol (chrome.tabs.sendMessage → sendResponse):
 *   { type: 'GET_STATE' }                            → FilterState
 *   { type: 'APPLY_COMMAND', command }               → FilterState   (command is an AccessibilityCommand)
 *   { type: 'TOGGLE_FILTER', key }                   → FilterState   (turns one filter off)
 *   { type: 'SET_INTENSITY', key, value }            → FilterState   (key 'brightness' sets state.brightness)
 *   { type: 'vv:scope', scope: 'site' | 'global' }   → { scope, state }
 *   { type: 'vv:interpret', transcript }             → { handled: true, command, state } when the
 *                                                      local parser recognised the phrase, else
 *                                                      { handled: false } and the popup calls /api/interpret
 *
 * Port protocol (chrome.tabs.connect, name 'voicevision-mic'):
 *   popup → page: { type: 'START' } | { type: 'STOP' }
 *   page → popup: { type: 'start' } | { type: 'end' } | { type: 'result', transcript } | { type: 'error', error }
 *
 * Storage: state lives under `vvState:<origin>` in site scope and `vvState` in global scope.
 * The scope itself persists under `vvScope`. Site scope falls back to the global state the
 * first time a site is seen, so a page inherits whatever the user last set globally.
 */
import {
  applyBoldText,
  applyDimOverlay,
  applyHemianopia,
  applyReduceMotion,
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
import { AccessibilityCommand, defaultFilterState, FilterState } from '@/types';

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

function hydrate(raw: Partial<FilterState> | undefined): FilterState {
  if (!raw) return { ...defaultFilterState, intensities: { ...defaultFilterState.intensities } };
  return {
    ...defaultFilterState,
    ...raw,
    intensities: { ...defaultFilterState.intensities, ...(raw.intensities ?? {}) },
  };
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

  let scope: Scope = 'global';
  let state = hydrate(undefined);

  function applyAll(): void {
    updateColorMatrices(state.intensities.colorMode, PREFIX);
    // Safari does not render CSS `filter` on <html>, so it goes on <body>; every fixed
    // overlay therefore hangs off <html>, which is not a containing block for them.
    document.body.style.filter = buildFilterString(state, PREFIX);
    document.documentElement.style.colorScheme = state.darkMode ? 'dark' : '';
    applyZoom(state.zoom, state.intensities.zoom);
    applyHemianopia(state.hemianopia);
    applyDimOverlay(state.dimOverlay, state.intensities.dimOverlay);
    applyBoldText(state.boldText);
    applyReduceMotion(state.reduceMotion);
  }

  function persist(): void {
    chrome.storage.local.set({ [storageKey(scope)]: state });
  }

  function resetAll(): void {
    state = hydrate(undefined);
    resetFilters();
  }

  function mergeCommand(cmd: AccessibilityCommand): void {
    if (cmd.reset) {
      resetAll();
      return;
    }
    const pick = <T,>(value: T | null | undefined, fallback: T): T =>
      value !== null && value !== undefined ? value : fallback;
    state = {
      colorMode: pick(cmd.colorMode, state.colorMode),
      colorAssist: pick(cmd.colorAssist, state.colorAssist),
      darkMode: pick(cmd.darkMode, state.darkMode),
      highContrast: pick(cmd.highContrast, state.highContrast),
      brightness: pick(cmd.brightness, state.brightness),
      warmTone: pick(cmd.warmTone, state.warmTone),
      invertColors: pick(cmd.invertColors, state.invertColors),
      blur: pick(cmd.blur, state.blur),
      hemianopia: pick(cmd.hemianopia, state.hemianopia),
      zoom: pick(cmd.zoom, state.zoom),
      dimOverlay: pick(cmd.dimOverlay, state.dimOverlay),
      boldText: pick(cmd.boldText, state.boldText),
      reduceMotion: pick(cmd.reduceMotion, state.reduceMotion),
      intensities: cmd.intensities ? { ...state.intensities, ...cmd.intensities } : state.intensities,
    };
    applyAll();
  }

  function loadScoped(next: Scope, done?: () => void): void {
    scope = next;
    // A site with no stored preferences yet inherits the global one rather than resetting.
    chrome.storage.local.get([storageKey(next), GLOBAL_KEY], (data: Record<string, Partial<FilterState> | undefined>) => {
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
    if (!change?.newValue || JSON.stringify(change.newValue) === JSON.stringify(state)) return;
    state = hydrate(change.newValue);
    applyAll();
  });

  // SpeechRecognition runs here (page origin) instead of the popup — chrome-extension://
  // popup origins can't hold a mic permission grant, but the page origin can. Streamed to
  // the popup over a port since recognition is async.
  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'voicevision-mic') return;
    let recognition: SpeechRecognition | null = null;

    port.onMessage.addListener((msg: { type: string }) => {
      if (msg.type === 'STOP') {
        recognition?.stop();
        return;
      }
      if (msg.type !== 'START') return;

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        port.postMessage({ type: 'error', error: 'unsupported' });
        return;
      }

      recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      recognition.onstart = () => port.postMessage({ type: 'start' });
      recognition.onend = () => port.postMessage({ type: 'end' });
      recognition.onerror = (e: SpeechRecognitionErrorEvent) => port.postMessage({ type: 'error', error: e.error });
      recognition.onresult = e => port.postMessage({ type: 'result', transcript: e.results[0][0].transcript });
      recognition.start();
    });

    port.onDisconnect.addListener(() => recognition?.stop());
  });

  const OFF_VALUE_IS_NULL = ['colorMode', 'zoom', 'hemianopia', 'brightness'];

  type Message =
    | { type: 'GET_STATE' }
    | { type: 'APPLY_COMMAND'; command: AccessibilityCommand }
    | { type: 'TOGGLE_FILTER'; key: string }
    | { type: 'SET_INTENSITY'; key: string; value: number }
    | { type: 'vv:scope'; scope: Scope }
    | { type: 'vv:interpret'; transcript: string };

  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (message.type === 'GET_STATE') {
      sendResponse(state);
      return;
    }

    if (message.type === 'APPLY_COMMAND') {
      mergeCommand(message.command);
      persist();
      sendResponse(state);
      return;
    }

    // Turn a single active filter off (the × button in the popup).
    if (message.type === 'TOGGLE_FILTER') {
      const off = OFF_VALUE_IS_NULL.includes(message.key) ? null : false;
      state = { ...state, [message.key]: off };
      applyAll();
      persist();
      sendResponse(state);
      return;
    }

    // Adjust a filter's intensity slider in the popup.
    if (message.type === 'SET_INTENSITY') {
      state = message.key === 'brightness'
        ? { ...state, brightness: message.value }
        : { ...state, intensities: { ...state.intensities, [message.key]: message.value } };
      applyAll();
      persist();
      sendResponse(state);
      return;
    }

    if (message.type === 'vv:scope') {
      chrome.storage.local.set({ [SCOPE_KEY]: message.scope });
      loadScoped(message.scope, () => {
        persist();
        sendResponse({ scope: message.scope, state });
      });
      return true;
    }

    if (message.type === 'vv:interpret') {
      const command = parseIntent(message.transcript, state);
      if (!command) {
        sendResponse({ handled: false });
        return;
      }
      mergeCommand(command);
      persist();
      sendResponse({ handled: true, command, state });
      return;
    }
  });
}
