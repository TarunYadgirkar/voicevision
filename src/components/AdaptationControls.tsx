'use client';
import { Check, Eye, Eyedropper, X } from '@phosphor-icons/react';
import {
  ADAPTATION_GROUPS,
  Adaptation,
  INTENSITY_LABELS,
  activeAdaptations,
  activeIntensityKeys,
  adaptationsIn,
  isActive,
} from '@/lib/adaptations';
import { ColorAssist, FilterIntensities, FilterState } from '@/types';

interface Props {
  state: FilterState;
  onToggle: (adaptation: Adaptation) => void;
  onRemove: (adaptation: Adaptation) => void;
  onIntensityChange: (key: keyof FilterIntensities, value: number) => void;
  onColorAssistChange: (assist: ColorAssist) => void;
  onReset: () => void;
}

const ASSIST_OPTIONS: { value: ColorAssist; label: string; hint: string }[] = [
  { value: 'correct', label: 'Correct my vision', hint: 'Separates the hues you cannot tell apart' },
  { value: 'simulate', label: 'Preview the deficiency', hint: 'Shows a designer what gets lost' },
];

function ActiveChips({ state, onRemove, onReset }: Pick<Props, 'state' | 'onRemove' | 'onReset'>) {
  const active = activeAdaptations(state);

  if (active.length === 0) {
    return <p className="text-sm text-muted">Nothing is switched on. Speak, type, or pick an adaptation below.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map(adaptation => (
        <span
          key={adaptation.id}
          className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1 text-sm text-text"
        >
          {adaptation.label}
          <button
            type="button"
            onClick={() => onRemove(adaptation)}
            aria-label={`Turn off ${adaptation.label}`}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted
              transition-[background-color,color] duration-150 hover:bg-raised hover:text-text active:scale-96"
          >
            <X size={13} weight="bold" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="ml-1 rounded-full px-3 py-1 text-sm text-muted transition-colors duration-150 hover:bg-sunken hover:text-text"
      >
        Clear everything
      </button>
    </div>
  );
}

function AssistSwitch({ value, onChange }: { value: ColorAssist; onChange: (assist: ColorAssist) => void }) {
  return (
    <div role="radiogroup" aria-label="What the colour filter should do" className="flex gap-1 rounded-lg bg-sunken p-1">
      {ASSIST_OPTIONS.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-md px-3 py-2 text-left transition-[background-color,box-shadow] duration-150
              ${selected ? 'bg-raised shadow-[var(--shadow-raised)]' : 'hover:bg-line-soft'}`}
          >
            <span className="flex items-center gap-1.5 text-sm text-text">
              {option.value === 'correct' ? <Eye size={16} weight={selected ? 'fill' : 'regular'} aria-hidden /> : <Eyedropper size={16} weight={selected ? 'fill' : 'regular'} aria-hidden />}
              {option.label}
            </span>
            <span className="mt-0.5 block text-sm text-muted">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

function ToggleButton({ adaptation, active, onToggle }: { adaptation: Adaptation; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left
        transition-[background-color,box-shadow,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-96
        ${active ? 'bg-accent-soft ring-1 ring-accent' : 'bg-raised hover:bg-surface'}`}
    >
      <span className="min-w-0">
        <span className="block text-sm text-text">{adaptation.label}</span>
        <span className="block text-sm text-muted">{adaptation.hint}</span>
      </span>
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-150
          ${active ? 'bg-accent text-on-accent' : 'bg-sunken text-transparent'}`}
      >
        <Check size={12} weight="bold" />
      </span>
    </button>
  );
}

function IntensitySliders({ state, onIntensityChange }: Pick<Props, 'state' | 'onIntensityChange'>) {
  const keys = activeIntensityKeys(state);
  if (keys.length === 0) return null;

  return (
    <div className="space-y-2.5 rounded-lg bg-surface p-3">
      {keys.map(key => (
        <label key={key} className="flex items-center gap-3 text-sm text-text">
          <span className="w-24 shrink-0 sm:w-32">{INTENSITY_LABELS[key]}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={state.intensities[key]}
            onChange={e => onIntensityChange(key, Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer"
          />
          <span className="type-value w-10 shrink-0 text-right text-muted">
            {Math.round(state.intensities[key] * 100)}%
          </span>
        </label>
      ))}
    </div>
  );
}

export function AdaptationControls({ state, onToggle, onRemove, onIntensityChange, onColorAssistChange, onReset }: Props) {
  return (
    <div className="space-y-4">
      <ActiveChips state={state} onRemove={onRemove} onReset={onReset} />
      <AssistSwitch value={state.colorAssist} onChange={onColorAssistChange} />
      <IntensitySliders state={state} onIntensityChange={onIntensityChange} />

      <div className="space-y-2.5">
        {ADAPTATION_GROUPS.map(group => (
          <div key={group} className="grid gap-1 rounded-lg bg-sunken p-1 sm:grid-cols-2">
            {adaptationsIn(group).map(adaptation => (
              <ToggleButton
                key={adaptation.id}
                adaptation={adaptation}
                active={isActive(state, adaptation)}
                onToggle={() => onToggle(adaptation)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
