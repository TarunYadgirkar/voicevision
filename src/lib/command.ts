import type { AccessibilityCommand, FilterIntensities } from '@/types';

const BOOLEAN_KEYS = ['darkMode', 'highContrast', 'warmTone', 'invertColors', 'blur', 'dimOverlay', 'boldText', 'reduceMotion', 'textWrap'] as const;
const ENUMS = {
  colorMode: ['deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia'],
  colorAssist: ['correct', 'simulate'], zoom: ['center', 'peripheral', 'full'], hemianopia: ['left', 'right'],
} as const;
const RANGES = { brightness: [0.1, 1.5], textScale: [1, 2], lineSpacing: [1.4, 2.4] } as const;
const INTENSITY_KEYS = ['colorMode', 'darkMode', 'highContrast', 'warmTone', 'invertColors', 'blur', 'zoom', 'dimOverlay'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function validFields(value: Record<string, unknown>): boolean {
  if (!BOOLEAN_KEYS.every(key => value[key] == null || typeof value[key] === 'boolean')) return false;
  if (!Object.entries(ENUMS).every(([key, options]) => value[key] == null || (options as readonly unknown[]).includes(value[key]))) return false;
  return Object.entries(RANGES).every(([key, [min, max]]) => value[key] == null || inRange(value[key], min, max));
}
function parseIntensities(value: unknown): Partial<FilterIntensities> | null | false {
  if (value == null) return null;
  if (!isRecord(value)) return false;
  const result: Partial<FilterIntensities> = {};
  for (const key of INTENSITY_KEYS) {
    const item = value[key];
    if (item === undefined) continue;
    if (!inRange(item, 0, 1)) return false;
    result[key] = item;
  }
  return result;
}
function validClear(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every(key => ['zoom', 'colorMode', 'hemianopia'].includes(key)));
}
export function validateCommand(value: unknown): AccessibilityCommand | null {
  if (!isRecord(value) || typeof value.reset !== 'boolean') return null;
  if (!validFields(value) || !validClear(value.clear)) return null;
  if (value.explanation !== undefined && typeof value.explanation !== 'string') return null;
  const intensities = parseIntensities(value.intensities);
  if (intensities === false) return null;
  const keys = [...BOOLEAN_KEYS, ...Object.keys(ENUMS), ...Object.keys(RANGES)];
  const fields = Object.fromEntries(keys.map(key => [key, value[key] ?? null]));
  return {
    ...fields, reset: value.reset, intensities,
    ...(value.clear === undefined ? {} : { clear: value.clear }),
    explanation: typeof value.explanation === 'string' ? value.explanation.slice(0, 400) : 'Reading settings updated.',
  } as AccessibilityCommand;
}
export function protectAssistiveCommand(command: AccessibilityCommand, transcript: string): AccessibilityCommand {
  const affirmativeColorPreview = /\b(simulate|simulation|preview|show me what)\b/i.test(transcript) && !/\b(no|not|never|don'?t)\b/i.test(transcript);
  return {
    ...command,
    zoom: command.zoom === 'center' || command.zoom === 'peripheral' ? null : command.zoom,
    hemianopia: null,
    colorAssist: command.colorAssist === 'simulate' && !affirmativeColorPreview ? 'correct' : command.colorAssist,
  };
}

export function hasCommandChanges(command: AccessibilityCommand): boolean {
  if (command.reset) return true;
  return Object.entries(command).some(([key, value]) => {
    if (['explanation', 'reset'].includes(key) || value == null) return false;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  });
}
