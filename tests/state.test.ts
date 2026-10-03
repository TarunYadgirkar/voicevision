// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useFilterState } from '@/hooks/useFilterState';
import { defaultFilterState } from '@/types';
afterEach(cleanup);
it('undo restores the entire previous settings snapshot', () => {
  const { result } = renderHook(() => useFilterState());
  act(() => result.current.reset());
  act(() => result.current.setReading('textScale', 1.5));
  expect(result.current.state.textScale).toBe(1.5);
  act(() => result.current.undo());
  expect(result.current.state).toEqual(defaultFilterState);
  expect(result.current.canUndo).toBe(true);
});
it('reset can be undone without losing earlier reading preferences', () => {
  const { result } = renderHook(() => useFilterState());
  act(() => result.current.setReading('lineSpacing', 2));
  act(() => result.current.reset());
  expect(result.current.state.lineSpacing).toBe(1.6);
  act(() => result.current.undo());
  expect(result.current.state.lineSpacing).toBe(2);
});
it('condition advice does not consume the previous undo snapshot', () => {
  const { result } = renderHook(() => useFilterState());
  act(() => result.current.reset());
  act(() => result.current.setReading('textScale', 1.5));
  act(() => result.current.apply({ colorMode: null, colorAssist: null, darkMode: null, highContrast: null, brightness: null, warmTone: null, invertColors: null, blur: null, hemianopia: null, zoom: null, dimOverlay: null, boldText: null, reduceMotion: null, intensities: null, reset: false, explanation: 'Choose settings.' }));
  act(() => result.current.undo());
  expect(result.current.state.textScale).toBe(1);
});
