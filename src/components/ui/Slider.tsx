// src/components/ui/Slider.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const range = max - min || 1;
  const percentage = ((value - min) / range) * 100;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const raw = min + ratio * range;
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, range, step, value],
  );

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    onChange(valueFromClientX(e.clientX));
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      onChange(valueFromClientX(e.clientX));
    };
    const onUp = () => setIsDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, onChange, valueFromClientX]);

  const formatted =
    step < 1 ? value.toFixed(step < 0.1 ? 2 : 1).replace(/\.0+$/, '') : String(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-app-gray">{label}</label>
        <span className="text-xs text-app-text font-mono">
          {formatted}
          {suffix}
        </span>
      </div>
      <div
        ref={trackRef}
        onMouseDown={onMouseDown}
        className="relative w-full h-6 flex items-center cursor-pointer select-none"
      >
        <div className="absolute w-full h-1.5 bg-app-gray-dark rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-primary rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow-md border-2 border-primary"
          style={{
            left: `calc(${percentage}% - 8px)`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        />
      </div>
    </div>
  );
};