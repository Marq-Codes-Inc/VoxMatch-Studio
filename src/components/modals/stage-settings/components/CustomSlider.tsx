// CustomSlider.tsx
import React, { useRef, useState, useEffect } from 'react';
import { CustomSliderProps } from '../types';

export const CustomSlider: React.FC<CustomSliderProps> = ({ 
  value, 
  min, 
  max, 
  step = 1, 
  onChange,
  label,
  suffix = '',
  showValue = true,
  compact = false
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const percentage = ((value - min) / (max - min)) * 100;

  const updateValue = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const newValue = min + percent * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, steppedValue)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e.clientX);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValue(e.clientX);
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className={`space-y-${compact ? '1.5' : '2'}`}>
      {label && (
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-app-gray uppercase tracking-wide">
            {label}
          </label>
          {showValue && (
            <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
              {value}{suffix}
            </span>
          )}
        </div>
      )}
      <div 
        className="relative w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
          ref={sliderRef}
          className="relative w-full h-6 flex items-center cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          {/* Track Background */}
          <div className="absolute w-full h-1.5 bg-app-gray-dark rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-gradient-to-r from-primary to-primary-hover rounded-full transition-all duration-150 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          {/* Thumb */}
          <div 
            className={`
              absolute w-4 h-4 bg-white rounded-full
              shadow-md border-2 border-primary
              transition-all duration-150 ease-out
              ${isDragging ? 'scale-125 shadow-lg' : ''}
              ${isHovered && !isDragging ? 'scale-110' : ''}
            `}
            style={{ 
              left: `calc(${percentage}% - 8px)`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
        </div>
        
        {/* Tooltip */}
        <div
          className={`
            absolute -top-8 left-1/2 -translate-x-1/2
            px-2 py-1 bg-gray-800 text-white text-xs rounded
            shadow-lg whitespace-nowrap pointer-events-none z-10
            transition-all duration-150 ease-out
            ${isDragging || isHovered 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-2'
            }
          `}
        >
          {value}{suffix}
        </div>
      </div>
    </div>
  );
};