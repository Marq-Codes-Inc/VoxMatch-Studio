// src/hooks/useAnalyserData.ts
import { useEffect, useRef } from 'react';

export interface AnalyserFrame {
  waveform: Uint8Array<ArrayBuffer>;
  frequency: Uint8Array<ArrayBuffer>;
  rms: number;
  peak: number;
}

export function useAnalyserData(
  analyserRef: React.MutableRefObject<AnalyserNode | null>,
  enabled: boolean,
  onFrame: (frame: AnalyserFrame) => void,
): void {
  const callbackRef = useRef(onFrame);
  useEffect(() => {
    callbackRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let waveform: Uint8Array<ArrayBuffer> | null = null;
    let frequency: Uint8Array<ArrayBuffer> | null = null;

    const tick = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        const n = analyser.frequencyBinCount;
        if (!waveform || waveform.length !== n) {
          waveform = new Uint8Array(new ArrayBuffer(n));
        }
        if (!frequency || frequency.length !== n) {
          frequency = new Uint8Array(new ArrayBuffer(n));
        }

        analyser.getByteTimeDomainData(waveform);
        analyser.getByteFrequencyData(frequency);

        let sumSq = 0;
        let peak = 0;
        for (let i = 0; i < n; i++) {
          const v = (waveform[i] - 128) / 128;
          sumSq += v * v;
          const a = v < 0 ? -v : v;
          if (a > peak) peak = a;
        }
        const rms = Math.sqrt(sumSq / n);

        callbackRef.current({ waveform, frequency, rms, peak });
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [analyserRef, enabled]);
}

