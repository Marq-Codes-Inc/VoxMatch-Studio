import React, { useState, useEffect } from 'react';
import { ColorInputProps } from '../types';

export const ColorInput: React.FC<ColorInputProps> = ({ value, onChange, label }) => {
  const [inputValue, setInputValue] = useState(value);
  
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleBlur = () => {
    if (/^#[0-9A-F]{6}$/i.test(inputValue)) {
      onChange(inputValue.toUpperCase());
    } else {
      setInputValue(value);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-app-gray">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded-lg border border-app-border overflow-hidden shadow-sm cursor-pointer"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          className="flex-1 px-3 py-1.5 bg-app-input-bg border border-app-border rounded-lg text-sm font-mono text-app-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="#RRGGBB"
        />
      </div>
    </div>
  );
};