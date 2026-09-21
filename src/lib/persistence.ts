import { FilterState, defaultFilterState, defaultIntensities } from '@/types';
import { buildFilterString } from './filters';

export const STORAGE_KEY = 'voicevision.state';
export const SCHEMA_VERSION = 1;
export const BOOT_STYLE_ID = 'vv-boot-style';

interface StoredRecord {
  version: number;
  state: FilterState;
  // Derived from `state` at save time so the boot script can paint the restored page
  // before React loads without re-implementing buildFilterString in plain JS.
  boot: { filter: string; dark: boolean };
}

export function saveState(state: FilterState): void {
  const record: StoredRecord = {
    version: SCHEMA_VERSION,
    state,
    boot: { filter: buildFilterString(state), dark: state.darkMode },
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
    return {
      ...defaultFilterState,
      ...record.state,
      intensities: { ...defaultIntensities, ...record.state.intensities },
    };
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

// Runs in <head> before first paint. It writes the saved filter into a stylesheet rule
// rather than an inline style, so React's own inline style later wins without a fight.
export const BOOT_SCRIPT = `(function(){try{
var r=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||'null');
if(!r||r.version!==${SCHEMA_VERSION}||!r.boot)return;
if(r.boot.dark){document.documentElement.classList.add('vv-dark');document.documentElement.style.colorScheme='dark';}
if(r.boot.filter&&r.boot.filter!=='none'){var s=document.createElement('style');s.id=${JSON.stringify(BOOT_STYLE_ID)};
s.textContent='body{filter:'+r.boot.filter+'}';document.head.appendChild(s);}
}catch(e){}})();`;
