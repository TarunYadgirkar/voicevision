import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { AccessibilityCommand, FilterState } from '@/types';
import { SYSTEM_PROMPT } from './prompt';
import { corsHeaders } from './cors';
import { checkRateLimit } from './rateLimit';

const MAX_TRANSCRIPT_CHARS = 300;

type InterpretedCommand = AccessibilityCommand & {
  colorAssist?: 'simulate' | 'correct' | null;
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function normalizeOffFlags(command: InterpretedCommand): void {
  const boolKeys = ['darkMode', 'highContrast', 'warmTone', 'invertColors', 'blur', 'dimOverlay', 'boldText', 'reduceMotion'] as const;
  const allKeys = ['colorMode', ...boolKeys, 'brightness', 'zoom', 'hemianopia', 'intensities'] as const;

  const hasPositive = allKeys.some((k) => {
    const v = command[k];
    return v !== null && v !== undefined && v !== false;
  });
  if (!hasPositive) return;

  for (const key of boolKeys) {
    if (command[key] === false) command[key] = null;
  }
}

function extractCommand(raw: string): InterpretedCommand | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]) as InterpretedCommand;
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);

  const rate = checkRateLimit(req);
  if (rate.limited) {
    return NextResponse.json(
      { error: 'Too many requests — try again in a moment' },
      { status: 429, headers: { ...headers, 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Voice interpretation is not configured on this server (GEMINI_API_KEY is unset).' },
      { status: 503, headers }
    );
  }

  let body: { transcript?: unknown; currentState?: FilterState };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400, headers });
  }

  const { transcript, currentState } = body;
  if (typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'transcript must be a non-empty string' }, { status: 400, headers });
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json(
      { error: `transcript must be ${MAX_TRANSCRIPT_CHARS} characters or fewer` },
      { status: 400, headers }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const userContent = currentState
      ? `currentState: ${JSON.stringify(currentState)}\ntranscript: ${transcript}`
      : transcript;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        maxOutputTokens: 384,
        temperature: 0.1,
      },
    });

    let raw = response.text ?? '';
    if (!raw.trim()) {
      const part = response.candidates?.[0]?.content?.parts?.find(
        (p: { thought?: boolean; text?: string }) => !p.thought && p.text
      );
      raw = part?.text ?? '';
    }

    const command = extractCommand(raw);
    if (!command) {
      console.error('No JSON in Gemini response:', raw);
      return NextResponse.json({ error: 'Failed to interpret command' }, { status: 500, headers });
    }

    normalizeOffFlags(command);
    return NextResponse.json(command, { headers });
  } catch (err: unknown) {
    console.error('Gemini error:', err);
    const errShape = err as { status?: number; httpStatusCode?: number } | null;
    const status = errShape?.status || errShape?.httpStatusCode || 500;
    if (status === 429) {
      return NextResponse.json(
        { error: 'Rate limit reached — try again in a minute' },
        { status: 429, headers: { ...headers, 'Retry-After': '60' } }
      );
    }
    return NextResponse.json({ error: 'Failed to interpret command' }, { status: 500, headers });
  }
}
