/**
 * Voice input via the Web Speech API, where the browser has it (Chrome, Edge,
 * Safari). Elsewhere the mic button is hidden; phone keyboards have their own
 * dictation button that works everywhere.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface RecognitionResultEvent {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  // Brave ships the API but blocks the speech service behind it, so it always fails.
  if ('brave' in navigator) return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useSpeech(options: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const handlers = useRef(options);
  handlers.current = options;
  const supported = Boolean(getRecognition());

  const stop = useCallback(() => {
    recognition.current?.abort();
    recognition.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    stop();
    const r = new Ctor();
    r.lang = navigator.language || 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (event) => {
      let text = '';
      let final = false;
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        text += result[0].transcript;
        final ||= result.isFinal;
      }
      if (final) handlers.current.onFinal(text.trim());
      else handlers.current.onInterim(text);
    };
    r.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      handlers.current.onError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access was blocked. You can still type, or use your keyboard’s mic.'
          : 'Voice input is not available in this browser. Try your keyboard’s mic instead.',
      );
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { supported, listening, start, stop };
}
