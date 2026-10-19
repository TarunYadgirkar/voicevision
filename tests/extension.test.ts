// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
let handler: (message: unknown, sender: object, reply: (value: unknown) => void) => void;
let storageChanged: (changes: Record<string, { newValue: unknown }>, area: string) => void;
let stored: Record<string, unknown>;
beforeEach(async () => {
  vi.resetModules();
  stored = {};
  document.body.innerHTML = '<p style="font-size:20px">Reading content</p>';
  document.body.style.filter = 'saturate(80%)';
  document.documentElement.style.colorScheme = 'light';
  delete window.__voicevisionInjected;
  vi.stubGlobal('chrome', {
    runtime: { onMessage: { addListener: (listener: typeof handler) => { handler = listener; } }, onConnect: { addListener: vi.fn() } },
    storage: { local: {
      get: (_key: unknown, callback: (value: object) => void) => callback(stored),
      set: (value: object) => { Object.assign(stored, value); },
    }, onChanged: { addListener: (listener: typeof storageChanged) => { storageChanged = listener; } } },
  });
  await import('@/extension/content');
});
afterEach(() => { send({ type: 'APPLY_COMMAND', command: { reset: true } }); vi.unstubAllGlobals(); });
function send(message: unknown): Record<string, unknown> {
  let response: unknown;
  handler(message, {}, value => { response = value; });
  return response as Record<string, unknown>;
}
it('typed commands adjust text, undo restores it, condition advice does not consume undo', () => {
  send({ type: 'vv:interpret', transcript: 'larger text' });
  expect(document.querySelector('p')!.style.fontSize).toBe('24px');
  send({ type: 'vv:interpret', transcript: 'blind in my left eye' });
  send({ type: 'UNDO' });
  expect(document.querySelector('p')!.style.fontSize).toBe('20px');
});
it('turns magnification off independently', () => {
  send({ type: 'vv:interpret', transcript: 'magnify' });
  expect(document.documentElement.style.zoom).not.toBe('');
  send({ type: 'vv:interpret', transcript: 'turn off zoom' });
  expect(document.documentElement.style.zoom).toBe('');
});
it('rejects stale replies and never introduces a field-loss mask', () => {
  const unhandled = send({ type: 'vv:interpret', transcript: 'unusual command' });
  send({ type: 'SET_READING', key: 'textScale', value: 1.5 });
  expect(send({ type: 'APPLY_COMMAND', command: { reset: false, darkMode: true }, expectedRevision: unhandled.revision })).toHaveProperty('error');
  send({ type: 'APPLY_COMMAND', command: { reset: false, zoom: 'peripheral', hemianopia: 'left' }, transcript: 'simulate glaucoma' });
  expect(document.getElementById('vv-hemianopia-overlay')).toBeNull();
  expect(document.getElementById('vv-zoom-overlay')).toBeNull();
});
it('preserves original page filter and color scheme when inactive and after reset', () => {
  expect(document.body.style.filter).toBe('saturate(80%)');
  send({ type: 'vv:interpret', transcript: 'dark mode' });
  send({ type: 'APPLY_COMMAND', command: { reset: true } });
  expect(document.body.style.filter).toBe('saturate(80%)');
  expect(document.documentElement.style.colorScheme).toBe('light');
});

it('preserves undo when a repeated command changes nothing', async () => {
  await import('@/extension/content');
  send({ type: 'vv:interpret', transcript: 'dark mode' });
  send({ type: 'vv:interpret', transcript: 'dark mode' });
  expect(send({ type: 'UNDO' }).darkMode).toBe(false);
});

it('ignores own storage echoes with reordered object keys', () => {
  send({ type: 'vv:interpret', transcript: 'larger text' });
  const current = send({ type: 'GET_STATE' });
  const reordered = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  storageChanged({ vvState: { newValue: reordered } }, 'local');
  send({ type: 'UNDO' });
  expect(document.querySelector('p')!.style.fontSize).toBe('20px');
});

it('toggles wrapping off and restores authored whitespace', () => {
  document.body.innerHTML = '<pre style="white-space:pre">Original</pre>';
  send({ type: 'APPLY_COMMAND', command: { reset: false, textWrap: true } });
  expect(document.querySelector('pre')!.style.whiteSpace).toBe('pre-wrap');
  send({ type: 'TOGGLE_FILTER', key: 'textWrap' });
  expect(document.querySelector('pre')!.style.whiteSpace).toBe('pre');
});

it('switching off restores the page, keeps settings and blocks changes until switched on', () => {
  send({ type: 'vv:interpret', transcript: 'larger text' });
  send({ type: 'vv:interpret', transcript: 'dark mode' });
  const off = send({ type: 'vv:enabled', enabled: false });
  expect(off).toMatchObject({ enabled: false, state: { darkMode: true, textScale: 1.2 } });
  expect(stored.vvEnabled).toBe(false);
  expect(document.querySelector('p')!.style.fontSize).toBe('20px');
  expect(document.body.style.filter).toBe('saturate(80%)');
  expect(document.documentElement.style.colorScheme).toBe('light');
  expect(send({ type: 'vv:interpret', transcript: 'bold text' })).toHaveProperty('error');
  expect(send({ type: 'UNDO' })).toHaveProperty('error');
  send({ type: 'vv:enabled', enabled: true });
  expect(document.querySelector('p')!.style.fontSize).toBe('24px');
  expect(document.documentElement.style.colorScheme).toBe('dark');
});

it('follows the switch when another tab changes it', () => {
  send({ type: 'vv:interpret', transcript: 'larger text' });
  storageChanged({ vvEnabled: { newValue: false } }, 'local');
  expect(document.querySelector('p')!.style.fontSize).toBe('20px');
  expect(send({ type: 'vv:enabled' })).toMatchObject({ enabled: false });
  storageChanged({ vvEnabled: { newValue: true } }, 'local');
  expect(document.querySelector('p')!.style.fontSize).toBe('24px');
});

it('ignores unknown message types, including inherited object keys', () => {
  expect(send({ type: 'toString' })).toBeUndefined();
  expect(send({ type: 'DELETE_EVERYTHING' })).toBeUndefined();
});
