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
  Square,
  Plus,
  Layers,
  Edit,
  GripVertical,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { LyricLine, TextStyle, AppSettings } from '../../types/types';
import { TemplatesContent } from '../modals/TemplatesContent';
import { Dropdown } from '../ui/Dropdown';
import { Slider } from '../ui/Slider';
import { Checkbox } from '../ui/Checkbox';
import {
  calculateSmartTiming,
  getTimingConfigForLanguage,
  DEFAULT_CONFIG,
} from '../../utils/timingUtils';

// --- Props ---
interface LyricsSubtitlesPanelProps {
  activeLeftPanelTab: 'subtitles' | 'lyrics';
  setActiveLeftPanelTab: (tab: 'subtitles' | 'lyrics') => void;

  activeSubTab: 'edit' | 'styles' | 'templates';
  setActiveSubTab: (subTab: 'edit' | 'styles' | 'templates') => void;

  lyrics: LyricLine[];
  subtitles: LyricLine[];

  handleLyricChange: (
    id: string,
    field: 'text' | 'startTime' | 'endTime',
    value: string | number
  ) => void;
  handleSubtitleChange: (
    id: string,
    field: 'text' | 'startTime' | 'endTime',
    value: string | number
  ) => void;

  handleAddSubtitle: () => void;
  handleAddLyric: () => void;
  handleDeleteSubtitle: (id: string) => void;
  handleDeleteLyric: (id: string) => void;
  handleMergeSubtitles: () => void;
  handleSplitSubtitle: () => void;
  handleBatchAddLyrics?: (lyricLines: Omit<LyricLine, 'id'>[]) => void;
  handleBatchAddSubtitles?: (subtitleLines: Omit<LyricLine, 'id'>[]) => void;

  formatTime: (sec: number) => string;

  isLeftPanelFilled: boolean;
  setIsLeftPanelFilled: (value: boolean) => void;
  isVerticalLayout: boolean;
  isLeftPanelTopRowFilled: boolean;
  setIsLeftPanelTopRowFilled: (value: boolean) => void;

  selectedSubtitleIds: Set<string>;
  toggleSubtitleSelection: (id: string) => void;

  stageStyle: any;
  setStageStyle: React.Dispatch<React.SetStateAction<any>>;

  lyricTextStyle: TextStyle;
  setLyricTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;
  subtitleTextStyle: TextStyle;
  setSubtitleTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;

  subtitleLanguage: string;
  setSubtitleLanguage: (lang: string) => void;

  onOpenStageSettingsModal: () => void;
  currentTime?: number;
  mediaDuration?: number;

  settings?: AppSettings;
}

// --- Sub-component: TabNav ---
const TabNav = ({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}) => (
  <div className="flex bg-app-gray-dark rounded-lg p-1 flex-shrink-0">
    {tabs.map(({ id, label, icon }) => (
      <button
        key={id}
        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
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

// --- Sub-component: TextStyleControls (unchanged, but included for completeness) ---
export const TextStyleControls: React.FC<{
  label: string;
  style: TextStyle;
  onChange: (next: TextStyle) => void;
}> = ({ label, style, onChange }) => {
  const defaultText: TextStyle = {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 500,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 50,
    textColor: '#FFFFFF',
    withBg: false,
    bgColor: 'transparent',
    bgOpacity: 0,
    padding: 4,
    borderRadius: 4,
    textAlign: 'center',
    position: { x: 0, y: 0 },
    width: 25,
    verticalAlign: 'flex-end',
    horizontalAlign: 'center',
  };

  const update = <K extends keyof TextStyle>(k: K, v: TextStyle[K]) =>
    onChange({ ...style, [k]: v });

  const alignmentGrid: { v: TextStyle['verticalAlign']; h: TextStyle['horizontalAlign'] }[] = [
    { v: 'flex-start', h: 'flex-start' },
    { v: 'flex-start', h: 'center' },
    { v: 'flex-start', h: 'flex-end' },
    { v: 'center', h: 'flex-start' },
    { v: 'center', h: 'center' },
    { v: 'center', h: 'flex-end' },
    { v: 'flex-end', h: 'flex-start' },
    { v: 'flex-end', h: 'center' },
    { v: 'flex-end', h: 'flex-end' },
  ];

  return (
    <div className="p-4 rounded-xl border border-app-border bg-app-surface shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-app-text text-lg">{label} Style</h3>
        <button
          onClick={() => onChange(defaultText)}
          className="px-3 py-1 text-xs rounded-lg bg-app-gray-light hover:bg-danger hover:text-white transition"
        >
          Reset
        </button>
      </div>

      <div>
        <label className="text-xs text-app-gray mb-2 block">Position</label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-app-gray-dark rounded-md">
          {alignmentGrid.map((align, i) => (
            <button
              key={i}
              onClick={() =>
                onChange({
                  ...style,
                  verticalAlign: align.v,
                  horizontalAlign: align.h,
                })
              }
              className={`h-8 rounded transition-colors ${
                style.verticalAlign === align.v && style.horizontalAlign === align.h
                  ? 'bg-primary'
                  : 'bg-app-gray-light hover:bg-app-gray'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Slider label="Width" value={style.width} min={10} max={100} onChange={(v) => update('width', v)} />
        <Slider
          label="X Offset"
          value={style.position.x}
          min={0}
          max={100}
          onChange={(v) => update('position', { ...style.position, x: v })}
        />
        <Slider
          label="Y Offset"
          value={style.position.y}
          min={0}
          max={100}
          onChange={(v) => update('position', { ...style.position, y: v })}
        />
      </div>

      <hr className="border-app-border" />

      <div className="grid grid-cols-2 gap-4">
        <Dropdown
          id={`${label}-font`}
          name="fontFamily"
          label="Font Family"
          value={style.fontFamily}
          options={[
            { value: 'Inter', label: 'Inter' },
            { value: 'Arial', label: 'Arial' },
            { value: 'Roboto', label: 'Roboto' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
          ]}
          onChange={(_, value) => update('fontFamily', value as string)}
        />

        <Dropdown
          id={`${label}-weight`}
          name="fontWeight"
          label="Font Weight"
          value={String(style.fontWeight)}
          options={[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => ({
            value: String(w),
            label: String(w),
          }))}
          onChange={(_, value) => update('fontWeight', Number(value))}
        />

        <Slider label="Font Size" value={style.fontSize} min={8} max={100} onChange={(v) => update('fontSize', v)} />

        <Slider label="Line Height" value={style.lineHeight} min={10} max={200} onChange={(v) => update('lineHeight', v)} />

        <Slider
          label="Letter Spacing"
          value={style.letterSpacing}
          min={-2}
          max={20}
          onChange={(v) => update('letterSpacing', v)}
        />

        <Dropdown
          id={`${label}-align`}
          name="textAlign"
          label="Align"
          value={style.textAlign}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(_, value) => update('textAlign', value as TextStyle['textAlign'])}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-app-gray">Text Color</label>
          <input
            type="color"
            value={style.textColor}
            onChange={(e) => update('textColor', e.target.value)}
            className="color-picker"
          />
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            label="Background"
            checked={style.withBg}
            onChange={(checked) => update('withBg', checked)}
          />
          <input
            type="color"
            value={style.bgColor}
            disabled={!style.withBg}
            onChange={(e) => update('bgColor', e.target.value)}
            className="w-10 h-8 border border-app-border rounded cursor-pointer disabled:opacity-50"
          />
          <Slider
            label={`Opacity: ${style.bgOpacity}`}
            value={style.bgOpacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => update('bgOpacity', v)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Slider label="Padding" value={style.padding} min={0} max={64} onChange={(v) => update('padding', v)} />

        <Slider label="Border Radius" value={style.borderRadius} min={0} max={64} onChange={(v) => update('borderRadius', v)} />
      </div>
    </div>
  );
};

// --- Main Component ---
export const LyricsSubtitlesPanel: React.FC<LyricsSubtitlesPanelProps> = ({
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
  handleSplitSubtitle,
  handleBatchAddLyrics,
  handleBatchAddSubtitles,
  formatTime,
  isLeftPanelFilled,
  setIsLeftPanelFilled,
  isVerticalLayout,
  isLeftPanelTopRowFilled,
  setIsLeftPanelTopRowFilled,
  selectedSubtitleIds,
  toggleSubtitleSelection,
  lyricTextStyle,
  setLyricTextStyle,
  subtitleTextStyle,
  setSubtitleTextStyle,
  subtitleLanguage,
  setSubtitleLanguage,
  onOpenStageSettingsModal,
  currentTime = 0,
  mediaDuration = 300,
  settings,
}) => {
  const lyricsListRef = useRef<HTMLDivElement>(null);
  const subtitlesListRef = useRef<HTMLDivElement>(null);
  const prevLyricsCountRef = useRef(lyrics.length);
  const prevSubtitlesCountRef = useRef(subtitles.length);

  const [selectedLyricIds, setSelectedLyricIds] = useState<Set<string>>(new Set());
  const toggleLyricSelection = useCallback((id: string) => {
    setSelectedLyricIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clipRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const [lyricsPasteText, setLyricsPasteText] = useState('');
  const [subtitlesPasteText, setSubtitlesPasteText] = useState('');

  const [isLyricsTextareaExpanded, setIsLyricsTextareaExpanded] = useState(true);
  const [isSubtitlesTextareaExpanded, setIsSubtitlesTextareaExpanded] = useState(true);

  const [estimatedClips, setEstimatedClips] = useState<Array<{ text: string; duration: number }>>([]);
  const [showPreview, setShowPreview] = useState(false);

  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const lastScrolledClipIdRef = useRef<string | null>(null);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'above' | 'below' } | null>(null);

  // Copy/Paste
  const [copiedClip, setCopiedClip] = useState<LyricLine | null>(null);

  const sortedSubtitles = useMemo(
    () => [...subtitles].sort((a, b) => a.startTime - b.startTime),
    [subtitles]
  );
  const sortedLyrics = useMemo(
    () => [...lyrics].sort((a, b) => a.startTime - b.startTime),
    [lyrics]
  );

  const activeList = activeLeftPanelTab === 'subtitles' ? sortedSubtitles : sortedLyrics;
  const listRef = activeLeftPanelTab === 'subtitles' ? subtitlesListRef : lyricsListRef;

  const allSubtitlesSelected = sortedSubtitles.length > 0 && sortedSubtitles.length === selectedSubtitleIds.size;
  const allLyricsSelected = sortedLyrics.length > 0 && sortedLyrics.length === selectedLyricIds.size;

  const handleSelectAllSubtitles = () => {
    const shouldSelect = !allSubtitlesSelected;
    sortedSubtitles.forEach((s) => {
      const isSelected = selectedSubtitleIds.has(s.id);
      if (shouldSelect && !isSelected) toggleSubtitleSelection(s.id);
      else if (!shouldSelect && isSelected) toggleSubtitleSelection(s.id);
    });
  };

  const handleDeleteSelectedSubtitles = () => {
    const ids = Array.from(selectedSubtitleIds);
    ids.forEach((id) => {
      handleDeleteSubtitle(id);
      if (selectedSubtitleIds.has(id)) toggleSubtitleSelection(id);
    });
  };

  const handleSelectAllLyrics = () => {
    if (allLyricsSelected) setSelectedLyricIds(new Set());
    else setSelectedLyricIds(new Set(sortedLyrics.map((l) => l.id)));
  };

  const handleDeleteSelectedLyrics = () => {
    selectedLyricIds.forEach((id) => handleDeleteLyric(id));
    setSelectedLyricIds(new Set());
  };

  // Set default text for newly added clips
  useEffect(() => {
    if (subtitles.length > prevSubtitlesCountRef.current) {
      const newClips = subtitles.slice(prevSubtitlesCountRef.current);
      newClips.forEach((clip) => {
        if (!clip.text || clip.text.trim() === '') {
          handleSubtitleChange(clip.id, 'text', 'New Subtitle');
        }
      });
    }
    prevSubtitlesCountRef.current = subtitles.length;
  }, [subtitles, handleSubtitleChange]);

  useEffect(() => {
    if (lyrics.length > prevLyricsCountRef.current) {
      const newClips = lyrics.slice(prevLyricsCountRef.current);
      newClips.forEach((clip) => {
        if (!clip.text || clip.text.trim() === '') {
          handleLyricChange(clip.id, 'text', 'New Lyric');
        }
      });
    }
    prevLyricsCountRef.current = lyrics.length;
  }, [lyrics, handleLyricChange]);

  // Active clip tracking
  useEffect(() => {
    if (!activeList.length) {
      setActiveClipId(null);
      return;
    }
    const activeClip = activeList.find(
      (clip) => currentTime >= clip.startTime && currentTime <= clip.endTime
    );
    setActiveClipId(activeClip ? activeClip.id : null);
  }, [currentTime, activeList]);

  // Scroll to active clip
  useEffect(() => {
    if (!activeClipId) return;
    if (lastScrolledClipIdRef.current === activeClipId) return;

    const clipElement = clipRefs.current.get(activeClipId);
    const container = listRef.current;

    if (clipElement && container) {
      const containerRect = container.getBoundingClientRect();
      const clipRect = clipElement.getBoundingClientRect();

      const clipCenter = clipRect.top + clipRect.height / 2;
      const containerCenter = containerRect.top + containerRect.height / 2;
      const distanceFromCenter = Math.abs(clipCenter - containerCenter);

      if (distanceFromCenter > 100) {
        const scrollTop =
          clipElement.offsetTop - container.clientHeight / 2 + clipElement.clientHeight / 2;
        container.scrollTo({ top: scrollTop, behavior: 'smooth' });
        lastScrolledClipIdRef.current = activeClipId;
        setTimeout(() => {
          lastScrolledClipIdRef.current = null;
        }, 500);
      }
    }
  }, [activeClipId, listRef]);

  // Keyboard shortcuts (t, Ctrl+C, Ctrl+V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (activeSubTab !== 'edit') return;

      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const selectedSet = activeLeftPanelTab === 'subtitles' ? selectedSubtitleIds : selectedLyricIds;
        const firstSelectedId = Array.from(selectedSet)[0];
        const textarea = textareaRefs.current.get(firstSelectedId);
        if (textarea) {
          textarea.focus();
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (activeLeftPanelTab === 'subtitles' && selectedSubtitleIds.size === 1) {
          e.preventDefault();
          const id = Array.from(selectedSubtitleIds)[0];
          const clip = sortedSubtitles.find((c) => c.id === id);
          if (clip) setCopiedClip({ ...clip });
        } else if (activeLeftPanelTab === 'lyrics' && selectedLyricIds.size === 1) {
          e.preventDefault();
          const id = Array.from(selectedLyricIds)[0];
          const clip = sortedLyrics.find((c) => c.id === id);
          if (clip) setCopiedClip({ ...clip });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedClip && mediaDuration > 0) {
          e.preventDefault();
          const duration = copiedClip.endTime - copiedClip.startTime;
          const newStart = Math.min(currentTime, mediaDuration - 0.001);
          const newEnd = Math.min(newStart + duration, mediaDuration);
          const newClip = {
            text: copiedClip.text,
            startTime: newStart,
            endTime: newEnd,
          };
          if (activeLeftPanelTab === 'subtitles' && handleBatchAddSubtitles) {
            handleBatchAddSubtitles([newClip]);
          } else if (activeLeftPanelTab === 'lyrics' && handleBatchAddLyrics) {
            handleBatchAddLyrics([newClip]);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedSubtitleIds,
    selectedLyricIds,
    activeSubTab,
    activeLeftPanelTab,
    copiedClip,
    sortedSubtitles,
    sortedLyrics,
    currentTime,
    mediaDuration,
    handleBatchAddSubtitles,
    handleBatchAddLyrics,
  ]);

  // Preview timing estimation (unchanged)
  useEffect(() => {
    if (!lyricsPasteText.trim() && !subtitlesPasteText.trim()) {
      setEstimatedClips([]);
      setShowPreview(false);
      return;
    }

    const text = activeLeftPanelTab === 'subtitles' ? subtitlesPasteText : lyricsPasteText;
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setEstimatedClips([]);
      return;
    }

    const startTime = Math.max(0, currentTime);
    const remainingDuration = mediaDuration - startTime;

    const timingConfig =
      activeLeftPanelTab === 'subtitles'
        ? getTimingConfigForLanguage(subtitleLanguage)
        : { readingSpeed: settings?.defaultReadingSpeed || 'normal' };

    const clips = calculateSmartTiming(lines, startTime, remainingDuration, {
      baseDurationPerChar:
        settings?.timing?.baseDurationPerChar || DEFAULT_CONFIG.baseDurationPerChar,
      minDuration: settings?.timing?.minClipDuration || DEFAULT_CONFIG.minDuration,
      maxDuration: settings?.timing?.maxClipDuration || DEFAULT_CONFIG.maxDuration,
      pauseBetweenClips:
        settings?.timing?.pauseBetweenClips || DEFAULT_CONFIG.pauseBetweenClips,
      readingSpeed: settings?.defaultReadingSpeed || 'normal',
      ...timingConfig,
    });

    setEstimatedClips(
      clips.map((clip) => ({
        text: clip.text,
        duration: clip.endTime - clip.startTime,
      }))
    );
    setShowPreview(true);
  }, [
    lyricsPasteText,
    subtitlesPasteText,
    activeLeftPanelTab,
    currentTime,
    mediaDuration,
    subtitleLanguage,
    settings,
  ]);

  const handleAutoSyncLyrics = useCallback(() => {
    if (!lyricsPasteText.trim() || !handleBatchAddLyrics) return;

    const lines = lyricsPasteText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    const startTime = Math.max(0, currentTime);
    const remainingDuration = mediaDuration - startTime;

    const clips = calculateSmartTiming(lines, startTime, remainingDuration, {
      baseDurationPerChar:
        settings?.timing?.baseDurationPerChar || DEFAULT_CONFIG.baseDurationPerChar,
      minDuration: settings?.timing?.minClipDuration || DEFAULT_CONFIG.minDuration,
      maxDuration: settings?.timing?.maxClipDuration || DEFAULT_CONFIG.maxDuration,
      pauseBetweenClips:
        settings?.timing?.pauseBetweenClips || DEFAULT_CONFIG.pauseBetweenClips,
      readingSpeed: settings?.defaultReadingSpeed || 'normal',
    });

    handleBatchAddLyrics(clips);
    setLyricsPasteText('');
    setEstimatedClips([]);
    setShowPreview(false);
    setIsLyricsTextareaExpanded(false);
  }, [lyricsPasteText, mediaDuration, currentTime, handleBatchAddLyrics, settings]);

  const handleAutoSyncSubtitles = useCallback(() => {
    if (!subtitlesPasteText.trim() || !handleBatchAddSubtitles) return;

    const lines = subtitlesPasteText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    const startTime = Math.max(0, currentTime);
    const remainingDuration = mediaDuration - startTime;

    const languageConfig = getTimingConfigForLanguage(subtitleLanguage);

    const clips = calculateSmartTiming(lines, startTime, remainingDuration, {
      baseDurationPerChar:
        settings?.timing?.baseDurationPerChar || DEFAULT_CONFIG.baseDurationPerChar,
      minDuration: settings?.timing?.minClipDuration || DEFAULT_CONFIG.minDuration,
      maxDuration: settings?.timing?.maxClipDuration || DEFAULT_CONFIG.maxDuration,
      pauseBetweenClips:
        settings?.timing?.pauseBetweenClips || DEFAULT_CONFIG.pauseBetweenClips,
      readingSpeed: settings?.defaultReadingSpeed || 'normal',
      ...languageConfig,
    });

    handleBatchAddSubtitles(clips);
    setSubtitlesPasteText('');
    setEstimatedClips([]);
    setShowPreview(false);
    setIsSubtitlesTextareaExpanded(false);
  }, [
    subtitlesPasteText,
    mediaDuration,
    currentTime,
    handleBatchAddSubtitles,
    subtitleLanguage,
    settings,
  ]);

  // Auto-scroll for new clips
  useEffect(() => {
    if (lyrics.length > prevLyricsCountRef.current) {
      const lyricsList = lyricsListRef.current;
      if (lyricsList) {
        setTimeout(() => lyricsList.scrollTo({ top: lyricsList.scrollHeight, behavior: 'smooth' }), 0);
      }
    }
  }, [lyrics.length]);

  useEffect(() => {
    if (subtitles.length > prevSubtitlesCountRef.current) {
      const subtitlesList = subtitlesListRef.current;
      if (subtitlesList) {
        setTimeout(() => subtitlesList.scrollTo({ top: subtitlesList.scrollHeight, behavior: 'smooth' }), 0);
      }
    }
  }, [subtitles.length]);

  // Drag & drop logic (unchanged)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedItemId === targetId) return;

    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    const position = e.clientY < midY ? 'above' : 'below';
    setDropTarget({ id: targetId, position });
  };

  const handleDrop = (
    e: React.DragEvent,
    list: LyricLine[],
    onChange: (id: string, field: 'startTime', val: number) => void
  ) => {
    e.preventDefault();

    if (!draggedItemId || !dropTarget || draggedItemId === dropTarget.id) {
      setDraggedItemId(null);
      setDropTarget(null);
      return;
    }

    const draggedItem = list.find((item) => item.id === draggedItemId);
    if (!draggedItem) return;

    const targetIndex = list.findIndex((item) => item.id === dropTarget.id);
    if (targetIndex === -1) return;

    let newStartTime = 0;
    const targetItem = list[targetIndex];
    const clipDuration = draggedItem.endTime - draggedItem.startTime;

    if (dropTarget.position === 'above') {
      const prevItem = targetIndex > 0 ? list[targetIndex - 1] : null;
      if (prevItem && prevItem.id !== draggedItemId) {
        newStartTime = (prevItem.endTime + targetItem.startTime) / 2;
        if (newStartTime < prevItem.endTime) newStartTime = prevItem.endTime + 0.1;
      } else {
        newStartTime = Math.max(0, targetItem.startTime - clipDuration - 0.5);
      }
    } else {
      const nextItem = targetIndex < list.length - 1 ? list[targetIndex + 1] : null;
      if (nextItem && nextItem.id !== draggedItemId) {
        newStartTime = (targetItem.endTime + nextItem.startTime) / 2;
        if (newStartTime < targetItem.endTime) newStartTime = targetItem.endTime + 0.1;
      } else {
        newStartTime = targetItem.endTime + 0.5;
      }
    }

    onChange(draggedItemId, 'startTime', newStartTime);
    setDraggedItemId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDropTarget(null);
  };

  const DropIndicator = ({ position }: { position: 'above' | 'below' }) => (
    <div
      className={`absolute left-0 right-0 h-0.5 bg-primary z-10 pointer-events-none transform ${
        position === 'above' ? '-top-[2px]' : '-bottom-[2px]'
      }`}
    >
      <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-primary" />
      <div className="absolute -right-1 -top-[3px] w-2 h-2 rounded-full bg-primary" />
    </div>
  );

  const renderList = (
    list: LyricLine[],
    onChange: any,
    deleteFn: any,
    isSubtitles: boolean
  ) => {
    const selectedSet = isSubtitles ? selectedSubtitleIds : selectedLyricIds;
    const toggleFn = isSubtitles ? toggleSubtitleSelection : toggleLyricSelection;

    return (
      <div
        className="space-y-3 overflow-y-auto lyrics-list-scrollbar min-h-0 relative scroll-smooth pr-1 pb-4"
        ref={isSubtitles ? subtitlesListRef : lyricsListRef}
      >
        {list.map((line) => (
          <div
            key={line.id}
            ref={(el) => {
              if (el) clipRefs.current.set(line.id, el);
              else clipRefs.current.delete(line.id);
            }}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, line.id)}
            onDragOver={(e) => handleDragOver(e, line.id)}
            onDrop={(e) => handleDrop(e, list, onChange)}
            onDragEnd={handleDragEnd}
            className={`relative flex flex-wrap items-center p-3 rounded-md border transition-colors duration-200 cursor-default
              ${
                selectedSet.has(line.id)
                  ? 'bg-primary/10 border-2 border-dashed border-primary shadow-md'
                  : activeClipId === line.id
                  ? 'bg-primary/15 border-primary ring-1 ring-primary'
                  : 'bg-app-gray-light border-app-border'
              }
              ${draggedItemId === line.id ? 'opacity-40' : ''}`}
          >
            {dropTarget?.id === line.id && (
              <DropIndicator position={dropTarget.position} />
            )}

            <div
              className="cursor-move mr-2 text-app-gray hover:text-app-text flex-shrink-0"
              title="Drag to reorder"
            >
              <GripVertical size={14} />
            </div>

            <button
              onClick={() => toggleFn(line.id)}
              className="mr-3 text-app-icon-color flex-shrink-0"
            >
              {selectedSet.has(line.id) ? (
                <CheckSquare size={18} className="text-primary" />
              ) : (
                <Square size={18} />
              )}
            </button>

            <textarea
              ref={(el) => {
                if (el) textareaRefs.current.set(line.id, el);
                else textareaRefs.current.delete(line.id);
              }}
              spellCheck={false}
              value={line.text}
              onChange={(e) => onChange(line.id, 'text', e.target.value)}
              className={`flex-1 min-w-[150px] bg-transparent border-none outline-none text-app-text text-sm mr-2 resize-none
                ${activeClipId === line.id ? 'font-medium' : ''}`}
              rows={1}
            />

            <div className="flex items-center mt-2 md:mt-0 ml-auto flex-shrink-0">
              <input
                type="text"
                value={formatTime(line.startTime)}
                onChange={(e) => onChange(line.id, 'startTime', e.target.value)}
                className={`w-24 bg-app-input-bg border rounded-sm px-1 py-0.5 text-xs text-app-text text-center focus:ring-1 focus:ring-primary outline-none ${
                  activeClipId === line.id ? 'border-primary bg-primary' : 'border-app-border'
                }`}
                title="Start Time"
              />
              <span className="text-app-gray mx-1">-</span>
              <input
                type="text"
                value={formatTime(line.endTime)}
                onChange={(e) => onChange(line.id, 'endTime', e.target.value)}
                className={`w-24 bg-app-input-bg border rounded-sm px-1 py-0.5 text-xs text-app-text text-center focus:ring-1 focus:ring-primary outline-none ${
                  activeClipId === line.id ? 'border-primary bg-primary/5' : 'border-app-border'
                }`}
                title="End Time"
              />
              <button
                onClick={() => deleteFn(line.id)}
                className="ml-2 p-1 rounded-full hover:bg-danger text-app-icon-color hover:text-white"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-app-surface p-4 rounded-lg border border-app-border h-full flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="flex-shrink-0 space-y-3 pb-3">
        <div className="flex justify-between">
          <h3 className="text-xl font-semibol flex items-center">
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

        <div className="tab-navigation-panel flex bg-app-gray-dark rounded-lg p-1">
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeLeftPanelTab === 'subtitles'
                ? 'bg-primary text-white'
                : 'text-app-gray hover:bg-app-gray-light'
            }`}
            onClick={() => setActiveLeftPanelTab('subtitles')}
          >
            <Type className="inline mr-2" size={16} /> Subtitles
          </button>
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeLeftPanelTab === 'lyrics'
                ? 'bg-primary text-white'
                : 'text-app-gray hover:bg-app-gray-light'
            }`}
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

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeSubTab === 'edit' &&
          (activeLeftPanelTab === 'subtitles' ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-shrink-0 space-y-3 pb-4">
                <div className="px-0.5">
                  <button
                    onClick={() => setIsSubtitlesTextareaExpanded(!isSubtitlesTextareaExpanded)}
                    className="w-full flex items-center justify-between p-2 bg-app-gray-light rounded-md hover:bg-app-gray transition-colors"
                  >
                    <span className="text-sm font-medium flex items-center gap-2">
                      <FileText size={16} />
                      Paste Subtitles
                    </span>
                    {isSubtitlesTextareaExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>

                  {isSubtitlesTextareaExpanded && (
                    <textarea
                      value={subtitlesPasteText}
                      onChange={(e) => setSubtitlesPasteText(e.target.value)}
                      className="w-full h-24 p-3 mt-2 border border-app-border rounded-md focus:ring-2 focus:ring-primary outline-none bg-app-input-bg text-app-text text-sm resize-none"
                      placeholder="Paste subtitles here. Each line will become a separate subtitle clip."
                    />
                  )}
                </div>

                {showPreview && estimatedClips.length > 0 && (
                  <div className="p-3 bg-app-gray-light rounded-md border border-app-border">
                    <div className="flex items-center mb-2">
                      <Clock size={14} className="text-primary mr-2" />
                      <span className="text-xs font-medium">Estimated Timing Preview</span>
                      <span className="ml-auto text-xs text-app-gray">
                        {estimatedClips.length} clips · Total:{' '}
                        {estimatedClips
                          .reduce((sum, clip) => sum + clip.duration, 0)
                          .toFixed(1)}
                        s
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      {estimatedClips.slice(0, 3).map((clip, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate flex-1">{clip.text}</span>
                          <span className="text-app-gray ml-2">{clip.duration.toFixed(1)}s</span>
                        </div>
                      ))}
                      {estimatedClips.length > 3 && (
                        <div className="text-app-gray">
                          ...and {estimatedClips.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Dropdown
                  id="subtitle-language"
                  name="language"
                  label="Language"
                  value={subtitleLanguage}
                  options={[
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
                  ]}
                  onChange={(_, value) => setSubtitleLanguage(value as string)}
                />

                <button
                  onClick={handleAutoSyncSubtitles}
                  disabled={!subtitlesPasteText.trim() || !handleBatchAddSubtitles}
                  className="w-full px-4 py-2 bg-success text-white rounded-md hover:bg-opacity-80 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    !handleBatchAddSubtitles ? 'Batch add function not available' : ''
                  }
                >
                  <Zap className="mr-2" size={18} /> Auto Generate Subtitles
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleAddSubtitle}
                    className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm"
                  >
                    <Plus className="mr-1" size={14} /> Add
                  </button>
                  <button
                    onClick={handleSplitSubtitle}
                    disabled={selectedSubtitleIds.size !== 1}
                    className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Split className="mr-1" size={14} /> Split
                  </button>
                  <button
                    onClick={handleMergeSubtitles}
                    disabled={selectedSubtitleIds.size < 2}
                    className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Combine className="mr-1" size={14} /> Merge
                  </button>

                  <button
                    onClick={handleSelectAllSubtitles}
                    className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm col-span-1"
                  >
                    <CheckSquare className="mr-1" size={14} />{' '}
                    {allSubtitlesSelected ? 'None' : 'All'}
                  </button>
                  <button
                    onClick={handleDeleteSelectedSubtitles}
                    disabled={selectedSubtitleIds.size === 0}
                    className="px-2 py-2 bg-app-gray-light text-danger rounded-md hover:bg-danger/10 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
                  >
                    <Trash2 className="mr-1" size={14} /> Delete (
                    {selectedSubtitleIds.size})
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                {renderList(sortedSubtitles, handleSubtitleChange, handleDeleteSubtitle, true)}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-shrink-0 space-y-3 pb-4">
                <div className="px-0.5">
                  <button
                    onClick={() => setIsLyricsTextareaExpanded(!isLyricsTextareaExpanded)}
                    className="w-full flex items-center justify-between p-2 bg-app-gray-light rounded-md hover:bg-app-gray transition-colors"
                  >
                    <span className="text-sm font-medium flex items-center gap-2">
                      <FileText size={16} />
                      Paste Lyrics
                    </span>
                    {isLyricsTextareaExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>

                  {isLyricsTextareaExpanded && (
                    <textarea
                      value={lyricsPasteText}
                      onChange={(e) => setLyricsPasteText(e.target.value)}
                      spellCheck={false}
                      className="w-full h-24 p-3 mt-2 border border-app-border rounded-md focus:ring-2 focus:ring-primary outline-none bg-app-input-bg text-app-text text-sm resize-none"
                      placeholder="Paste lyrics here. Each line will become a separate lyric clip."
                    />
                  )}
                </div>

                {showPreview && estimatedClips.length > 0 && (
                  <div className="p-3 bg-app-gray-light rounded-md border border-app-border">
                    <div className="flex items-center mb-2">
                      <Clock size={14} className="text-primary mr-2" />
                      <span className="text-xs font-medium">Estimated Timing Preview</span>
                      <span className="ml-auto text-xs text-app-gray">
                        {estimatedClips.length} clips · Total:{' '}
                        {estimatedClips
                          .reduce((sum, clip) => sum + clip.duration, 0)
                          .toFixed(1)}
                        s
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      {estimatedClips.slice(0, 3).map((clip, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate flex-1">{clip.text}</span>
                          <span className="text-app-gray ml-2">{clip.duration.toFixed(1)}s</span>
                        </div>
                      ))}
                      {estimatedClips.length > 3 && (
                        <div className="text-app-gray">
                          ...and {estimatedClips.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAutoSyncLyrics}
                  disabled={!lyricsPasteText.trim() || !handleBatchAddLyrics}
                  className="w-full px-4 py-2 bg-success text-white rounded-md hover:bg-opacity-80 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!handleBatchAddLyrics ? 'Batch add function not available' : ''}
                >
                  <Zap className="mr-2" size={18} /> Auto-Sync Lyrics
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      if (handleAddLyric) handleAddLyric();
                    }}
                    className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm"
                  >
                    <Plus className="mr-1" size={14} /> Add
                  </button>
                  <button
                    onClick={handleSelectAllLyrics}
                    className="px-2 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center justify-center text-sm col-span-1"
                  >
                    <CheckSquare className="mr-1" size={14} />{' '}
                    {allLyricsSelected ? 'None' : 'All'}
                  </button>
                  <button
                    onClick={handleDeleteSelectedLyrics}
                    disabled={selectedLyricIds.size === 0}
                    className="px-2 py-2 bg-app-gray-light text-danger rounded-md hover:bg-danger/10 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed col-span-1"
                  >
                    <Trash2 className="mr-1" size={14} /> Delete
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                {renderList(sortedLyrics, handleLyricChange, handleDeleteLyric, false)}
              </div>
            </div>
          ))}

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
              currentStyle={
                activeLeftPanelTab === 'lyrics' ? lyricTextStyle : subtitleTextStyle
              }
              onSelectTextStyle={
                activeLeftPanelTab === 'lyrics'
                  ? setLyricTextStyle
                  : setSubtitleTextStyle
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};
