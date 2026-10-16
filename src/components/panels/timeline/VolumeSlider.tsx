// src/components/panels/timeline/VolumeSlider.tsx
import React, { useEffect, useRef, useState } from 'react';
import { clamp } from './constants';

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

export const VolumeSlider: React.FC<Props> = ({ value, min, max, step, onChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);

  useEffect(() => {
    if (sliderRef.current) {
      const trackWidth = sliderRef.current.clientWidth;
      setTooltipLeft(((value - min) / (max - min)) * trackWidth);
    }
  }, [value, min, max]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    let rafId: number | null = null;
    let pendingValue = value;
    const flush = () => { rafId = null; onChange(pendingValue); };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      pendingValue = clamp((clickX / rect.width) * (max - min) + min, min, max);
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    const handleMouseUp = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      onChange(pendingValue);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setShowTooltip(false);
    };
    setShowTooltip(true);
    handleMouseMove(e.nativeEvent);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      onChange(clamp(value + Math.sign(-e.deltaY) * step, min, max));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [value, min, max, step, onChange]);

  const pct = Math.round((value / max) * 100);
  return (
    <div
      ref={sliderRef}
      className="relative flex items-center h-5 w-28 bg-transparent cursor-pointer rounded-full"
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-1.5 bg-app-gray-dark/50 rounded-full">
        <div
          className="absolute h-full rounded-full bg-primary"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <div
          className="absolute -top-1.5 w-5 h-5 rounded-full bg-app-card shadow-md flex items-center justify-center border border-app-border cursor-grab active:cursor-grabbing"
          style={{
            left: `${((value - min) / (max - min)) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="w-1 h-1 rounded-full bg-app-gray" />
        </div>
      </div>
      {showTooltip && (
        <div className="absolute top-[-25px] left-0">
          <div
            className="relative bg-app-card text-xs text-app-text font-bold px-2 py-1 rounded-md shadow-md border border-app-border"
            style={{ left: tooltipLeft, transform: 'translateX(-50%)' }}
          >
            {pct}%
          </div>
        </div>
      )}
    </div>
  );
};

