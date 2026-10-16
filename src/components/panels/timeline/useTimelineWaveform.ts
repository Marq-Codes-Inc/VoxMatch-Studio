// src/components/panels/timeline/useTimelineWaveform.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { ImportedMediaFile } from '../../../types/types';

export function useTimelineWaveform(
  activeFile: ImportedMediaFile | null,
  isMediaLoaded: boolean,
  waveformColor: string,
  innerRef: React.RefObject<HTMLDivElement>,
) {
  const waveformRef = useRef<HTMLCanvasElement | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const peaksRef = useRef<Float32Array | null>(null);
  const peaksWidthRef = useRef(0);
  const waveformDrawRequestRef = useRef<number | null>(null);
  const lastWaveformImageRef = useRef<ImageData | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Load audio buffer
  useEffect(() => {
    if (!activeFile || !isMediaLoaded) {
      setAudioBuffer(null);
      peaksRef.current = null;
      lastWaveformImageRef.current = null;
      return;
    }
    const load = async () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        let buf: ArrayBuffer | null = null;
        if (activeFile.file instanceof File) buf = await activeFile.file.arrayBuffer();
        else if (activeFile.url) {
          try {
            const res = await fetch(activeFile.url);
            if (res.ok) buf = await res.arrayBuffer();
          } catch {
            const el = document.querySelector('video, audio') as HTMLMediaElement;
            if (el && el.src) {
              const res = await fetch(el.src);
              if (res.ok) buf = await res.arrayBuffer();
            }
          }
        }
        if (buf) {
          const decoded = await ctx.decodeAudioData(buf);
          setAudioBuffer(decoded);
        }
      } catch (err) {
        console.error('Error decoding audio for waveform:', err);
        setAudioBuffer(null);
      }
    };
    load();
  }, [activeFile?.id, isMediaLoaded, activeFile?.url, activeFile?.file]);

  const computePeaks = useCallback((buffer: AudioBuffer, width: number) => {
    if (!buffer || width <= 0) return null;
    const channels = Math.max(1, buffer.numberOfChannels);
    const dataLen = buffer.length;
    const samplesPerBucket = Math.floor(dataLen / width) || 1;
    const peaks = new Float32Array(width * 2);
    for (let c = 0; c < channels; c++) {
      const data = buffer.getChannelData(c);
      let bucketIndex = 0, min = 1.0, max = -1.0, iInBucket = 0;
      for (let i = 0; i < dataLen; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
        iInBucket++;
        if (iInBucket >= samplesPerBucket) {
          const base = bucketIndex * 2;
          if (base < peaks.length) {
            peaks[base] = Math.min(peaks[base] || 1, min);
            peaks[base + 1] = Math.max(peaks[base + 1] || -1, max);
          }
          bucketIndex++;
          min = 1.0; max = -1.0; iInBucket = 0;
          if (bucketIndex >= width) break;
        }
      }
      if (bucketIndex < width && iInBucket > 0) {
        const base = bucketIndex * 2;
        if (base < peaks.length) {
          peaks[base] = Math.min(peaks[base] || 1, min);
          peaks[base + 1] = Math.max(peaks[base + 1] || -1, max);
        }
      }
    }
    for (let b = 0; b < peaks.length; b++) if (!Number.isFinite(peaks[b])) peaks[b] = 0;
    peaksWidthRef.current = width;
    peaksRef.current = peaks;
    return peaks;
  }, []);

  const draw = useCallback(
    (width: number, height: number) => {
      if (!audioBuffer || !waveformRef.current || !isMediaLoaded) {
        if (waveformRef.current) {
          const ctx = waveformRef.current.getContext('2d', { willReadFrequently: true });
          if (ctx) ctx.clearRect(0, 0, waveformRef.current.width, waveformRef.current.height);
        }
        return;
      }
      const canvas = waveformRef.current;
      const dpr = window.devicePixelRatio || 1;
      const pw = Math.max(1, Math.floor(width * dpr));
      const ph = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw; canvas.height = ph;
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      if (!peaksRef.current || peaksWidthRef.current !== pw) computePeaks(audioBuffer, pw);
      const peaks = peaksRef.current;
      if (!peaks) return;
      ctx.clearRect(0, 0, pw, ph);
      ctx.fillStyle = waveformColor || '#046466';
      const halfH = ph / 2;
      for (let x = 0; x < pw; x++) {
        const base = x * 2;
        if (base + 1 >= peaks.length) break;
        const min = peaks[base], max = peaks[base + 1];
        const yTop = Math.round((1 - max) * halfH);
        const yBottom = Math.round((1 - min) * halfH);
        ctx.fillRect(x, yTop, 1, Math.max(1, yBottom - yTop));
      }
    },
    [audioBuffer, computePeaks, waveformColor, isMediaLoaded],
  );

  const scheduleDraw = useCallback(
    (width: number, height: number) => {
      if (waveformDrawRequestRef.current) cancelAnimationFrame(waveformDrawRequestRef.current);
      waveformDrawRequestRef.current = requestAnimationFrame(() => {
        waveformDrawRequestRef.current = null;
        draw(width, height);
      });
    },
    [draw],
  );

  // Redraw on buffer / zoom change
  useEffect(() => {
    if (!innerRef.current || !audioBuffer || !isMediaLoaded) return;
    const w = innerRef.current.clientWidth || innerRef.current.scrollWidth || 1000;
    scheduleDraw(w, 50);
  }, [audioBuffer, scheduleDraw, isMediaLoaded, innerRef]);

  // Redraw on resize
  useEffect(() => {
    const container = innerRef.current;
    if (!container) return;
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    const ro = new ResizeObserver(() => {
      if (audioBuffer && isMediaLoaded) scheduleDraw(container.clientWidth || 800, 50);
    });
    ro.observe(container);
    resizeObserverRef.current = ro;
    return () => { ro.disconnect(); resizeObserverRef.current = null; };
  }, [scheduleDraw, audioBuffer, isMediaLoaded, innerRef]);

  const clear = useCallback(() => {
    setAudioBuffer(null);
    peaksRef.current = null;
    lastWaveformImageRef.current = null;
    if (waveformRef.current) {
      const ctx = waveformRef.current.getContext('2d', { willReadFrequently: true });
      if (ctx) ctx.clearRect(0, 0, waveformRef.current.width, waveformRef.current.height);
    }
  }, []);

  return { waveformRef, scheduleDraw, clear, audioBuffer };
}

