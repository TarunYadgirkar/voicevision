'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

interface UseSpeechRecognitionReturn {
  listening: boolean;
  startListening: () => void;
  stopListening: () => void;
  supported: boolean;
  error: string;
}

type SpeechRecognitionWindow = typeof window & {
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

const noopSubscribe = () => () => {};
const getSupportSnapshot = () => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
const getServerSupportSnapshot = () => false;

// The result arrives as a callback rather than a `transcript` value. Saying the same
// phrase twice used to do nothing, because the second result set state to a string that
// was already there and the effect watching it never re-ran.
export function useSpeechRecognition(onResult: (text: string) => void, cancellationRevision = 0): UseSpeechRecognitionReturn {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const supported = useSyncExternalStore(noopSubscribe, getSupportSnapshot, getServerSupportSnapshot);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const revisionRef = useRef(cancellationRevision);

  useEffect(() => {
    onResultRef.current = onResult;
  });

  useLayoutEffect(() => {
    revisionRef.current = cancellationRevision;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.abort();
  }, [cancellationRevision]);
  useEffect(() => () => { const recognition = recognitionRef.current; recognitionRef.current = null; recognition?.abort(); }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || (window as SpeechRecognitionWindow).webkitSpeechRecognition;
    if (!SR) return;

    setError('');
    recognitionRef.current?.abort();

    const recognition = new SR() as SpeechRecognition;
    const startedRevision = revisionRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { if (recognitionRef.current === recognition) setListening(true); };
    recognition.onend = () => { if (!recognitionRef.current || recognitionRef.current === recognition) setListening(false); };
    recognition.onerror = event => {
      if (recognitionRef.current !== recognition || event.error === 'aborted') return;
      setListening(false);
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone permission denied. Allow microphone access in browser settings, or type a command.',
        'service-not-allowed': 'Speech service unavailable. Type a command or use the reading controls.',
        'audio-capture': 'No microphone found. Connect one, type a command, or use the reading controls.',
        'no-speech': 'No speech heard. Try again, type a command, or use the reading controls.',
        'network': 'Speech service connection failed. Type a command or use the reading controls.',
      };
      setError(messages[event.error] ?? 'Speech input failed. Type a command or use the reading controls.');
    };
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      if (recognitionRef.current !== recognition || startedRevision !== revisionRef.current) return;
      onResultRef.current(e.results[0][0].transcript);
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setError('Could not start microphone. Type a command or use the reading controls.'); setListening(false); }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { listening, startListening, stopListening, supported, error };
}
