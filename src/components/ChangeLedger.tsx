'use client';
import { ArrowCounterClockwise, X } from '@phosphor-icons/react';
import { activeAdaptations, readingChanges } from '@/lib/adaptations';
import type { Adaptation, ReadingKey } from '@/lib/adaptations';
import type { FilterState } from '@/types';

interface Props {
  state: FilterState;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onRemove: (adaptation: Adaptation) => void;
  onReadingChange: (key: ReadingKey, value: number) => void;
}

export function ChangeLedger({ state, canUndo, onUndo, onReset, onRemove, onReadingChange }: Props) {
  const reading = readingChanges(state);
  const adaptations = activeAdaptations(state);
  const count = reading.length + adaptations.length;

  return (
    <div data-vv-controls className="flex flex-col gap-3 border-b border-line-soft px-5 py-4 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="changes-heading" className="type-label">
          {count === 0 ? 'No changes yet' : `${count} ${count === 1 ? 'change' : 'changes'} on this page`}
        </h2>
        <div className="flex gap-2">
          <button type="button" disabled={!canUndo} onClick={onUndo} className="button">
            <ArrowCounterClockwise size={18} aria-hidden />Undo
          </button>
          <button type="button" onClick={onReset} className="button">Reset all</button>
        </div>
      </div>
      {count === 0 ? (
        <p className="text-muted">Default size, spacing and light. Each change you make is marked here.</p>
      ) : (
        <ul aria-labelledby="changes-heading" className="flex flex-wrap gap-2">
          {reading.map(change => (
            <li key={change.key}>
              <button type="button" className="mark" onClick={() => onReadingChange(change.key, change.baseline)} aria-label={`Set ${change.label.toLowerCase()} back to default, now ${change.display}`}>
                {change.label} <span className="type-value">{change.display}</span><X size={14} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
          {adaptations.map(adaptation => (
            <li key={adaptation.id}>
              <button type="button" className="mark" onClick={() => onRemove(adaptation)} aria-label={`Turn off ${adaptation.label}`}>
                {adaptation.label}<X size={14} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
