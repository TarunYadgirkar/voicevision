import { ThinkingLevel } from '@google/genai';
import type { GenerateContentConfig } from '@google/genai';

export const INTERPRET_MODEL = 'gemini-3.5-flash-lite';

// Thinking tokens count against maxOutputTokens on Gemini 3.x, so the cap leaves room for
// minimal reasoning plus the JSON command instead of truncating mid-object.
export function interpretConfig(systemInstruction: string): GenerateContentConfig {
  return {
    systemInstruction,
    responseMimeType: 'application/json',
    maxOutputTokens: 1024,
    temperature: 0.1,
    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
  };
}
