import React, { useRef, useCallback, useEffect, useState } from 'react';

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  onAfterChange?: (value: number) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  label?: string; // ← ADD THIS
  className?: string;
  disabled?: boolean;
}

const sizeConfig = {
  sm: { trackHeight: 4, thumbSize: 12 },
  md: { trackHeight: 6, thumbSize: 16 },
  lg: { trackHeight: 8, thumbSize: 20 },
};

export const Slider: React.FC<SliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  onAfterChange,
  orientation = 'horizontal',
  size = 'md',
  label,
  className = '',
  disabled = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const percent = ((localValue - min) / (max - min)) * 100;

  const clamp = useCallback(
    (raw: number) => {
      const stepped = Math.round((raw - min) / step) * step + min;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step]
  );

  const calcValueFromPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!trackRef.current) return localValue;
      const rect = trackRef.current.getBoundingClientRect();
      let fraction = 0;
      if (orientation === 'horizontal') {
        fraction = (clientX - rect.left) / rect.width;
      } else {
        fraction = 1 - (clientY - rect.top) / rect.height;
      }
      fraction = Math.max(0, Math.min(1, fraction));
      const raw = fraction * (max - min) + min;
      return clamp(raw);
    },
    [min, max, clamp, orientation, localValue]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const newVal = calcValueFromPosition(e.clientX, e.clientY);
      setLocalValue(newVal);
      onChange(newVal);
    },
    [disabled, calcValueFromPosition, onChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || disabled) return;
      const newVal = calcValueFromPosition(e.clientX, e.clientY);
      setLocalValue(newVal);
      onChange(newVal);
    },
    [calcValueFromPosition, disabled, onChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      onAfterChange?.(localValue);
    },
    [localValue, onAfterChange]
  );

  // Prevent text selection while dragging
  useEffect(() => {
    const preventSelection = (e: Event) => {
      if (isDragging.current) e.preventDefault();
    };
    document.addEventListener('selectstart', preventSelection);
    return () => document.removeEventListener('selectstart', preventSelection);
  }, []);

  const { trackHeight, thumbSize } = sizeConfig[size];
  const isHorizontal = orientation === 'horizontal';
  const containerClass = isHorizontal
    ? `w-full flex flex-col gap-1 ${className}`
    : `h-full flex flex-row-reverse gap-1 ${className}`;

  return (
    <div
      ref={trackRef}
      className={containerClass}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-orientation={orientation}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {/* Label (optional) */}
      {label && (
        <label className="text-xs text-app-gray mb-1 select-none">
          {label}
        </label>
      )}

      {/* Track */}
      <div
        className={`relative bg-app-gray-dark rounded-full ${
          isHorizontal ? `w-full h-[${trackHeight}px]` : `h-full w-[${trackHeight}px]`
        }`}
        style={{
          width: isHorizontal ? '100%' : trackHeight,
          height: isHorizontal ? trackHeight : '100%',
        }}
      >
        {/* Filled portion */}
        <div
          className="absolute bg-primary rounded-full"
          style={
            isHorizontal
              ? { left: 0, top: 0, height: trackHeight, width: `${percent}%` }
              : { bottom: 0, left: 0, width: trackHeight, height: `${percent}%` }
          }
        />
        {/* Thumb */}
        <div
          className="absolute bg-white rounded-full shadow-md border-2 border-primary"
          style={
            isHorizontal
              ? {
                  left: `calc(${percent}% - ${thumbSize / 2}px)`,
                  top: `calc(50% - ${thumbSize / 2}px)`,
                  width: thumbSize,
                  height: thumbSize,
                }
              : {
                  bottom: `calc(${percent}% - ${thumbSize / 2}px)`,
                  left: `calc(50% - ${thumbSize / 2}px)`,
                  width: thumbSize,
                  height: thumbSize,
                }
          }
        />
      </div>
    </div>
  );
};