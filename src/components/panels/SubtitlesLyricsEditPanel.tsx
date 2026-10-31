// src/components/panels/SubtitlesLyricsEditPanel.tsx
import {
  Type,
  FileText,
  Maximize2,
  Minimize2,
  Split,
  Combine,
  Zap,
  Trash2,
  CheckSquare,
  Plus,
  Layers,
  Edit,
  Clock,
  Upload,
  Loader,
} from 'lucide-react';
import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { LyricLine } from '../../types/types';
import { TemplatesContent } from '../modals/TemplatesContent';
import { Dropdown } from '../ui/Dropdown';
import {
  calculateSmartTiming,
  getTimingConfigForLanguage,
  DEFAULT_CONFIG,
} from '../../utils/timingUtils';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';

// Modularized imports using ./EditPanel
import { SUBTITLE_LANGUAGES, ExpandableTextarea } from './EditPanel/helpers';
import { TimingPreview } from './EditPanel/TimingPreview';
import { TextStyleControls } from './EditPanel/TextStyleControls';
import { LyricsList } from './EditPanel/LyricsList';

interface LyricsSubtitlesPanelProps {
  isLeftPanelFilled: boolean;
  setIsLeftPanelFilled: (v: boolean) => void;
  isVerticalLayout: boolean;
  isLeftPanelTopRowFilled: boolean;
  setIsLeftPanelTopRowFilled: (v: boolean) => void;
  onOpenStageSettingsModal?: () => void;
}

const TabNav: React.FC<{
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex bg-app-gray-dark rounded-lg p-1 flex-shrink-0">
    {tabs.map(({ id, label, icon }) => (
      <button
        key={id}
        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
          active === id ? 'bg-primary text-white' : 'text-app-gray hover:bg-app-gray-light'
        }`}
        onClick={() => onChange(id)}
      >
        {icon && <span className="inline mr-2">{icon}</span>}
        {label}
      </button>
    ))}
  </div>
);

export const LyricsSubtitlesPanel: React.FC<LyricsSubtitlesPanelProps> = ({
  isLeftPanelFilled,
  setIsLeftPanelFilled,
  isVerticalLayout,
  isLeftPanelTopRowFilled,
  setIsLeftPanelTopRowFilled,
  onOpenStageSettingsModal,
}) => {
  const ctx = useProjectEditor();

  const {
    activeLeftPanelTab,
    setActiveLeftPanelTab,
    activeSubTab,
    setActiveSubTab,
    lyrics,
    subtitles,
    handleLyricChange,
    handleSubtitleChange,
    handleAddSubtitle,
    handleAddLyric,
    handleDeleteSubtitle,
    handleDeleteLyric,
    handleMergeSubtitles,
    handleSplitSubtitleAt,
    handleBatchAddLyrics,
    handleBatchAddSubtitles,
    selectedSubtitleIds,
    selectedLyricIds,
    toggleSubtitleSelection,
    toggleLyricSelection,
    clearSelection,
    selectAll,
    lyricTextStyle,
    setLyricTextStyle,
    subtitleTextStyle,
    setSubtitleTextStyle,
    subtitleLanguage,
    setSubtitleLanguage,
    currentTime,
    mediaDuration,
    settings,
    importSubtitleFile,
    activeFile,
    handleAlignTimestamps,
    isAligning,
    alignProgress,
  } = ctx;

  const lyricsListRef = useRef<HTMLDivElement>(null);
  const subtitlesListRef = useRef<HTMLDivElement>(null);

  const subtitleFileInputRef = useRef<HTMLInputElement>(null);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);

  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const [lyricsPasteText, setLyricsPasteText] = useState('');
  const [subtitlesPasteText, setSubtitlesPasteText] = useState('');
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(true);
  const [isSubtitlesExpanded, setIsSubtitlesExpanded] = useState(true);

  const [startOffset, setStartOffset] = useState(0);
  const [estimatedClips, setEstimatedClips] = useState<{ text: string; duration: number }[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const sortedSubtitles = useMemo(() => [...subtitles].sort((a, b) => a.startTime - b.startTime), [subtitles]);
  const sortedLyrics = useMemo(() => [...lyrics].sort((a, b) => a.startTime - b.startTime), [lyrics]);

  const activeList = activeLeftPanelTab === 'subtitles' ? sortedSubtitles : sortedLyrics;
  const listRef = activeLeftPanelTab === 'subtitles' ? subtitlesListRef : lyricsListRef;
  const selectedSet = activeLeftPanelTab === 'subtitles' ? selectedSubtitleIds : selectedLyricIds;
  const allSelected = activeList.length > 0 && activeList.length === selectedSet.size;

  useEffect(() => {
    if (!activeList.length) {
      setActiveClipId(null);
      return;
    }
    const clip = activeList.find((c) => currentTime >= c.startTime && currentTime <= c.endTime);
    setActiveClipId(clip?.id ?? null);
  }, [currentTime, activeList]);

  // Auto-scroll active clip
  const lastScrolledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeClipId || lastScrolledRef.current === activeClipId) return;
    const container = listRef.current;
    if (!container) return;
    
    // Find the element by data attribute (handled in LyricsList)
    const el = container.querySelector(`[data-clip-id="${activeClipId}"]`) as HTMLElement;
    if (!el) return;

    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const distance = Math.abs(eRect.top + eRect.height / 2 - (cRect.top + cRect.height / 2));
    
    if (distance > 100) {
      container.scrollTo({
        top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2,
        behavior: 'smooth',
      });
      lastScrolledRef.current = activeClipId;
      window.setTimeout(() => {
        lastScrolledRef.current = null;
      }, 500);
    }
  }, [activeClipId, listRef]);

  // Timing preview
  useEffect(() => {
    const text = activeLeftPanelTab === 'subtitles' ? subtitlesPasteText : lyricsPasteText;
    if (!text.trim()) {
      setEstimatedClips([]);
      setShowPreview(false);
      return;
    }
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      setEstimatedClips([]);
      return;
    }

    const start = startOffset;
    const remaining = Math.max(0, mediaDuration - start);
    const langCfg = activeLeftPanelTab === 'subtitles' ? getTimingConfigForLanguage(subtitleLanguage) : {};

    const clips = calculateSmartTiming(lines, start, remaining, {
      baseDurationPerChar: settings?.timing?.baseDurationPerChar ?? DEFAULT_CONFIG.baseDurationPerChar,
      minDuration: settings?.timing?.minClipDuration ?? DEFAULT_CONFIG.minDuration,
      maxDuration: settings?.timing?.maxClipDuration ?? DEFAULT_CONFIG.maxDuration,
      pauseBetweenClips: settings?.timing?.pauseBetweenClips ?? DEFAULT_CONFIG.pauseBetweenClips,
      readingSpeed: settings?.defaultReadingSpeed ?? 'normal',
      ...langCfg,
    });

    setEstimatedClips(clips.map((c) => ({ text: c.text, duration: c.endTime - c.startTime })));
    setShowPreview(true);
  }, [lyricsPasteText, subtitlesPasteText, activeLeftPanelTab, startOffset, mediaDuration, subtitleLanguage, settings]);

  const handleAutoSync = useCallback(
    (kind: 'lyrics' | 'subtitles') => {
      const text = kind === 'lyrics' ? lyricsPasteText : subtitlesPasteText;
      if (!text.trim()) return;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return;

      const start = startOffset;
      const remaining = Math.max(0, mediaDuration - start);
      const langCfg = kind === 'subtitles' ? getTimingConfigForLanguage(subtitleLanguage) : {};

      const clips = calculateSmartTiming(lines, start, remaining, {
        baseDurationPerChar: settings?.timing?.baseDurationPerChar ?? DEFAULT_CONFIG.baseDurationPerChar,
        minDuration: settings?.timing?.minClipDuration ?? DEFAULT_CONFIG.minDuration,
        maxDuration: settings?.timing?.maxClipDuration ?? DEFAULT_CONFIG.maxDuration,
        pauseBetweenClips: settings?.timing?.pauseBetweenClips ?? DEFAULT_CONFIG.pauseBetweenClips,
        readingSpeed: settings?.defaultReadingSpeed ?? 'normal',
        ...langCfg,
      });

      if (kind === 'lyrics') {
        handleBatchAddLyrics(clips);
        setLyricsPasteText('');
        setIsLyricsExpanded(false);
      } else {
        handleBatchAddSubtitles(clips);
        setSubtitlesPasteText('');
        setIsSubtitlesExpanded(false);
      }
      setEstimatedClips([]);
      setShowPreview(false);
    },
    [lyricsPasteText, subtitlesPasteText, startOffset, mediaDuration, subtitleLanguage, settings, handleBatchAddLyrics, handleBatchAddSubtitles]
  );

  const handleSelectAll = () => {
    if (allSelected) clearSelection();
    else selectAll();
  };

  const handleDeleteSelected = () => {
    if (activeLeftPanelTab === 'subtitles') {
      [...selectedSubtitleIds].forEach(handleDeleteSubtitle);
    } else {
      [...selectedLyricIds].forEach(handleDeleteLyric);
    }
    clearSelection();
  };

  const handleImportFile = async (f: File | undefined) => {
    if (!f) return;
    await importSubtitleFile(f);
  };

  return (
    <div className="bg-app-surface p-4 rounded-lg border border-app-border h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 space-y-3 pb-3">
        <div className="flex justify-between">
          <h3 className="text-xl font-semibold flex items-center">
            <Edit className="mr-2 text-primary" /> Edit
          </h3>

          {isVerticalLayout ? (
            <button
              onClick={() => setIsLeftPanelTopRowFilled(!isLeftPanelTopRowFilled)}
              className="p-2 rounded-md text-app-icon-color"
              title={isLeftPanelTopRowFilled ? 'Restore Panel' : 'Fill Pane'}
            >
              {isLeftPanelTopRowFilled ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          ) : (
            <button
              onClick={() => setIsLeftPanelFilled(!isLeftPanelFilled)}
              className="p-2 rounded-md text-app-icon-color"
              title={isLeftPanelFilled ? 'Restore Panel' : 'Fill Pane'}
            >
              {isLeftPanelFilled ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
        </div>

        <div className="flex bg-app-gray-dark rounded-lg p-1">
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${activeLeftPanelTab === 'subtitles' ? 'bg-primary text-white' : 'text-app-gray hover:bg-app-gray-light'}`}
            onClick={() => setActiveLeftPanelTab('subtitles')}
          >
            <Type className="inline mr-2" size={16} /> Subtitles
          </button>
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${activeLeftPanelTab === 'lyrics' ? 'bg-primary text-white' : 'text-app-gray hover:bg-app-gray-light'}`}
            onClick={() => setActiveLeftPanelTab('lyrics')}
          >
            <FileText className="inline mr-2" size={16} /> Lyrics
          </button>
        </div>

        <TabNav
          tabs={[
            { id: 'edit', label: 'Create' },
            { id: 'styles', label: 'Style' },
            { id: 'templates', label: 'Templates' },
          ]}
          active={activeSubTab}
          onChange={(id) => setActiveSubTab(id as typeof activeSubTab)}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeSubTab === 'edit' && (
          <div className="flex flex-col h-full overflow-hidden">
            <input
              ref={activeLeftPanelTab === 'subtitles' ? subtitleFileInputRef : lyricsFileInputRef}
              type="file"
              accept=".srt,.vtt,.lrc,.ass,.ssa"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                await handleImportFile(f);
              }}
            />

            <div className="flex-shrink-0 space-y-3 pb-4">
              <ExpandableTextarea
                label={`Paste ${activeLeftPanelTab === 'subtitles' ? 'Subtitles' : 'Lyrics'}`}
                value={activeLeftPanelTab === 'subtitles' ? subtitlesPasteText : lyricsPasteText}
                onChange={activeLeftPanelTab === 'subtitles' ? setSubtitlesPasteText : setLyricsPasteText}
                expanded={activeLeftPanelTab === 'subtitles' ? isSubtitlesExpanded : isLyricsExpanded}
                onToggle={() => activeLeftPanelTab === 'subtitles' ? setIsSubtitlesExpanded((v) => !v) : setIsLyricsExpanded((v) => !v)}
                placeholder={`Paste ${activeLeftPanelTab} here. Each line becomes a clip.`}
              />

              <div className="flex items-center gap-3 px-1">
                <label className="text-xs text-app-gray flex-shrink-0">Start at</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={startOffset}
                  onChange={(e) => setStartOffset(Number(e.target.value))}
                  className="w-20 bg-app-input-bg border border-app-border rounded-sm px-2 py-1 text-xs text-app-text focus:ring-1 focus:ring-primary outline-none"
                />
                <span className="text-xs text-app-gray">sec</span>
                <button
                  onClick={() => setStartOffset(currentTime)}
                  className="ml-auto text-[10px] text-primary hover:underline"
                >
                  Set to Playhead
                </button>
              </div>

              <button
                onClick={() =>
                  (activeLeftPanelTab === 'subtitles' ? subtitleFileInputRef : lyricsFileInputRef).current?.click()
                }
                className="w-full px-4 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm"
              >
                <Upload className="mr-2" size={16} />
                Import from File (.srt / .vtt / .lrc / .ass)
              </button>

              {showPreview && estimatedClips.length > 0 && (
                <TimingPreview clips={estimatedClips} />
              )}

              {activeLeftPanelTab === 'subtitles' && (
                <Dropdown
                  id="subtitle-language"
                  name="language"
                  label="Language"
                  value={subtitleLanguage}
                  options={SUBTITLE_LANGUAGES}
                  onChange={(_, value) => setSubtitleLanguage(value as string)}
                />
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleAutoSync(activeLeftPanelTab === 'subtitles' ? 'subtitles' : 'lyrics')}
                  disabled={!(activeLeftPanelTab === 'subtitles' ? subtitlesPasteText.trim() : lyricsPasteText.trim())}
                  className="flex-1 px-4 py-2 bg-success text-white rounded-md hover:bg-opacity-80 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="mr-2" size={18} />
                  Auto-Sync
                </button>

                {activeFile && (activeLeftPanelTab === 'lyrics' ? lyrics.length > 0 : subtitles.length > 0) && (
                  <button
                    onClick={() => {
                      const text = activeLeftPanelTab === 'lyrics' 
                        ? lyrics.map(l => l.text).join('\n')
                        : subtitles.map(s => s.text).join('\n');
                      handleAlignTimestamps(activeFile, text);
                    }}
                    disabled={isAligning}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover flex items-center justify-center text-sm disabled:opacity-50"
                    title="Uses AI to perfectly match timestamps to the audio"
                  >
                    {isAligning ? (
                      <>
                        <Loader className="animate-spin mr-2" size={16} />
                        Aligning {alignProgress}%
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2" size={16} />
                        Fine-Tune Timing
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={activeLeftPanelTab === 'subtitles' ? handleAddSubtitle : handleAddLyric}
                  className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm"
                >
                  <Plus className="mr-1" size={14} /> Add
                </button>

                {activeLeftPanelTab === 'subtitles' && (
                  <button
                    onClick={() => {
                      if (selectedSubtitleIds.size === 1) {
                        handleSplitSubtitleAt([...selectedSubtitleIds][0], currentTime);
                      }
                    }}
                    disabled={selectedSubtitleIds.size !== 1}
                    className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Split className="mr-1" size={14} /> Split
                  </button>
                )}

                {activeLeftPanelTab === 'subtitles' && (
                  <button
                    onClick={handleMergeSubtitles}
                    disabled={selectedSubtitleIds.size < 2}
                    className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Combine className="mr-1" size={14} /> Merge
                  </button>
                )}

                <button
                  onClick={handleSelectAll}
                  className={`px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm ${
                    activeLeftPanelTab === 'lyrics' ? 'col-span-1' : 'col-span-1'
                  }`}
                >
                  <CheckSquare className="mr-1" size={14} /> {allSelected ? 'None' : 'All'}
                </button>

                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedSet.size === 0}
                  className={`px-2 py-2 bg-app-gray-light text-danger rounded-md hover:bg-danger/10 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeLeftPanelTab === 'subtitles' ? 'col-span-2' : 'col-span-1'
                  }`}
                >
                  <Trash2 className="mr-1" size={14} />
                  Delete{activeLeftPanelTab === 'subtitles' ? ` (${selectedSet.size})` : ''}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <LyricsList
                list={activeList}
                activeClipId={activeClipId}
                selectedIds={selectedSet}
                toggleSelection={activeLeftPanelTab === 'subtitles' ? toggleSubtitleSelection : toggleLyricSelection}
                onChange={activeLeftPanelTab === 'subtitles' ? handleSubtitleChange : handleLyricChange}
                onDelete={activeLeftPanelTab === 'subtitles' ? handleDeleteSubtitle : handleDeleteLyric}
                listRef={listRef}
              />
            </div>
          </div>
        )}

        {activeSubTab === 'styles' && (
          <div className="flex-1 overflow-y-auto lyrics-list-scrollbar pr-2 space-y-4">
            <button
              onClick={onOpenStageSettingsModal}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-app-gray-light hover:bg-app-gray-dark text-app-text text-sm font-medium"
            >
              <Layers size={16} /> Edit Stage
            </button>
            {activeLeftPanelTab === 'subtitles' ? (
              <TextStyleControls
                label="Subtitles"
                style={subtitleTextStyle}
                onChange={setSubtitleTextStyle}
              />
            ) : (
              <TextStyleControls
                label="Lyrics"
                style={lyricTextStyle}
                onChange={setLyricTextStyle}
              />
            )}
          </div>
        )}

        {activeSubTab === 'templates' && (
          <div className="flex-1 overflow-y-auto lyrics-list-scrollbar pr-2">
            <TemplatesContent
              currentStyle={activeLeftPanelTab === 'lyrics' ? lyricTextStyle : subtitleTextStyle}
              onSelectTextStyle={activeLeftPanelTab === 'lyrics' ? setLyricTextStyle : setSubtitleTextStyle}
            />
          </div>
        )}
      </div>
    </div>
  );
};