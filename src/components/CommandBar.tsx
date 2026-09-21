'use client';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Cpu, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { VoiceButton } from './VoiceButton';
import { CommandEntry } from '@/hooks/useCommandRunner';

interface Props {
  onSubmit: (transcript: string) => void;
  onReset: () => void;
  pending: boolean;
  error: string;
  entries: CommandEntry[];
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
}

export function CommandBar({ onSubmit, onReset, pending, error, entries }: Props) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const micRef = useRef<HTMLButtonElement>(null);

  const handleShortcut = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onReset();
      return;
    }
    if (event.key === '/' && !isTypingTarget(event.target)) {
      event.preventDefault();
      inputRef.current?.focus();
    }
  }, [onReset]);

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [handleShortcut]);

  const submitDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onSubmit(draft);
    setDraft('');
  };

  const latest = entries[0];

  return (
    <div className="space-y-3">
      <form onSubmit={submitDraft} className="flex items-center gap-2.5">
        <VoiceButton onSubmit={onSubmit} pending={pending} buttonRef={micRef} />
        <div className="flex flex-1 items-center gap-1.5 rounded-full border border-line bg-raised pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-accent">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type how you see, such as I have deuteranopia"
            aria-label="Type a command"
            className="min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Apply this command"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent
              transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)]
              active:scale-96 disabled:bg-sunken disabled:text-faint"
          >
            <ArrowRight size={18} weight="bold" aria-hidden />
          </button>
        </div>
      </form>

      <p className="text-sm text-faint">
        Press <kbd className="rounded-sm bg-sunken px-1.5 py-0.5 text-text">/</kbd> to type,{' '}
        <kbd className="rounded-sm bg-sunken px-1.5 py-0.5 text-text">Space</kbd> on the microphone to listen, and{' '}
        <kbd className="rounded-sm bg-sunken px-1.5 py-0.5 text-text">Esc</kbd> to clear everything.
      </p>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-sunken p-3 text-sm text-text animate-rise">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-hot" aria-hidden />
          {error}
        </p>
      )}

      {latest && (
        <div className="animate-rise rounded-md bg-surface p-3" aria-live="polite">
          <p className="text-sm text-muted">You said &ldquo;{latest.transcript}&rdquo;</p>
          <p className="mt-1.5 flex items-start gap-2 text-sm text-text">
            {latest.source === 'device' ? (
              <Cpu size={18} weight="fill" className="mt-0.5 shrink-0 text-accent" aria-hidden />
            ) : (
              <Sparkle size={18} weight="fill" className="mt-0.5 shrink-0 text-accent" aria-hidden />
            )}
            <span>
              {latest.explanation}{' '}
              <span className="text-muted">
                {latest.source === 'device' ? 'Applied on device.' : 'Interpreted by the model.'}
              </span>
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
