// src/components/panels/EditPanel/helpers.tsx
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { timeStringToSeconds, formatTime } from '../../../utils/formatTime';

export const SUBTITLE_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'fr-CA', label: 'French (Canada)' },
  { value: 'de-DE', label: 'German' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'ar-SA', label: 'Arabic' },
  { value: 'hi-IN', label: 'Hindi' },
];

export const TimeInput: React.FC<{
  value: number;
  active: boolean;
  onChange: (v: number) => void;
}> = ({ value, active, onChange }) => {
  const [text, setText] = useState(formatTime(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatTime(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = timeStringToSeconds(text);
    if (!isNaN(parsed) && parsed >= 0) onChange(parsed);
    else setText(formatTime(value));
  };

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={`w-24 bg-app-input-bg border rounded-sm px-1 py-0.5 text-xs text-app-text text-center focus:ring-1 focus:ring-primary outline-none ${
        active ? 'border-primary bg-primary/5' : 'border-app-border'
      }`}
      title="Time (HH:MM:SS.mmm)"
    />
  );
};

export const ExpandableTextarea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  expanded: boolean;
  onToggle: () => void;
  placeholder: string;
}> = ({ label, value, onChange, expanded, onToggle, placeholder }) => (
  <div className="px-0.5">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-2 bg-app-gray-light rounded-md hover:bg-app-gray"
    >
      <span className="text-sm font-medium flex items-center gap-2">
        <FileText size={16} />
        {label}
      </span>
      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </button>
    {expanded && (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full h-24 p-3 mt-2 border border-app-border rounded-md focus:ring-2 focus:ring-primary outline-none bg-app-input-bg text-app-text text-sm resize-none"
        placeholder={placeholder}
      />
    )}
  </div>
);
