'use client';
import { useRef } from 'react';
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

function summary(count: number): string {
  if (count === 0) return 'No changes yet';
  return `${count} ${count === 1 ? 'change' : 'changes'} on this page`;
}

export function ChangeLedger({ state, canUndo, onUndo, onReset, onRemove, onReadingChange }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reading = readingChanges(state);
  const adaptations = activeAdaptations(state);
  const count = reading.length + adaptations.length;

  // A removed chip takes its own button out of the DOM; park focus on the heading so
  // keyboard and screen-reader users are not dropped back to the top of the page.
  const removeAndKeepFocus = (action: () => void) => {
    action();
    headingRef.current?.focus();
  };

  const undo = () => {
    if (!canUndo) return;
    removeAndKeepFocus(onUndo);
  };

  return (
    <div data-vv-controls className="flex flex-col gap-3 border-b border-line-soft px-5 py-4 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="changes-heading" ref={headingRef} tabIndex={-1} className="type-label">{summary(count)}</h2>
        <p role="status" className="sr-only">{summary(count)}</p>
        <div className="flex gap-2">
          <button type="button" aria-disabled={!canUndo} onClick={undo} className="button aria-disabled:cursor-default aria-disabled:opacity-50">
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
              <button type="button" className="mark" onClick={() => removeAndKeepFocus(() => onReadingChange(change.key, change.baseline))}
                aria-label={`${change.label} ${change.display}, set back to default`}>
                {change.label} <span className="type-value">{change.display}</span><X size={14} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
          {adaptations.map(adaptation => (
            <li key={adaptation.id}>
              <button type="button" className="mark" onClick={() => removeAndKeepFocus(() => onRemove(adaptation))} aria-label={`${adaptation.label}, turn off`}>
                {adaptation.label}<X size={14} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
