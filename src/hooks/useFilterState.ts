'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { applyFilters } from '@/lib/filters';
import { BOOT_STYLE_ID, clearStoredState, loadState, saveState } from '@/lib/persistence';
import { Adaptation, clearAdaptation, toggleAdaptation } from '@/lib/adaptations';
import {
  AccessibilityCommand,
  ColorAssist,
  FilterIntensities,
  FilterState,
  defaultFilterState,
} from '@/types';

const MERGE_KEYS = [
  'colorMode',
  'colorAssist',
  'darkMode',
  'highContrast',
  'brightness',
  'warmTone',
  'invertColors',
  'blur',
  'hemianopia',
  'zoom',
  'dimOverlay',
  'boldText',
  'reduceMotion',
  'textScale',
  'lineSpacing',
] as const;

export function mergeCommand(previous: FilterState, command: AccessibilityCommand): FilterState {
  if (command.reset) return defaultFilterState;

  const next: FilterState = { ...previous };
  for (const key of MERGE_KEYS) {
    const value = command[key];
    if (value !== null && value !== undefined) {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
  }
  for (const key of command.clear ?? []) next[key] = null;
  if (command.intensities) next.intensities = { ...previous.intensities, ...command.intensities };
  return next;
}

// A module-level store rather than useState, so the first client read can restore from
// localStorage without a state update inside an effect and without a hydration mismatch:
// React hydrates from the server snapshot and re-renders from the client one.
let current: FilterState | null = null;
let previous: FilterState | null = null;
const listeners = new Set<() => void>();

export function getFilterState(): FilterState {
  if (!current) current = loadState() ?? defaultFilterState;
  return current;
}

function getServerSnapshot(): FilterState {
  return defaultFilterState;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: FilterState, persist: boolean): void {
  const before = getFilterState();
  if (JSON.stringify(before) === JSON.stringify(next)) {
    if (!persist) clearStoredState();
    return;
  }
  previous = before;
  current = next;
  applyFilters(next);
  if (persist) saveState(next);
  else clearStoredState();
  listeners.forEach(l => l());
}

export interface FilterStateApi {
  state: FilterState;
  apply: (command: AccessibilityCommand) => void;
  toggle: (adaptation: Adaptation) => void;
  remove: (adaptation: Adaptation) => void;
  setIntensity: (key: keyof FilterIntensities, value: number) => void;
  setColorAssist: (assist: ColorAssist) => void;
  reset: () => void;
  undo: () => void;
  canUndo: boolean;
  replace: (state: FilterState) => void;
  setReading: (key: 'textScale' | 'lineSpacing' | 'brightness', value: number) => void;
}

export function useFilterState(): FilterStateApi {
  const state = useSyncExternalStore(subscribe, getFilterState, getServerSnapshot);

  // The boot script painted the saved CSS filter before first paint. On mount the real
  // engine takes over, which also builds the overlays the boot script cannot.
  useEffect(() => {
    applyFilters(getFilterState());
    document.getElementById(BOOT_STYLE_ID)?.remove();
  }, []);

  const reset = useCallback(() => {
    commit(defaultFilterState, false);
  }, []);

  const apply = useCallback((command: AccessibilityCommand) => {
    if (command.reset) {
      reset();
      return;
    }
    commit(mergeCommand(getFilterState(), command), true);
  }, [reset]);

  const toggle = useCallback((adaptation: Adaptation) => {
    commit(toggleAdaptation(getFilterState(), adaptation), true);
  }, []);

  const remove = useCallback((adaptation: Adaptation) => {
    commit(clearAdaptation(getFilterState(), adaptation), true);
  }, []);

  const setIntensity = useCallback((key: keyof FilterIntensities, value: number) => {
    const previous = getFilterState();
    commit({ ...previous, intensities: { ...previous.intensities, [key]: value } }, true);
  }, []);

  const setColorAssist = useCallback((assist: ColorAssist) => {
    commit({ ...getFilterState(), colorAssist: assist }, true);
  }, []);

  const undo = useCallback(() => { if (previous) commit(previous, true); }, []);
  const replace = useCallback((next: FilterState) => commit(next, true), []);
  const setReading = useCallback((key: 'textScale' | 'lineSpacing' | 'brightness', value: number) => {
    const ranges = { textScale: [1, 2], lineSpacing: [1.4, 2.4], brightness: [0.1, 1.5] };
    if (!Number.isFinite(value)) return;
    const [min, max] = ranges[key];
    const safe = Math.max(min, Math.min(max, value));
    commit({ ...getFilterState(), [key]: key === 'brightness' && safe === 1 ? null : safe }, true);
  }, []);
  return { state, apply, toggle, remove, setIntensity, setColorAssist, reset, undo, canUndo: previous !== null, replace, setReading };
}
