import { FilterState, defaultFilterState, defaultIntensities } from '@/types';

export const STORAGE_KEY = 'voicevision.state';
export const SCHEMA_VERSION = 1;
export const BOOT_STYLE_ID = 'vv-boot-style';

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value)) : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function normalizeBrightness(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? boundedNumber(value, 1, 0.1, 1.5) : null;
}

export function normalizeFilterState(value: unknown): FilterState {
  const source = asRecord(value);
  const state = { ...defaultFilterState, intensities: { ...defaultIntensities } };
  const flags = ['darkMode', 'highContrast', 'warmTone', 'invertColors', 'blur',
    'dimOverlay', 'boldText', 'reduceMotion', 'textWrap'] as const;
  for (const flag of flags) {
    if (typeof source[flag] === 'boolean') state[flag] = source[flag];
  }
  const colors = ['deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia'] as const;
  state.colorMode = colors.find(color => source.colorMode === color) ?? null;
  if (source.colorAssist === 'simulate') state.colorMode = null;
  state.zoom = source.zoom === 'full' ? 'full' : null;
  state.brightness = normalizeBrightness(source.brightness);
  state.textScale = boundedNumber(source.textScale, 1, 1, 2);
  state.lineSpacing = boundedNumber(source.lineSpacing, 1.6, 1.4, 2.4);
  const intensities = asRecord(source.intensities);
  for (const key of Object.keys(defaultIntensities) as (keyof typeof defaultIntensities)[]) {
    state.intensities[key] = boundedNumber(intensities[key], defaultIntensities[key], 0, 1);
  }
  return state;
}

interface StoredRecord {
  version: number;
  state: FilterState;
}

export function saveState(state: FilterState): void {
  const savedState = normalizeFilterState(state);
  const record: StoredRecord = {
    version: SCHEMA_VERSION,
    state: savedState,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage can be full or blocked; the session still works without persistence.
  }
}

export function loadState(): FilterState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const record = JSON.parse(raw) as Partial<StoredRecord>;
    if (record.version !== SCHEMA_VERSION || !record.state) return null;
    return normalizeFilterState(record.state);
  } catch {
    return null;
  }
}

export function clearStoredState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to recover from; the in-memory reset has already happened.
  }
}

export const BOOT_SCRIPT = `(function(){try{
var r=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||'null');
if(!r||r.version!==${SCHEMA_VERSION}||!r.state)return;
if(r.state.darkMode===true){document.documentElement.classList.add('vv-dark');document.documentElement.style.colorScheme='dark';}
}catch(e){}})();`;
