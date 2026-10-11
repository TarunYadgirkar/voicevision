import { FilterIntensities, FilterState } from '@/types';

export type AdaptationGroup = 'colour' | 'field' | 'comfort';

type EnumField = 'colorMode' | 'zoom' | 'hemianopia';
type FlagField = 'darkMode' | 'highContrast' | 'warmTone' | 'invertColors' | 'blur' | 'dimOverlay' | 'boldText' | 'reduceMotion' | 'textWrap';

interface EnumAdaptation {
  kind: 'enum';
  field: EnumField;
  value: string;
}

interface FlagAdaptation {
  kind: 'flag';
  field: FlagField;
}

export type Adaptation = (EnumAdaptation | FlagAdaptation) & {
  id: string;
  label: string;
  hint: string;
  group: AdaptationGroup;
  intensityKey?: keyof FilterIntensities;
};

// The one place an adaptation's name and description are written. Chips, toggles,
// spoken-command feedback and the intensity sliders all read from here, so renaming
// "Cataracts" is a one-line change rather than a hunt through the components.
export const ADAPTATIONS: readonly Adaptation[] = [
  { id: 'deuteranopia', kind: 'enum', field: 'colorMode', value: 'deuteranopia', group: 'colour', label: 'Red–green adjustment', hint: 'Optional colour shift; compare what helps you', intensityKey: 'colorMode' },
  { id: 'protanopia', kind: 'enum', field: 'colorMode', value: 'protanopia', group: 'colour', label: 'Red colour adjustment', hint: 'Optional colour shift for red distinctions', intensityKey: 'colorMode' },
  { id: 'tritanopia', kind: 'enum', field: 'colorMode', value: 'tritanopia', group: 'colour', label: 'Blue–yellow adjustment', hint: 'Optional colour shift for blue and yellow distinctions', intensityKey: 'colorMode' },
  { id: 'achromatopsia', kind: 'enum', field: 'colorMode', value: 'achromatopsia', group: 'colour', label: 'Colour-free contrast', hint: 'Adds contrast without relying on hue', intensityKey: 'colorMode' },

  { id: 'zoom-center', kind: 'enum', field: 'zoom', value: 'center', group: 'field', label: 'Central-loss simulation', hint: 'Educational preview: hides central content', intensityKey: 'zoom' },
  { id: 'zoom-peripheral', kind: 'enum', field: 'zoom', value: 'peripheral', group: 'field', label: 'Peripheral-loss simulation', hint: 'Educational preview: hides edge content', intensityKey: 'zoom' },
  { id: 'zoom-full', kind: 'enum', field: 'zoom', value: 'full', group: 'field', label: 'Magnify the page', hint: 'Enlarges everything and reflows', intensityKey: 'zoom' },
  { id: 'hemianopia-left', kind: 'enum', field: 'hemianopia', value: 'left', group: 'field', label: 'Left-loss simulation', hint: 'Educational preview: hides the left half' },
  { id: 'hemianopia-right', kind: 'enum', field: 'hemianopia', value: 'right', group: 'field', label: 'Right-loss simulation', hint: 'Educational preview: hides the right half' },
  { id: 'blur', kind: 'flag', field: 'blur', group: 'field', label: 'Clarity boost', hint: 'Increases contrast and brightness; adjust for comfort', intensityKey: 'blur' },

  { id: 'darkMode', kind: 'flag', field: 'darkMode', group: 'comfort', label: 'Dark mode', hint: 'Inverts the page and dims it', intensityKey: 'darkMode' },
  { id: 'highContrast', kind: 'flag', field: 'highContrast', group: 'comfort', label: 'High contrast', hint: 'Pushes light and dark apart', intensityKey: 'highContrast' },
  { id: 'warmTone', kind: 'flag', field: 'warmTone', group: 'comfort', label: 'Warm tone', hint: 'Adds a warmer colour tint', intensityKey: 'warmTone' },
  { id: 'invertColors', kind: 'flag', field: 'invertColors', group: 'comfort', label: 'Invert colours', hint: 'Flips every colour outright', intensityKey: 'invertColors' },
  { id: 'dimOverlay', kind: 'flag', field: 'dimOverlay', group: 'comfort', label: 'Dim the screen', hint: 'Darkens without inverting', intensityKey: 'dimOverlay' },
  { id: 'boldText', kind: 'flag', field: 'boldText', group: 'comfort', label: 'Bold text', hint: 'Thickens every letter' },
  { id: 'textWrap', kind: 'flag', field: 'textWrap', group: 'comfort', label: 'Wrap long lines', hint: 'Fit text into the available width' },
  { id: 'reduceMotion', kind: 'flag', field: 'reduceMotion', group: 'comfort', label: 'Reduce motion', hint: 'Stops animation and autoplay' },
] as const;

export const ADAPTATION_GROUPS: readonly AdaptationGroup[] = ['colour', 'field', 'comfort'];

export function adaptationsIn(group: AdaptationGroup): Adaptation[] {
  return ADAPTATIONS.filter(a => a.group === group);
}

export function isActive(state: FilterState, adaptation: Adaptation): boolean {
  if (adaptation.kind === 'enum') return state[adaptation.field] === adaptation.value;
  return state[adaptation.field];
}

export function activeAdaptations(state: FilterState): Adaptation[] {
  return ADAPTATIONS.filter(a => isActive(state, a));
}

export function toggleAdaptation(state: FilterState, adaptation: Adaptation): FilterState {
  if (adaptation.kind === 'enum') {
    const next = state[adaptation.field] === adaptation.value ? null : adaptation.value;
    return { ...state, [adaptation.field]: next } as FilterState;
  }
  return { ...state, [adaptation.field]: !state[adaptation.field] };
}

export function clearAdaptation(state: FilterState, adaptation: Adaptation): FilterState {
  if (adaptation.kind === 'enum') return { ...state, [adaptation.field]: null } as FilterState;
  return { ...state, [adaptation.field]: false };
}

// Only the intensities behind something currently switched on are worth a slider.
export function activeIntensityKeys(state: FilterState): (keyof FilterIntensities)[] {
  const keys = activeAdaptations(state)
    .map(a => a.intensityKey)
    .filter((k): k is keyof FilterIntensities => Boolean(k));
  return [...new Set(keys)];
}

export const INTENSITY_LABELS: Record<keyof FilterIntensities, string> = {
  colorMode: 'Colour strength',
  darkMode: 'Darkness',
  highContrast: 'Contrast',
  warmTone: 'Warmth',
  invertColors: 'Inversion',
  blur: 'Clarity boost',
  zoom: 'Magnification',
  dimOverlay: 'Dimming',
};

export type ReadingKey = 'textScale' | 'lineSpacing' | 'brightness';

export interface ReadingChange {
  key: ReadingKey;
  label: string;
  display: string;
  baseline: number;
}

export const READING_BASELINES: Record<ReadingKey, number> = { textScale: 1, lineSpacing: 1.6, brightness: 1 };

export function formatReading(key: ReadingKey, value: number): string {
  if (key === 'lineSpacing') return `${value.toFixed(1)}×`;
  return `${Math.round(value * 100)}%`;
}

const READING_LABELS: Record<ReadingKey, string> = { textScale: 'Text size', lineSpacing: 'Line spacing', brightness: 'Brightness' };

// Reading values differ from toggles: they are always "on", so only a move away from the
// baseline counts as a change worth showing.
export function readingChanges(state: FilterState): ReadingChange[] {
  const values: Record<ReadingKey, number> = {
    textScale: state.textScale,
    lineSpacing: state.lineSpacing,
    brightness: state.brightness ?? READING_BASELINES.brightness,
  };
  return (Object.keys(values) as ReadingKey[])
    .filter(key => Math.abs(values[key] - READING_BASELINES[key]) > 0.001)
    .map(key => ({ key, label: READING_LABELS[key], display: formatReading(key, values[key]), baseline: READING_BASELINES[key] }));
}
