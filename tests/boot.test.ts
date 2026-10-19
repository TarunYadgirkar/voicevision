// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { BOOT_SCRIPT, BOOT_STYLE_ID, STORAGE_KEY, saveState } from '@/lib/persistence';
import { defaultFilterState } from '@/types';

function boot(): string | null {
  document.getElementById(BOOT_STYLE_ID)?.remove();
  new Function(BOOT_SCRIPT)();
  return document.getElementById(BOOT_STYLE_ID)?.textContent ?? null;
}
afterEach(() => localStorage.clear());

it('paints the saved CSS filter before the app mounts, leaving out SVG colour filters', () => {
  saveState({ ...defaultFilterState, darkMode: true, highContrast: true, colorMode: 'deuteranopia' });
  const css = boot();
  expect(css).toContain('invert(93%)');
  expect(css).toContain('contrast(150%)');
  expect(css).not.toContain('url(');
});

it('paints nothing for default settings or a tampered filter', () => {
  saveState(defaultFilterState);
  expect(boot()).toBeNull();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state: defaultFilterState, boot: { filter: 'none}body{background:url(https://evil.test)' } }));
  expect(boot()).toBeNull();
});
