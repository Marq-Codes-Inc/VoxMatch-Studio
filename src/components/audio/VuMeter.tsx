// src/components/audio/VuMeter.tsx
import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useAnalyserData, AnalyserFrame } from '../../hooks/useAnalyserData';

interface VuMeterProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isPlaying: boolean;
  variant?: 'compact' | 'full';
  color?: string;
  className?: string;
}

const SMOOTHING_ATTACK = 0.7;
const SMOOTHING_RELEASE = 0.15;

export const VuMeter: React.FC<VuMeterProps> = ({
  analyserRef,
  isPlaying,
  variant = 'compact',
  color,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedRef = useRef<Float32Array | null>(null);

  const accentColor = useMemo(() => {
    if (color) return color;
    if (typeof window !== 'undefined') {
      const cssVar = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim();
      if (cssVar) return cssVar;
    }
    return '#046466';
  }, [color]);

  const isCompact = variant === 'compact';

  const draw = useCallback(
    (frame: AnalyserFrame | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const pixelWidth = Math.max(1, Math.floor(cssWidth * dpr));
      const pixelHeight = Math.max(1, Math.floor(cssHeight * dpr));

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      ctx.clearRect(0, 0, pixelWidth, pixelHeight);

      const barCount = isCompact
        ? Math.min(20, Math.floor(pixelWidth / 7))
        : Math.max(20, Math.floor(pixelWidth / 5));

      if (!smoothedRef.current || smoothedRef.current.length !== barCount) {
        smoothedRef.current = new Float32Array(barCount);
      }
      const smoothed = smoothedRef.current;

      const targets = new Float32Array(barCount);
      if (frame && isPlaying) {
        const freq = frame.frequency;
        const binsPerBar = Math.max(1, Math.floor(freq.length / barCount));
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < binsPerBar; j++) {
            sum += freq[i * binsPerBar + j];
          }
          targets[i] = sum / binsPerBar / 255;
        }
      }

      for (let i = 0; i < barCount; i++) {
        const target = targets[i];
        const current = smoothed[i];
        const coef = target > current ? SMOOTHING_ATTACK : SMOOTHING_RELEASE;
        smoothed[i] = current + (target - current) * coef;
      }

      const gap = isCompact ? 2 : 3;
      const totalGaps = (barCount - 1) * gap;
      const barWidth = (pixelWidth - totalGaps) / barCount;
      const radius = Math.min(barWidth / 2, isCompact ? 1.5 : 2.5);

      const idleColor = 'rgba(255,255,255,0.08)';
      const idleHeight = Math.max(1, Math.floor(pixelHeight * 0.15));

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const level = smoothed[i];
        const barHeight = Math.max(idleHeight, level * pixelHeight);
        const y = pixelHeight - barHeight;

        ctx.fillStyle = idleColor;
        roundRect(ctx, x, pixelHeight - idleHeight, barWidth, idleHeight, radius);
        ctx.fill();

        if (level > 0.02) {
          ctx.fillStyle = vuColor(level, accentColor);
          roundRect(ctx, x, y, barWidth, barHeight, radius);
          ctx.fill();

          if (level > 0.85) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(x, y, barWidth, Math.max(1, Math.floor(dpr)));
          }
        }
      }
    },
    [isCompact, accentColor, isPlaying],
  );

  useAnalyserData(analyserRef, isPlaying, draw);

  useEffect(() => {
    if (!isPlaying) draw(null);
  }, [isPlaying, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`${isCompact ? 'w-24 h-5' : 'w-full h-full'} rounded ${className}`}
      style={{ display: 'block' }}
    />
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function vuColor(v: number, accent: string): string {
  if (v < 0.55) return accent;
  if (v < 0.8) return '#F59E0B';
  return '#EF4444';
}