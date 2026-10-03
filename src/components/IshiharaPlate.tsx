'use client';
import { useMemo } from 'react';
import { DichromacyType } from '@/lib/filters';
import { PLATE_PALETTES, dotColor, generatePlate } from '@/lib/plate';

interface Props {
  type: DichromacyType;
  /** Applies one of FilterOverlay's SVG filters to this plate only. */
  scopedFilterId?: string;
  drift?: boolean;
  className?: string;
  title: string;
}

// The plate layout is generated once and memoised, so the hero and both proof panes show
// the identical plate and the only difference between them is the filter on top.
// The wrapper carries the dark-mode counter-invert; the inner svg carries the scoped
// filter, so the two never overwrite each other.
export function IshiharaPlate({ type, scopedFilterId, drift = false, className = '', title }: Props) {
  const dots = useMemo(() => generatePlate({ glyph: '7' }), []);
  const palette = PLATE_PALETTES[type];

  return (
    <div className={`vv-truecolor ${drift ? 'animate-plate-drift' : ''} ${className}`}>
      <svg
        viewBox="0 0 1000 1000"
        role="img"
        aria-label={title}
        className="w-full h-full"
        style={scopedFilterId ? { filter: `url(#${scopedFilterId})` } : undefined}
      >
        <circle cx="500" cy="500" r="499" fill="var(--plate-bg)" />
        {dots.map((dot, i) => (
          <circle key={i} cx={(dot.x * 1000).toFixed(3)} cy={(dot.y * 1000).toFixed(3)} r={(dot.r * 1000).toFixed(3)} fill={dotColor(dot, palette)} />
        ))}
      </svg>
    </div>
  );
}
