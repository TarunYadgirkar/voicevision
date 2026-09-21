import { FilterIntensities, FilterState } from '@/types';

export type AdaptationGroup = 'colour' | 'field' | 'comfort';

type EnumField = 'colorMode' | 'zoom' | 'hemianopia';
type FlagField = 'darkMode' | 'highContrast' | 'warmTone' | 'invertColors' | 'blur' | 'dimOverlay' | 'boldText' | 'reduceMotion';

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
  { id: 'deuteranopia', kind: 'enum', field: 'colorMode', value: 'deuteranopia', group: 'colour', label: 'Deuteranopia', hint: 'Red and green, the common one', intensityKey: 'colorMode' },
  { id: 'protanopia', kind: 'enum', field: 'colorMode', value: 'protanopia', group: 'colour', label: 'Protanopia', hint: 'Reds look dark', intensityKey: 'colorMode' },
  { id: 'tritanopia', kind: 'enum', field: 'colorMode', value: 'tritanopia', group: 'colour', label: 'Tritanopia', hint: 'Blue and yellow', intensityKey: 'colorMode' },
  { id: 'achromatopsia', kind: 'enum', field: 'colorMode', value: 'achromatopsia', group: 'colour', label: 'Achromatopsia', hint: 'No hue at all', intensityKey: 'colorMode' },

  { id: 'zoom-center', kind: 'enum', field: 'zoom', value: 'center', group: 'field', label: 'Macular degeneration', hint: 'Dims the centre of the field', intensityKey: 'zoom' },
  { id: 'zoom-peripheral', kind: 'enum', field: 'zoom', value: 'peripheral', group: 'field', label: 'Tunnel vision', hint: 'Dims the edges of the field', intensityKey: 'zoom' },
  { id: 'zoom-full', kind: 'enum', field: 'zoom', value: 'full', group: 'field', label: 'Magnify the page', hint: 'Enlarges everything and reflows', intensityKey: 'zoom' },
  { id: 'hemianopia-left', kind: 'enum', field: 'hemianopia', value: 'left', group: 'field', label: 'Left field loss', hint: 'Masks the left half' },
  { id: 'hemianopia-right', kind: 'enum', field: 'hemianopia', value: 'right', group: 'field', label: 'Right field loss', hint: 'Masks the right half' },
  { id: 'blur', kind: 'flag', field: 'blur', group: 'field', label: 'Cataract clarity', hint: 'Cuts haze with contrast and light', intensityKey: 'blur' },

  { id: 'darkMode', kind: 'flag', field: 'darkMode', group: 'comfort', label: 'Dark mode', hint: 'Inverts the page and dims it', intensityKey: 'darkMode' },
  { id: 'highContrast', kind: 'flag', field: 'highContrast', group: 'comfort', label: 'High contrast', hint: 'Pushes light and dark apart', intensityKey: 'highContrast' },
  { id: 'warmTone', kind: 'flag', field: 'warmTone', group: 'comfort', label: 'Warm tone', hint: 'Takes blue out of the light', intensityKey: 'warmTone' },
  { id: 'invertColors', kind: 'flag', field: 'invertColors', group: 'comfort', label: 'Invert colours', hint: 'Flips every colour outright', intensityKey: 'invertColors' },
  { id: 'dimOverlay', kind: 'flag', field: 'dimOverlay', group: 'comfort', label: 'Dim the screen', hint: 'Darkens without inverting', intensityKey: 'dimOverlay' },
  { id: 'boldText', kind: 'flag', field: 'boldText', group: 'comfort', label: 'Bold text', hint: 'Thickens every letter' },
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
