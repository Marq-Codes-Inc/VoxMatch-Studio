// src/components/modals/PasteImportModalContent.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Upload, Zap } from 'lucide-react';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';
import { calculateSmartTiming, getTimingConfigForLanguage, DEFAULT_CONFIG } from '../../utils/timingUtils';
import { TimingPreview } from '../panels/EditPanel/TimingPreview';
import { Dropdown } from '../ui/Dropdown';
import { SUBTITLE_LANGUAGES } from '../panels/EditPanel/helpers';

interface PasteImportModalContentProps {
  onClose: () => void;
}

// Reusable Toggle Component
const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label className="flex items-center cursor-pointer gap-2 group h-10">
    <div
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-app-gray-dark border border-app-border'
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </div>
    <span className="text-sm text-app-text group-hover:text-white transition-colors whitespace-nowrap">
      {label}
    </span>
  </label>
);

export const PasteImportModalContent: React.FC<PasteImportModalContentProps> = ({ onClose }) => {
  const ctx = useProjectEditor();
  const {
    activeLeftPanelTab,
    mediaDuration,
    currentTime,
    settings,
    subtitleLanguage,
    setSubtitleLanguage,
    handleBatchAddLyrics,
    handleBatchAddSubtitles,
    importSubtitleFile,
  } = ctx;

  const [text, setText] = useState('');
  const [startOffset, setStartOffset] = useState(0);
  const [usePlayhead, setUsePlayhead] = useState(true); // Toggle state
  const [estimatedClips, setEstimatedClips] = useState<{ text: string; duration: number }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync startOffset with playhead if toggle is on
  useEffect(() => {
    if (usePlayhead) {
      setStartOffset(currentTime);
    }
  }, [currentTime, usePlayhead]);

  // Update timing preview when text or start offset changes
  useEffect(() => {
    if (!text.trim()) {
      setEstimatedClips([]);
      return;
    }
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      setEstimatedClips([]);
      return;
    }

    const remaining = Math.max(0, mediaDuration - startOffset);
    const langCfg = activeLeftPanelTab === 'subtitles' ? getTimingConfigForLanguage(subtitleLanguage) : {};

    const clips = calculateSmartTiming(lines, startOffset, remaining, {
      baseDurationPerChar: settings?.timing?.baseDurationPerChar ?? DEFAULT_CONFIG.baseDurationPerChar,
      minDuration: settings?.timing?.minClipDuration ?? DEFAULT_CONFIG.minDuration,
      maxDuration: settings?.timing?.maxClipDuration ?? DEFAULT_CONFIG.maxDuration,
      pauseBetweenClips: settings?.timing?.pauseBetweenClips ?? DEFAULT_CONFIG.pauseBetweenClips,
      readingSpeed: settings?.defaultReadingSpeed ?? 'normal',
      ...langCfg,
    });

    setEstimatedClips(clips.map((c) => ({ text: c.text, duration: c.endTime - c.startTime })));
  }, [text, startOffset, mediaDuration, subtitleLanguage, settings, activeLeftPanelTab]);

  const handleAutoSync = () => {
    if (!text.trim()) return;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    
    // Force using the current offset calculation at the moment of sync
    const actualOffset = usePlayhead ? currentTime : startOffset;
    const remaining = Math.max(0, mediaDuration - actualOffset);
    const langCfg = activeLeftPanelTab === 'subtitles' ? getTimingConfigForLanguage(subtitleLanguage) : {};

    const clips = calculateSmartTiming(lines, actualOffset, remaining, {
      baseDurationPerChar: settings?.timing?.baseDurationPerChar ?? DEFAULT_CONFIG.baseDurationPerChar,
      minDuration: settings?.timing?.minClipDuration ?? DEFAULT_CONFIG.minDuration,
      maxDuration: settings?.timing?.maxClipDuration ?? DEFAULT_CONFIG.maxDuration,
      pauseBetweenClips: settings?.timing?.pauseBetweenClips ?? DEFAULT_CONFIG.pauseBetweenClips,
      readingSpeed: settings?.defaultReadingSpeed ?? 'normal',
      ...langCfg,
    });

    if (activeLeftPanelTab === 'lyrics') {
      handleBatchAddLyrics(clips);
    } else {
      handleBatchAddSubtitles(clips);
    }
    onClose();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await importSubtitleFile(file, { replace: false });
    onClose();
  };

  return (
    <div className="flex flex-col p-6 space-y-5 min-h-0">
      
      {/* Text Input Area */}
      <div className="flex-shrink-0">
        <label className="text-sm font-medium text-app-text mb-2 block">
          Paste {activeLeftPanelTab === 'subtitles' ? 'Subtitles' : 'Lyrics'}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Paste your ${activeLeftPanelTab} here. Each new line becomes a clip.`}
          className="w-full h-40 p-3 border border-app-border rounded-md focus:ring-2 focus:ring-primary outline-none bg-app-input-bg text-app-text text-sm resize-none"
          spellCheck={false}
        />
      </div>

      {/* Settings Row */}
      <div className="flex flex-wrap items-center gap-6 flex-shrink-0">
        
        {/* Toggle */}
        <Toggle 
          checked={usePlayhead} 
          onChange={setUsePlayhead} 
          label="Start at Playhead" 
        />

        {/* Start At Input (Extreme Right) */}
        {!usePlayhead && (
          <div className="flex items-center gap-2 animate-fade-in ml-auto">
            <label className="text-xs text-app-gray whitespace-nowrap">Start at (sec)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={startOffset}
              onChange={(e) => setStartOffset(Number(e.target.value))}
              className="w-24 bg-app-input-bg border border-app-border rounded-sm px-2 py-1.5 text-sm text-app-text focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        )}

        {/* Language Dropdown (if Subtitles) */}
        {activeLeftPanelTab === 'subtitles' && (
          <div className={`w-56 ${usePlayhead ? 'ml-auto' : ''}`}>
            <Dropdown
              id="subtitle-language"
              name="language"
              label="Language"
              value={subtitleLanguage}
              options={SUBTITLE_LANGUAGES}
              onChange={(_, value) => setSubtitleLanguage(value as string)}
            />
          </div>
        )}
      </div>

      {/* Live Preview */}
      {estimatedClips.length > 0 && (
        <div className="flex-shrink-0">
          <TimingPreview clips={estimatedClips} />
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex gap-3 mt-2 pt-5 border-t border-app-border flex-shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt,.vtt,.lrc,.ass,.ssa"
          className="hidden"
          onChange={handleFileImport}
        />
        
        {/* Import File Button (Matches Add Clips style) */}
        <div className="relative group flex-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2.5 bg-app-gray-light text-app-text rounded-lg hover:bg-app-gray-dark hover:text-white flex items-center justify-center text-sm font-medium transition-colors border border-transparent hover:border-app-border-light"
          >
            <Upload className="mr-2" size={16} />
            Import File
          </button>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-[100] px-2 py-1 bg-app-surface border border-app-border text-app-text text-xs rounded shadow-lg whitespace-nowrap">
            Import .srt, .vtt, .lrc, or .ass
          </div>
        </div>

        <button
          onClick={handleAutoSync}
          disabled={!text.trim()}
          className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover flex items-center justify-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
        >
          <Zap className="mr-2" size={16} />
          Auto-Sync to Timeline
        </button>
      </div>
    </div>
  );
};
