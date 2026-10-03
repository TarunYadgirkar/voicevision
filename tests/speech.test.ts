// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
const speechInstances: MockSpeech[] = [];
let emitError: (error: string) => void;
class MockSpeech {
  constructor() { speechInstances.push(this); }
  onresult?: (event: { results: { transcript: string }[][] }) => void;
  onerror?: (event: { error: string }) => void;
  start() { emitError = error => this.onerror?.({ error }); }
  abort = vi.fn();
  stop() {}
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('exposes actionable microphone permission errors', () => {
  vi.stubGlobal('SpeechRecognition', MockSpeech);
  const { result } = renderHook(() => useSpeechRecognition(vi.fn()));
  act(() => result.current.startListening());
  act(() => emitError('not-allowed'));
  expect(result.current.error).toMatch(/microphone|permission/i);
  expect(result.current.error).toMatch(/type|controls/i);
});

it('ignores late results after a newer action', () => {
  vi.stubGlobal('SpeechRecognition', MockSpeech);
  const onResult = vi.fn();
  const { result, rerender } = renderHook(({ revision }) => useSpeechRecognition(onResult, revision), { initialProps: { revision: 0 } });
  act(() => result.current.startListening());
  const old = speechInstances.at(-1)!;
  rerender({ revision: 1 });
  act(() => old.onresult?.({ results: [[{ transcript: 'dark mode' }]] }));
  expect(old.abort).toHaveBeenCalled();
  expect(onResult).not.toHaveBeenCalled();
});
