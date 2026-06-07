'use client';
import { FilterState } from '@/types';

interface Props {
  state: FilterState;
}

const MODE_LABELS: Record<string, string> = {
  deuteranopia: 'Deuteranopia',
  protanopia: 'Protanopia',
  tritanopia: 'Tritanopia',
  achromatopsia: 'Grayscale',
};

export function ActiveModes({ state }: Props) {
  const active: string[] = [];
  if (state.colorMode) active.push(MODE_LABELS[state.colorMode]);
  if (state.darkMode) active.push('Dark Mode');
  if (state.highContrast) active.push('High Contrast');
  if (state.warmTone) active.push('Warm Tone');
  if (state.invertColors) active.push('Inverted');
  if (state.brightness !== null) active.push(`Brightness ${state.brightness}`);

  if (!active.length) return <p className="text-gray-400 text-sm">No filters active</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {active.map(label => (
        <span key={label} className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
          {label}
        </span>
      ))}
    </div>
  );
}
