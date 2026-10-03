import { normalizeFilterState } from '@/lib/persistence';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as persistence from '@/lib/persistence';
import { defaultFilterState } from '@/types';

afterEach(() => vi.unstubAllGlobals());

describe('restored preferences', () => {
  it('uses defaults for malformed fields and clamps finite values', () => {
    expect(persistence.normalizeFilterState({
      textScale: 20, lineSpacing: 1, brightness: 'bad', darkMode: 'yes',
      colorMode: 'unknown', intensities: { zoom: -2, blur: Number.NaN },
    })).toMatchObject({ textScale: 2, lineSpacing: 1.4, brightness: null,
      darkMode: false, colorMode: null, intensities: { zoom: 0, blur: 0.5 } });
  });

  it('never restores saved vision masks or simulations', () => {
    expect(persistence.normalizeFilterState({ zoom: 'center', hemianopia: 'left',
      colorAssist: 'simulate', colorMode: 'protanopia' })).toMatchObject({
      zoom: null, hemianopia: null, colorMode: null, colorAssist: 'correct',
    });
  });

  it('restores reading preferences from storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ version: 1,
      state: { ...defaultFilterState, textScale: 1.5, lineSpacing: 2 } }) });
    expect(persistence.loadState()).toMatchObject({ textScale: 1.5, lineSpacing: 2 });
  });

  it('ignores saved boot CSS before hydration', () => {
    const appendChild = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ version: 1,
      state: { darkMode: false }, boot: { dark: false, filter: 'url(#deuteranopia-simulate)' } }) });
    vi.stubGlobal('document', { head: { appendChild }, createElement: () => ({}),
      documentElement: { classList: { add: vi.fn() }, style: {} } });
    new Function(persistence.BOOT_SCRIPT)();
    expect(appendChild).not.toHaveBeenCalled();
  });
});

it('restores only a boolean wrapping preference', () => {
  expect(normalizeFilterState({ textWrap: true }).textWrap).toBe(true);
  expect(normalizeFilterState({ textWrap: 'true' }).textWrap).toBe(false);
});
