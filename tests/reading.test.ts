// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as filters from '@/lib/filters';
import { defaultFilterState } from '@/types';

const readingState = { ...defaultFilterState, textScale: 1.5, lineSpacing: 2 };

async function flushMutations() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

afterEach(() => {
  filters.applyReadingPreferences(defaultFilterState);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('reading styles', () => {
  it('enlarges editable text without changing words, selection or password fields', () => {
    document.body.innerHTML = '<textarea style="font-size:20px">Original words</textarea><input type="password" style="font-size:18px"><div contenteditable="true" style="font-size:20px">Draft</div>';
    const editor = document.querySelector('textarea')!;
    editor.setSelectionRange(2, 5);
    filters.applyReadingPreferences(readingState);
    expect(editor.style.fontSize).toBe('30px');
    expect(editor.value).toBe('Original words');
    expect(editor.selectionStart).toBe(2);
    expect(document.querySelector('input')!.style.fontSize).toBe('18px');
    expect(document.querySelector('div')!.style.fontSize).toBe('30px');
    filters.applyReadingPreferences(defaultFilterState);
    expect(editor.style.fontSize).toBe('20px');
  });
  it('wraps long lines on request and restores authored styles on reset', () => {
    document.body.innerHTML = '<pre style="font-size:18px;white-space:pre!important;overflow-wrap:normal">Keep\nthese words</pre>';
    const text = document.querySelector('pre')!;
    filters.applyReadingPreferences({ ...defaultFilterState, textWrap: true });
    expect(text.style.whiteSpace).toBe('pre-wrap');
    expect(text.style.overflowWrap).toBe('anywhere');
    expect(text.textContent).toBe('Keep\nthese words');
    filters.applyReadingPreferences(defaultFilterState);
    expect(text.style.whiteSpace).toBe('pre');
    expect(text.style.getPropertyPriority('white-space')).toBe('important');
    expect(text.style.overflowWrap).toBe('normal');
  });
  it('enlarges direct container text and restores its size', () => {
    document.body.innerHTML = '<div style="font-size:20px">Direct text</div>';
    const text = document.querySelector('div')!;
    filters.applyReadingPreferences(readingState);
    expect(text.style.fontSize).toBe('30px');
    filters.applyReadingPreferences(defaultFilterState);
    expect(text.style.fontSize).toBe('20px');
  });
  it('enlarges fixed-size text without compounding changes or affecting controls, then restores it', () => {
    document.body.innerHTML = '<p style="font-size:18px">Text</p><button><span style="font-size:16px">Control</span></button>';
    const text = document.querySelector('p')!;
    const control = document.querySelector('span')!;
    filters.applyReadingPreferences(readingState);
    expect(text.style.fontSize).toBe('27px');
    expect(text.style.lineHeight).toBe('2');
    expect(control.style.fontSize).toBe('16px');
    filters.applyReadingPreferences({ ...readingState, textScale: 2 });
    expect(text.style.fontSize).toBe('36px');
    filters.applyReadingPreferences(defaultFilterState);
    expect(text.style.fontSize).toBe('18px');
    expect(text.style.lineHeight).toBe('');
  });

  it('applies current preferences to a pasted paragraph without another command', async () => {
    filters.applyReadingPreferences(readingState);
    const paragraph = document.createElement('p');
    paragraph.style.fontSize = '20px';
    paragraph.textContent = 'Pasted text';
    document.body.append(paragraph);
    await flushMutations();
    expect(paragraph.style.fontSize).toBe('30px');
    expect(paragraph.style.lineHeight).toBe('2');
  });

  it('measures new nested text against original parent size, then restores inline priorities', async () => {
    document.body.innerHTML = '<p style="font-size:18px!important;line-height:1.4!important">Original</p>';
    const paragraph = document.querySelector('p')!;
    const span = document.createElement('span');
    const computedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      // jsdom omits inherited font sizes; browsers resolve them from the parent.
      if (element === span && !span.style.fontSize) return computedStyle(paragraph);
      return computedStyle(element);
    });
    filters.applyReadingPreferences(readingState);
    span.textContent = 'Added inline text';
    paragraph.append(span);
    await flushMutations();
    expect(span.style.fontSize).toBe('27px');
    filters.applyReadingPreferences({ ...readingState, textScale: 2 });
    expect(span.style.fontSize).toBe('36px');
    filters.applyReadingPreferences(defaultFilterState);
    expect(span.style.fontSize).toBe('');
    expect(paragraph.style.fontSize).toBe('18px');
    expect(paragraph.style.getPropertyPriority('font-size')).toBe('important');
    expect(paragraph.style.lineHeight).toBe('1.4');
    expect(paragraph.style.getPropertyPriority('line-height')).toBe('important');
  });

  it('disconnects on reset and leaves new content unchanged', async () => {
    filters.applyReadingPreferences(readingState);
    const paragraph = document.createElement('p');
    paragraph.style.fontSize = '20px';
    document.body.append(paragraph);
    filters.applyReadingPreferences(defaultFilterState);
    await flushMutations();
    expect(paragraph.style.fontSize).toBe('20px');
    const second = paragraph.cloneNode(true) as HTMLParagraphElement;
    document.body.append(second);
    await flushMutations();
    expect(second.style.fontSize).toBe('20px');
  });

  it('uses latest preferences for additions and does not observe its style writes', async () => {
    filters.applyReadingPreferences(readingState);
    filters.applyReadingPreferences({ ...readingState, textScale: 2, lineSpacing: 1.8 });
    const paragraph = document.createElement('p');
    paragraph.style.fontSize = '20px';
    const write = vi.spyOn(paragraph.style, 'setProperty');
    document.body.append(paragraph);
    await flushMutations();
    expect(paragraph.style.fontSize).toBe('40px');
    expect(paragraph.style.lineHeight).toBe('1.8');
    const writesAfterMutation = write.mock.calls.length;
    await flushMutations();
    expect(write.mock.calls.length).toBe(writesAfterMutation);
  });

  it('leaves dynamically inserted VoiceVision controls unchanged', async () => {
    filters.applyReadingPreferences(readingState);
    const controls = document.createElement('section');
    controls.dataset.vvControls = '';
    controls.innerHTML = '<p style="font-size:18px">Controls</p>';
    document.body.append(controls);
    await flushMutations();
    expect(controls.querySelector('p')!.style.fontSize).toBe('18px');
  });
});
