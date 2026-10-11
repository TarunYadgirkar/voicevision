'use client';
import { Check } from '@phosphor-icons/react';
import { Disclosure } from '@/components/Disclosure';
import { activeIntensityKeys, adaptationsIn, formatReading, INTENSITY_LABELS, isActive } from '@/lib/adaptations';
import type { Adaptation, ReadingKey } from '@/lib/adaptations';
import type { ColorAssist, FilterIntensities, FilterState } from '@/types';

interface Props {
  state: FilterState;
  onToggle: (adaptation: Adaptation) => void;
  onIntensityChange: (key: keyof FilterIntensities, value: number) => void;
  onReadingChange: (key: ReadingKey, value: number) => void;
  onColorAssistChange: (assist: ColorAssist) => void;
}

const READING_CONTROLS: { key: ReadingKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'textScale', label: 'Text size', min: 1, max: 2, step: 0.05 },
  { key: 'lineSpacing', label: 'Line spacing', min: 1.4, max: 2.4, step: 0.1 },
  { key: 'brightness', label: 'Brightness', min: 0.3, max: 1.5, step: 0.05 },
];

const COMFORT = [...adaptationsIn('comfort'), ...adaptationsIn('field').filter(adaptation => adaptation.id === 'zoom-full')];

function ToggleButton({ adaptation, active, onToggle }: { adaptation: Adaptation; active: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={active} className="toggle">
      <span className="flex flex-col">
        <span className="font-bold">{adaptation.label}</span>
        <span className="toggle-hint text-sm text-muted">{adaptation.hint}</span>
      </span>
      <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active ? 'bg-on-signal text-signal' : 'ring-2 ring-inset ring-line'}`}>
        {active && <Check size={16} weight="bold" />}
      </span>
    </button>
  );
}

function readingValue(state: FilterState, key: ReadingKey): number {
  return key === 'brightness' ? state.brightness ?? 1 : state[key];
}

export function AdaptationControls({ state, onToggle, onIntensityChange, onReadingChange, onColorAssistChange }: Props) {
  const intensityKeys = activeIntensityKeys(state);
  return (
    <div className="flex flex-col gap-8">
      <fieldset className="grid gap-x-8 gap-y-5 md:grid-cols-3">
        <legend className="sr-only">Reading values</legend>
        {READING_CONTROLS.map(control => {
          const value = readingValue(state, control.key);
          const display = formatReading(control.key, value);
          return (
            <div key={control.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`reading-${control.key}`} className="font-bold">{control.label}</label>
                <output htmlFor={`reading-${control.key}`} className="type-value text-muted">{display}</output>
              </div>
              <input id={`reading-${control.key}`} type="range" min={control.min} max={control.max} step={control.step}
                value={value} aria-valuetext={display} onChange={event => onReadingChange(control.key, Number(event.target.value))}
                className="min-h-11 w-full cursor-pointer" />
            </div>
          );
        })}
      </fieldset>

      <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="type-heading mb-3">Comfort</legend>
        {COMFORT.map(adaptation => (
          <ToggleButton key={adaptation.id} adaptation={adaptation} active={isActive(state, adaptation)} onToggle={() => onToggle(adaptation)} />
        ))}
      </fieldset>

      <div>
        <Disclosure title="Colour adjustments">
          <p className="type-body text-muted">Try an adjustment and keep it only if it helps you tell colours apart. Results vary by person and content.</p>
          <fieldset className="flex flex-wrap gap-x-6 gap-y-1">
            <legend className="sr-only">Colour filter purpose</legend>
            {[{ value: 'correct' as const, label: 'Adjust colours' }, { value: 'simulate' as const, label: 'Educational simulation' }].map(option => (
              <label key={option.value} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="colour-purpose" value={option.value} checked={state.colorAssist === option.value} onChange={() => onColorAssistChange(option.value)} />
                {option.label}
              </label>
            ))}
          </fieldset>
          <div className="grid gap-2 sm:grid-cols-2">
            {adaptationsIn('colour').map(adaptation => (
              <ToggleButton key={adaptation.id} adaptation={adaptation} active={isActive(state, adaptation)} onToggle={() => onToggle(adaptation)} />
            ))}
          </div>
        </Disclosure>

        {intensityKeys.length > 0 && (
          <Disclosure title="Fine-tune strength">
            <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              {intensityKeys.map(key => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="flex justify-between gap-3 font-bold">{INTENSITY_LABELS[key]}<span className="type-value font-normal text-muted">{Math.round(state.intensities[key] * 100)}%</span></span>
                  <input type="range" min={0} max={1} step={0.05} value={state.intensities[key]} onChange={event => onIntensityChange(key, Number(event.target.value))} className="min-h-11 w-full" />
                </label>
              ))}
            </div>
          </Disclosure>
        )}
      </div>
    </div>
  );
}
