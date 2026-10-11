import { describe, expect, it } from 'vitest';
import { ThinkingLevel } from '@google/genai';
import { INTERPRET_MODEL, interpretConfig } from '@/app/api/interpret/model';

describe('interpretation model', () => {
  it('uses a current Gemini Flash-Lite model', () => {
    expect(INTERPRET_MODEL).toBe('gemini-3.5-flash-lite');
  });

  it('keeps thinking minimal and leaves room for the JSON command', () => {
    const config = interpretConfig('prompt');
    expect(config.thinkingConfig?.thinkingLevel).toBe(ThinkingLevel.MINIMAL);
    expect(config.maxOutputTokens).toBeGreaterThanOrEqual(1024);
    expect(config.responseMimeType).toBe('application/json');
    expect(config.systemInstruction).toBe('prompt');
  });
});
