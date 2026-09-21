'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

interface UseSpeechRecognitionReturn {
  listening: boolean;
  startListening: () => void;
  stopListening: () => void;
  supported: boolean;
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
export function useSpeechRecognition(onResult: (text: string) => void): UseSpeechRecognitionReturn {
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(noopSubscribe, getSupportSnapshot, getServerSupportSnapshot);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || (window as SpeechRecognitionWindow).webkitSpeechRecognition;
    if (!SR) return;

    recognitionRef.current?.abort();

    const recognition = new SR() as SpeechRecognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (e: SpeechRecognitionEvent) => onResultRef.current(e.results[0][0].transcript);

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { listening, startListening, stopListening, supported };
}
