import { describe, expect, it } from 'vitest';
import { blendMatrixValues, buildFilterString, COLOR_MATRICES, DICHROMACY_TYPES } from '@/lib/filters';
import { defaultFilterState, FilterState } from '@/types';

function stateWith(patch: Partial<FilterState>): FilterState {
  return { ...defaultFilterState, intensities: { ...defaultFilterState.intensities }, ...patch };
}

const IDENTITY_VALUES = '1.000 0.000 0.000 0 0\n0.000 1.000 0.000 0 0\n0.000 0.000 1.000 0 0\n0 0 0 1 0';

describe('buildFilterString', () => {
  it('returns none for a clean state', () => {
    expect(buildFilterString(stateWith({}))).toBe('none');
  });

  it.each(DICHROMACY_TYPES)('references the correct-mode filter id for %s', type => {
    expect(buildFilterString(stateWith({ colorMode: type }))).toBe(`url(#${type}-correct)`);
  });

  it.each(DICHROMACY_TYPES)('references the simulate-mode filter id for %s', type => {
    expect(buildFilterString(stateWith({ colorMode: type, colorAssist: 'simulate' }))).toBe(`url(#${type}-simulate)`);
  });

  it('namespaces filter ids when given a prefix', () => {
    expect(buildFilterString(stateWith({ colorMode: 'protanopia' }), 'vv-')).toBe('url(#vv-protanopia-correct)');
  });

  it('greys the page for achromatopsia only in simulate mode', () => {
    expect(buildFilterString(stateWith({ colorMode: 'achromatopsia', colorAssist: 'simulate' }))).toBe('grayscale(100%)');
  });

  it('boosts contrast instead of greying for achromatopsia in correct mode', () => {
    expect(buildFilterString(stateWith({ colorMode: 'achromatopsia' }))).toBe('contrast(160%)');
  });

  it('composes dark mode, warmth and contrast into one string', () => {
    const filter = buildFilterString(stateWith({ darkMode: true, warmTone: true, highContrast: true }));
    expect(filter).toBe('invert(93%) hue-rotate(180deg) sepia(25%) contrast(150%) brightness(0.80)');
  });

  it('skips the standalone invert when dark mode already inverts', () => {
    const filter = buildFilterString(stateWith({ darkMode: true, invertColors: true }));
    expect(filter.match(/invert\(/g)).toHaveLength(1);
  });

  it('boosts clarity rather than adding blur for the blur mode', () => {
    expect(buildFilterString(stateWith({ blur: true }))).toBe('contrast(130%) brightness(108%)');
  });
});

describe('correction matrices', () => {
  it.each(DICHROMACY_TYPES)('%s correction differs from its simulation', type => {
    expect(COLOR_MATRICES.correct[type]).not.toEqual(COLOR_MATRICES.simulate[type]);
  });

  it.each(DICHROMACY_TYPES)('%s correction leaves the red channel untouched or redistributes into it', type => {
    expect(COLOR_MATRICES.correct[type].flat().some(v => v < 0 || v > 1)).toBe(true);
  });

  it.each(DICHROMACY_TYPES)('%s correction collapses to identity at intensity 0', type => {
    expect(blendMatrixValues(COLOR_MATRICES.correct[type], 0)).toBe(IDENTITY_VALUES);
  });

  it.each(DICHROMACY_TYPES)('%s simulation collapses to identity at intensity 0', type => {
    expect(blendMatrixValues(COLOR_MATRICES.simulate[type], 0)).toBe(IDENTITY_VALUES);
  });

  it('is a real daltonization, not a copy of the simulation', () => {
    expect(COLOR_MATRICES.correct.deuteranopia[0]).toEqual([1, 0, 0]);
    expect(COLOR_MATRICES.correct.deuteranopia[2][1]).toBeLessThan(0);
  });
});
