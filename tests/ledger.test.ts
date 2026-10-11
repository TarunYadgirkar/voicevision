import { describe, expect, it } from 'vitest';
import { formatReading, readingChanges } from '@/lib/adaptations';
import { defaultFilterState } from '@/types';

describe('reading changes', () => {
  it('reports nothing for the default state', () => {
    expect(readingChanges(defaultFilterState)).toEqual([]);
  });

  it('reports only values moved away from their baseline', () => {
    const changes = readingChanges({ ...defaultFilterState, textScale: 1.5, brightness: 0.8 });
    expect(changes.map(change => [change.key, change.display])).toEqual([
      ['textScale', '150%'],
      ['brightness', '80%'],
    ]);
  });

  it('treats brightness of 100% as unchanged', () => {
    expect(readingChanges({ ...defaultFilterState, brightness: 1 })).toEqual([]);
  });

  it('formats line spacing as a multiplier', () => {
    expect(formatReading('lineSpacing', 1.8)).toBe('1.8×');
  });
});
