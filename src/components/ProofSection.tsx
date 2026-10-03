'use client';
import { useState } from 'react';
import { IshiharaPlate } from './IshiharaPlate';
import { DICHROMACY_TYPES, DichromacyType } from '@/lib/filters';

const TYPE_LABELS: Record<DichromacyType, string> = {
  deuteranopia: 'Deuteranopia',
  protanopia: 'Protanopia',
  tritanopia: 'Tritanopia',
};

interface PaneProps {
  type: DichromacyType;
  assist: 'simulate' | 'correct';
  heading: string;
  note: string;
}

function ProofPane({ type, assist, heading, note }: PaneProps) {
  return (
    <figure className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <IshiharaPlate
        type={type}
        scopedFilterId={`${type}-${assist}`}
        title={
          assist === 'simulate'
            ? `A coloured dot plate with digit 7 under a ${TYPE_LABELS[type].toLowerCase()} simulation`
            : `A coloured dot plate with digit 7 after colour adjustment`
        }
        className="mx-auto w-full max-w-72"
      />
      <figcaption>
        <h3 className="type-heading text-lg">{heading}</h3>
        <p className="type-body mt-1 text-sm text-muted">{note}</p>
      </figcaption>
    </figure>
  );
}

export function ProofSection() {
  const [type, setType] = useState<DichromacyType>('deuteranopia');

  return (
    <details className="workspace-card">
      <summary id="proof-heading" className="type-heading text-xl">Explore colour adjustments</summary>
      <p className="type-body my-4 text-muted">An educational comparison of two filters. It is not a vision test, and cannot predict how an individual will see these colours.</p>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-2 font-medium">Choose a colour simulation</legend>
        {DICHROMACY_TYPES.map(option => (
          <label key={option} className="flex min-h-11 items-center gap-2 rounded-lg bg-surface px-3">
            <input type="radio" name="proof-colour" value={option} checked={option === type} onChange={() => setType(option)} />
            {TYPE_LABELS[option]}
          </label>
        ))}
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ProofPane
          type={type}
          assist="simulate"
          heading="Simulation"
          note="Approximates a colour-confusion pattern. Real vision varies, and screen colours affect the result."
        />
        <ProofPane
          type={type}
          assist="correct"
          heading="Colour adjustment"
          note="Redistributes colour differences. Try it on your own content and decide whether it helps."
        />
      </div>
    </details>
  );
}
