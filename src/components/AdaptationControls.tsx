'use client';
import { Check, X } from '@phosphor-icons/react';
import { activeAdaptations, activeIntensityKeys, adaptationsIn, INTENSITY_LABELS, isActive } from '@/lib/adaptations';
import type { Adaptation } from '@/lib/adaptations';
import type { ColorAssist, FilterIntensities, FilterState } from '@/types';

interface Props {
  state: FilterState;
  onToggle: (adaptation: Adaptation) => void;
  onRemove: (adaptation: Adaptation) => void;
  onIntensityChange: (key: keyof FilterIntensities, value: number) => void;
  onReadingChange: (key: 'textScale' | 'lineSpacing' | 'brightness', value: number) => void;
  onColorAssistChange: (assist: ColorAssist) => void;
  onReset: () => void;
}

function ToggleButton({ adaptation, active, onToggle }: { adaptation: Adaptation; active: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={active}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border p-3 text-left ${active ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:bg-surface'}`}>
      <span><span className="block font-medium">{adaptation.label}</span><span className="block text-sm text-muted">{adaptation.hint}</span></span>
      <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${active ? 'bg-accent text-on-accent' : 'border border-line'}`}>
        {active && <Check size={15} weight="bold" />}
      </span>
    </button>
  );
}

export function AdaptationControls({ state, onToggle, onRemove, onIntensityChange, onReadingChange, onColorAssistChange }: Props) {
  const active = activeAdaptations(state);
  const intensityKeys = activeIntensityKeys(state);
  const readingControls = [
    { key: 'textScale' as const, label: 'Text size', min: 1, max: 2, step: 0.05, value: state.textScale, display: `${Math.round(state.textScale * 100)}%` },
    { key: 'lineSpacing' as const, label: 'Line spacing', min: 1.4, max: 2.4, step: 0.1, value: state.lineSpacing, display: `${state.lineSpacing.toFixed(1)}×` },
    { key: 'brightness' as const, label: 'Brightness', min: 0.3, max: 1.5, step: 0.05, value: state.brightness ?? 1, display: `${Math.round((state.brightness ?? 1) * 100)}%` },
  ];
  return (
    <div className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="type-heading mb-3 text-xl">Reading comfort</legend>
        {readingControls.map(control => (
          <div key={control.key}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label htmlFor={`reading-${control.key}`} className="font-medium">{control.label}</label>
              <output htmlFor={`reading-${control.key}`} className="type-value text-muted">{control.display}</output>
            </div>
            <input id={`reading-${control.key}`} type="range" min={control.min} max={control.max} step={control.step}
              value={control.value} aria-valuetext={control.display} onChange={event => onReadingChange(control.key, Number(event.target.value))}
              className="min-h-11 w-full cursor-pointer" />
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-2">
          {[...adaptationsIn('comfort'), ...adaptationsIn('field').filter(adaptation => adaptation.id === 'zoom-full')].map(adaptation => (
            <ToggleButton key={adaptation.id} adaptation={adaptation} active={isActive(state, adaptation)} onToggle={() => onToggle(adaptation)} />
          ))}
        </div>
      </fieldset>

      <details className="rounded-lg border border-line p-4">
        <summary className="font-medium">Colour adjustments</summary>
        <p className="mt-3 text-sm text-muted">Try an adjustment and keep it only if it helps you distinguish colours. Results vary by person and content.</p>
        <fieldset className="my-3 flex flex-wrap gap-3">
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
      </details>

      {intensityKeys.length > 0 && <details className="rounded-lg border border-line p-4">
        <summary className="font-medium">Fine-tune active adjustments</summary>
        <div className="mt-4 space-y-3">
          {intensityKeys.map(key => (
            <label key={key} className="block">
              <span className="flex justify-between gap-3">{INTENSITY_LABELS[key]}<span className="type-value">{Math.round(state.intensities[key] * 100)}%</span></span>
              <input type="range" min={0} max={1} step={0.05} value={state.intensities[key]} onChange={event => onIntensityChange(key, Number(event.target.value))} className="min-h-11 w-full" />
            </label>
          ))}
        </div>
      </details>}

      <div aria-label="Active adjustments" className="flex flex-wrap gap-2">
        {active.length === 0 ? <p className="text-sm text-muted">No colour or comfort filters enabled.</p> : active.map(adaptation => (
          <button key={adaptation.id} type="button" onClick={() => onRemove(adaptation)} aria-label={`Turn off ${adaptation.label}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent bg-accent-soft px-3 text-sm">
            {adaptation.label}<X size={16} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
