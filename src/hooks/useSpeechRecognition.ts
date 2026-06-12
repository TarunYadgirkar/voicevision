'use client';
import { useState, useRef, useCallback, useSyncExternalStore } from 'react';

interface UseSpeechRecognitionReturn {
  transcript: string;
  listening: boolean;
  startListening: () => void;
  stopListening: () => void;
  supported: boolean;
}

type SpeechRecognitionWindow = typeof window & {
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

const noopSubscribe = () => () => {};
const getSupportSnapshot = () =>
  'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
const getServerSupportSnapshot = () => false;

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(noopSubscribe, getSupportSnapshot, getServerSupportSnapshot);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || (window as SpeechRecognitionWindow).webkitSpeechRecognition;
    if (!SR) return;

    if (recognitionRef.current) recognitionRef.current.abort();

    const recognition = new SR() as SpeechRecognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { transcript, listening, startListening, stopListening, supported };
}
