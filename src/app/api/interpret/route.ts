import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { AccessibilityCommand, FilterState } from '@/types';
import { validateCommand, protectAssistiveCommand } from '@/lib/command';
import { normalizeFilterState } from '@/lib/persistence';
import { SYSTEM_PROMPT } from './prompt';
import { corsHeaders } from './cors';
import { checkRateLimit } from './rateLimit';

const MAX_TRANSCRIPT_CHARS = 300;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function extractCommand(raw: string): AccessibilityCommand | null {
  return validateCommand(JSON.parse(raw));
}

type ParsedBody = { transcript: string; currentState?: FilterState };

async function readBody(req: NextRequest): Promise<ParsedBody | string> {
  let body: { transcript?: unknown; currentState?: FilterState };
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'Expected a JSON object';
    body = parsed as typeof body;
  } catch {
    return 'Expected a JSON body';
  }
  const { transcript, currentState } = body;
  if (typeof transcript !== 'string' || !transcript.trim()) return 'transcript must be a non-empty string';
  if (transcript.length > MAX_TRANSCRIPT_CHARS) return `transcript must be ${MAX_TRANSCRIPT_CHARS} characters or fewer`;
  return { transcript: transcript.trim(), currentState: currentState ? normalizeFilterState(currentState) : undefined };
}

async function askGemini(apiKey: string, { transcript, currentState }: ParsedBody): Promise<string> {
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
  const raw = response.text ?? '';
  if (raw.trim()) return raw;
  const part = response.candidates?.[0]?.content?.parts?.find(
    (p: { thought?: boolean; text?: string }) => !p.thought && p.text
  );
  return part?.text ?? '';
}

function upstreamErrorResponse(err: unknown, headers: Record<string, string>) {
  console.error('Interpretation service failed');
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

  const body = await readBody(req);
  if (typeof body === 'string') return NextResponse.json({ error: body }, { status: 400, headers });

  try {
    const raw = await askGemini(apiKey, body);
    const command = extractCommand(raw);
    if (!command) {
      console.error('Invalid interpretation response');
      return NextResponse.json({ error: 'Failed to interpret command' }, { status: 500, headers });
    }
    return NextResponse.json(protectAssistiveCommand(command, body.transcript), { headers });
  } catch (err: unknown) {
    return upstreamErrorResponse(err, headers);
  }
}
