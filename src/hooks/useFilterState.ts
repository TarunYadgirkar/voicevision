'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { applyFilters, resetFilters } from '@/lib/filters';
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
  if (command.intensities) next.intensities = { ...previous.intensities, ...command.intensities };
  return next;
}

// A module-level store rather than useState, so the first client read can restore from
// localStorage without a state update inside an effect and without a hydration mismatch:
// React hydrates from the server snapshot and re-renders from the client one.
let current: FilterState | null = null;
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
    current = defaultFilterState;
    resetFilters();
    clearStoredState();
    listeners.forEach(l => l());
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

  return { state, apply, toggle, remove, setIntensity, setColorAssist, reset };
}
