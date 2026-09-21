'use client';
import { useCallback, useState } from 'react';
import { parseIntent } from '@/lib/intent';
import { AccessibilityCommand, FilterState } from '@/types';

export type CommandSource = 'device' | 'model';

export interface CommandEntry {
  seq: number;
  transcript: string;
  explanation: string;
  source: CommandSource;
}

export interface CommandRunner {
  run: (transcript: string) => Promise<void>;
  pending: boolean;
  error: string;
  entries: CommandEntry[];
  clearHistory: () => void;
}

interface Options {
  getState: () => FilterState;
  onCommand: (command: AccessibilityCommand) => void;
}

const MAX_ENTRIES = 4;

async function askModel(transcript: string, currentState: FilterState): Promise<AccessibilityCommand> {
  const response = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, currentState }),
  });
  const body = await response.json();
  if (!response.ok || body?.error) {
    throw new Error(body?.error || 'The interpreter is not reachable right now.');
  }
  return body as AccessibilityCommand;
}

export function useCommandRunner({ getState, onCommand }: Options): CommandRunner {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<CommandEntry[]>([]);

  const record = useCallback((transcript: string, command: AccessibilityCommand, source: CommandSource) => {
    // A rising sequence number keys the list, so repeating a phrase still renders a
    // fresh entry instead of collapsing into the identical one above it.
    setEntries(prev => [
      { seq: (prev[0]?.seq ?? 0) + 1, transcript, explanation: command.explanation, source },
      ...prev,
    ].slice(0, MAX_ENTRIES));
  }, []);

  const run = useCallback(async (transcript: string) => {
    const text = transcript.trim();
    if (!text) return;
    setError('');

    const local = parseIntent(text, getState());
    if (local) {
      onCommand(local);
      record(text, local, 'device');
      return;
    }

    setPending(true);
    try {
      const command = await askModel(text, getState());
      onCommand(command);
      record(text, command, 'model');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The interpreter is not reachable right now.');
    } finally {
      setPending(false);
    }
  }, [getState, onCommand, record]);

  const clearHistory = useCallback(() => setEntries([]), []);

  return { run, pending, error, entries, clearHistory };
}
