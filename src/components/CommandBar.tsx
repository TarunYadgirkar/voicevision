'use client';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Cpu, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { VoiceButton } from './VoiceButton';
import { CommandEntry } from '@/hooks/useCommandRunner';

interface Props {
  onSubmit: (transcript: string) => void;
  pending: boolean;
  cancellationRevision: number;
  error: string;
  entries: CommandEntry[];
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
}

export function CommandBar({ onSubmit, pending, error, entries, cancellationRevision }: Props) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const micRef = useRef<HTMLButtonElement>(null);

  const handleShortcut = useCallback((event: KeyboardEvent) => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(event.target)) {
      event.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [handleShortcut]);

  const submitDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onSubmit(draft);
    setDraft('');
    inputRef.current?.focus();
  };

  const latest = entries[0];

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submitDraft} className="flex flex-wrap items-start gap-3">
        <VoiceButton onSubmit={onSubmit} pending={pending} cancellationRevision={cancellationRevision} buttonRef={micRef} />
        <div className="flex min-w-[13rem] flex-1 items-center gap-1.5 self-center rounded-full bg-raised py-1.5 pl-5 pr-1.5 shadow-[var(--shadow-raised)] ring-1 ring-line focus-within:ring-2 focus-within:ring-text">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="What is hard to see?"
            maxLength={300}
            aria-label="Describe what is hard to see"
            aria-describedby="command-hint"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-lg text-text placeholder:text-muted focus:outline-none focus-visible:shadow-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Apply"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent
              transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)]
              active:scale-96 disabled:bg-sunken disabled:text-muted"
          >
            <ArrowRight size={20} weight="bold" aria-hidden />
          </button>
        </div>
      </form>

      <p id="command-hint" className="text-sm text-muted">
        Press <kbd>/</kbd> to type, or <kbd>Space</kbd> on the microphone to speak.
      </p>

      {error && (
        <p role="alert" className="animate-rise flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-text">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-danger" aria-hidden />
          {error}
        </p>
      )}

      <div role="status" aria-live="polite" aria-atomic="true">{latest && (
        <div key={latest.seq} className="animate-rise flex flex-col gap-1 rounded-md bg-raised p-3 shadow-[var(--shadow-raised)]">
          <p className="text-sm text-muted">You said &ldquo;{latest.transcript}&rdquo;</p>
          <p className="flex items-start gap-2 text-text">
            {latest.source === 'device' ? (
              <Cpu size={18} weight="fill" className="mt-1 shrink-0" aria-hidden />
            ) : (
              <Sparkle size={18} weight="fill" className="mt-1 shrink-0" aria-hidden />
            )}
            <span>
              {latest.explanation}{' '}
              <span className="text-sm text-muted">
                {latest.source === 'device' ? 'Understood on this device.' : 'Understood by Gemini.'}
              </span>
            </span>
          </p>
        </div>
      )}</div>
    </div>
  );
}
