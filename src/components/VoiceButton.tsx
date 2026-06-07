'use client';
import { useEffect } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { AccessibilityCommand, FilterState } from '@/types';

interface Props {
  onCommand: (cmd: AccessibilityCommand) => void;
  onTranscript: (text: string) => void;
}

export function VoiceButton({ onCommand, onTranscript }: Props) {
  const { transcript, listening, startListening, supported } = useSpeechRecognition();

  useEffect(() => {
    if (!transcript) return;
    onTranscript(transcript);

    fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    })
      .then(r => r.json())
      .then(onCommand)
      .catch(console.error);
  }, [transcript]);

  if (!supported) {
    return <p className="text-red-400 text-sm">Voice not supported — use Chrome or Edge</p>;
  }

  return (
    <button
      onClick={startListening}
      disabled={listening}
      className={`px-8 py-4 rounded-full text-white font-semibold text-lg transition-all ${
        listening
          ? 'bg-red-500 animate-pulse scale-105'
          : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
      }`}
    >
      {listening ? '🎙️ Listening...' : '🎤 Tap to Speak'}
    </button>
  );
}
