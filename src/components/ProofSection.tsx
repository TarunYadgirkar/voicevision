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
            ? `The same plate under a ${TYPE_LABELS[type].toLowerCase()} simulation, where the digit is not readable`
            : `The same plate after correction, where the digit 7 is readable`
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
    <section aria-labelledby="proof-heading" className="rounded-lg bg-raised p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="proof-heading" className="type-heading text-2xl sm:text-3xl">
          What correction actually does
        </h2>
        <div role="radiogroup" aria-label="Colour vision deficiency" className="flex gap-1 rounded-lg bg-sunken p-1">
          {DICHROMACY_TYPES.map(option => {
            const selected = option === type;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setType(option)}
                className={`rounded-md px-3 py-1.5 text-sm text-text transition-[background-color,box-shadow] duration-150
                  ${selected ? 'bg-raised shadow-[var(--shadow-raised)]' : 'hover:bg-line-soft'}`}
              >
                {TYPE_LABELS[option]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ProofPane
          type={type}
          assist="simulate"
          heading={`What a ${TYPE_LABELS[type].toLowerCase()} viewer sees`}
          note="The two hue families land on the same colour, so the digit has nothing left to stand out with."
        />
        <ProofPane
          type={type}
          assist="correct"
          heading="With VoiceVision correction"
          note="Daltonization pushes the lost signal into a channel these cones still read, and the 7 comes back."
        />
      </div>
    </section>
  );
}
