'use client';
import { RefObject } from 'react';
import { CircleNotch, Microphone, WarningCircle, Waveform } from '@phosphor-icons/react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface Props {
  onSubmit: (transcript: string) => void;
  pending: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}

const ICON_BASE =
  'absolute inset-0 m-auto transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]';

function iconState(visible: boolean): string {
  return visible ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-25 blur-[4px]';
}

export function VoiceButton({ onSubmit, pending, buttonRef }: Props) {
  const { listening, startListening, stopListening, supported } = useSpeechRecognition(onSubmit);

  if (!supported) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-sunken px-3 py-2.5 text-sm text-muted">
        <WarningCircle size={18} weight="regular" className="shrink-0" aria-hidden />
        Speech input needs Chrome or Edge. Typing works everywhere.
      </div>
    );
  }

  const label = listening ? 'Stop listening' : 'Speak a command';

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={listening ? stopListening : startListening}
      disabled={pending}
      aria-pressed={listening}
      aria-label={label}
      className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full
        transition-[background-color,color,box-shadow,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)]
        active:scale-96 disabled:opacity-50
        ${listening
          ? 'animate-listening bg-accent text-on-accent'
          : 'bg-sunken text-text hover:bg-line-soft'}`}
    >
      <span className="relative block h-6 w-6">
        <Microphone size={24} weight="fill" aria-hidden className={`${ICON_BASE} ${iconState(!listening && !pending)}`} />
        <Waveform size={24} weight="bold" aria-hidden className={`${ICON_BASE} ${iconState(listening)}`} />
        <CircleNotch size={24} weight="bold" aria-hidden className={`${ICON_BASE} ${iconState(pending)} animate-spin`} />
      </span>
    </button>
  );
}
