'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseIntent } from '@/lib/intent';
import { protectAssistiveCommand, validateCommand } from '@/lib/command';
import type { AccessibilityCommand, FilterState } from '@/types';

export type CommandSource = 'device' | 'model';
export interface CommandEntry { seq: number; transcript: string; explanation: string; source: CommandSource }
interface Options { getState: () => FilterState; onCommand: (command: AccessibilityCommand) => void; onUndo?: () => void }

async function askModel(transcript: string, currentState: FilterState, signal: AbortSignal): Promise<AccessibilityCommand> {
  const response = await fetch('/api/interpret', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, currentState }), signal,
  });
  const body = await response.json();
  if (!response.ok) throw new Error('Could not interpret that request. Try the reading controls or a shorter command.');
  const command = validateCommand(body);
  if (!command) throw new Error('Could not understand a valid adjustment. Try the reading controls.');
  return protectAssistiveCommand(command, transcript);
}

export function useCommandRunner({ getState, onCommand, onUndo }: Options) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<CommandEntry[]>([]);
  const [allowCloud, updateAllowCloud] = useState(false);
  const request = useRef<{ revision: number; controller: AbortController | null }>({ revision: 0, controller: null });

  const cancel = useCallback(() => {
    request.current.revision++;
    request.current.controller?.abort();
    request.current.controller = null;
    setPending(false);
    setError('');
  }, []);
  useEffect(() => () => { request.current.controller?.abort(); request.current.revision++; }, []);
  const setAllowCloud = useCallback((value: boolean) => { cancel(); updateAllowCloud(value); }, [cancel]);
  const record = useCallback((transcript: string, command: AccessibilityCommand, source: CommandSource) => {
    setEntries(prev => [{ seq: (prev[0]?.seq ?? 0) + 1, transcript, explanation: command.explanation, source }, ...prev].slice(0, 4));
  }, []);

  const handleUndo = useCallback((text: string): boolean => {
    if (!/^undo( last( change)?)?$/i.test(text)) return false;
    onUndo?.(); setEntries([]); return true;
  }, [onUndo]);

  const run = useCallback(async (transcript: string) => {
    cancel();
    const text = transcript.trim();
    if (text.length > 300) { setError('Keep commands to 300 characters or fewer.'); return; }
    if (!text) return;
    if (handleUndo(text)) return;
    const local = parseIntent(text, getState());
    if (local) { const safe = protectAssistiveCommand(local, text); onCommand(safe); record(text, safe, 'device'); return; }
    if (!allowCloud) { setError('Try “larger text” or use the reading controls. Optional cloud interpretation can handle other phrases.'); return; }
    const revision = request.current.revision;
    const controller = new AbortController();
    request.current.controller = controller;
    setPending(true);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const command = await askModel(text, getState(), controller.signal);
      if (controller.signal.aborted) return;
      onCommand(command); record(text, command, 'model');
    } catch {
      if (revision === request.current.revision) setError('Could not understand that adjustment. Use the reading controls or try again.');
    } finally {
      clearTimeout(timeout);
      if (revision === request.current.revision) { request.current.controller = null; setPending(false); }
    }
  }, [allowCloud, cancel, getState, handleUndo, onCommand, record]);
  const clearHistory = useCallback(() => { cancel(); setEntries([]); }, [cancel]);
  return { run, pending, error, entries, clearHistory, cancel, allowCloud, setAllowCloud };
}
