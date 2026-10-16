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
  Upload,
} from 'lucide-react';
import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { LyricLine, TextStyle } from '../../types/types';
import { TemplatesContent } from '../modals/TemplatesContent';
import { Dropdown } from '../ui/Dropdown';
import { Slider } from '../ui/Slider';
import { Checkbox } from '../ui/Checkbox';
import {
  calculateSmartTiming,
  getTimingConfigForLanguage,
  DEFAULT_CONFIG,
} from '../../utils/timingUtils';
import { timeStringToSeconds } from '../../utils/formatTime';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';

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

export const TextStyleControls: React.FC<{
  label: string;
  style: TextStyle;
  onChange: (next: TextStyle) => void;
}> = ({ label, style, onChange }) => {
  const defaults: TextStyle = {
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

  const grid: { v: TextStyle['verticalAlign']; h: TextStyle['horizontalAlign'] }[] = [
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
          onClick={() => onChange(defaults)}
          className="px-3 py-1 text-xs rounded-lg bg-app-gray-light hover:bg-danger hover:text-white"
        >
          Reset
        </button>
      </div>

      <div>
        <label className="text-xs text-app-gray mb-2 block">Position</label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-app-gray-dark rounded-md">
          {grid.map((a, i) => (
            <button
              key={i}
              onClick={() =>
                onChange({ ...style, verticalAlign: a.v, horizontalAlign: a.h })
              }
              className={`h-8 rounded ${
                style.verticalAlign === a.v && style.horizontalAlign === a.h
                  ? 'bg-primary'
                  : 'bg-app-gray-light hover:bg-app-gray'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Slider label="Width" value={style.width} min={10} max={100} onChange={(v) => update('width', v)} />
        <Slider label="X Offset" value={style.position.x} min={0} max={100} onChange={(v) => update('position', { ...style.position, x: v })} />
        <Slider label="Y Offset" value={style.position.y} min={0} max={100} onChange={(v) => update('position', { ...style.position, y: v })} />
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
        <Slider label="Letter Spacing" value={style.letterSpacing} min={-2} max={20} onChange={(v) => update('letterSpacing', v)} />

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
    formatTime,
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
  } = ctx;

  const lyricsListRef = useRef<HTMLDivElement>(null);
  const subtitlesListRef = useRef<HTMLDivElement>(null);

  const subtitleFileInputRef = useRef<HTMLInputElement>(null);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);

  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const clipRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const [lyricsPasteText, setLyricsPasteText] = useState('');
  const [subtitlesPasteText, setSubtitlesPasteText] = useState('');
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(true);
  const [isSubtitlesExpanded, setIsSubtitlesExpanded] = useState(true);

  const [estimatedClips, setEstimatedClips] = useState<
    { text: string; duration: number }[]
  >([]);
  const [showPreview, setShowPreview] = useState(false);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: 'above' | 'below';
  } | null>(null);

  const sortedSubtitles = useMemo(
    () => [...subtitles].sort((a, b) => a.startTime - b.startTime),
    [subtitles],
  );
  const sortedLyrics = useMemo(
    () => [...lyrics].sort((a, b) => a.startTime - b.startTime),
    [lyrics],
  );

  const activeList = activeLeftPanelTab === 'subtitles' ? sortedSubtitles : sortedLyrics;
  const listRef = activeLeftPanelTab === 'subtitles' ? subtitlesListRef : lyricsListRef;
  const selectedSet = activeLeftPanelTab === 'subtitles' ? selectedSubtitleIds : selectedLyricIds;

  const allSelected = activeList.length > 0 && activeList.length === selectedSet.size;

  useEffect(() => {
    if (!activeList.length) {
      setActiveClipId(null);
      return;
    }
    const clip = activeList.find(
      (c) => currentTime >= c.startTime && currentTime <= c.endTime,
    );
    setActiveClipId(clip?.id ?? null);
  }, [currentTime, activeList]);

  // Auto-scroll active clip into view
  const lastScrolledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeClipId || lastScrolledRef.current === activeClipId) return;
    const el = clipRefs.current.get(activeClipId);
    const container = listRef.current;
    if (!el || !container) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const distance = Math.abs(
      eRect.top + eRect.height / 2 - (cRect.top + cRect.height / 2),
    );
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

  // Focus-selected shortcut (owned here rather than global because it needs textarea refs)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() !== 't') return;
      const t = e.target as HTMLElement | null;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t && t.isContentEditable)
      ) {
        return;
      }
      const id = [...selectedSet][0];
      if (!id) return;
      const ta = textareaRefs.current.get(id);
      if (!ta) return;
      e.preventDefault();
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSet]);

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

    const start = Math.max(0, currentTime);
    const remaining = mediaDuration - start;
    const langCfg =
      activeLeftPanelTab === 'subtitles'
        ? getTimingConfigForLanguage(subtitleLanguage)
        : {};

    const clips = calculateSmartTiming(lines, start, remaining, {
      baseDurationPerChar:
        settings?.timing?.baseDurationPerChar ?? DEFAULT_CONFIG.baseDurationPerChar,
      minDuration: settings?.timing?.minClipDuration ?? DEFAULT_CONFIG.minDuration,
      maxDuration: settings?.timing?.maxClipDuration ?? DEFAULT_CONFIG.maxDuration,
      pauseBetweenClips:
        settings?.timing?.pauseBetweenClips ?? DEFAULT_CONFIG.pauseBetweenClips,
      readingSpeed: settings?.defaultReadingSpeed ?? 'normal',
      ...langCfg,
    });

    setEstimatedClips(
      clips.map((c) => ({ text: c.text, duration: c.endTime - c.startTime })),
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

  const handleAutoSync = useCallback(
    (kind: 'lyrics' | 'subtitles') => {
      const text = kind === 'lyrics' ? lyricsPasteText : subtitlesPasteText;
      if (!text.trim()) return;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return;

      const start = Math.max(0, currentTime);
      const remaining = mediaDuration - start;
      const langCfg =
        kind === 'subtitles' ? getTimingConfigForLanguage(subtitleLanguage) : {};

      const clips = calculateSmartTiming(lines, start, remaining, {
        baseDurationPerChar:
          settings?.timing?.baseDurationPerChar ?? DEFAULT_CONFIG.baseDurationPerChar,
        minDuration: settings?.timing?.minClipDuration ?? DEFAULT_CONFIG.minDuration,
        maxDuration: settings?.timing?.maxClipDuration ?? DEFAULT_CONFIG.maxDuration,
        pauseBetweenClips:
          settings?.timing?.pauseBetweenClips ?? DEFAULT_CONFIG.pauseBetweenClips,
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
    [
      lyricsPasteText,
      subtitlesPasteText,
      currentTime,
      mediaDuration,
      subtitleLanguage,
      settings,
      handleBatchAddLyrics,
      handleBatchAddSubtitles,
    ],
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

  // Drag reorder
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemId === targetId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'above' | 'below' = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    setDropTarget({ id: targetId, position });
  };

  const handleDrop = (
    e: React.DragEvent,
    list: LyricLine[],
    onChange: (id: string, field: 'startTime', val: number) => void,
  ) => {
    e.preventDefault();
    if (!draggedItemId || !dropTarget || draggedItemId === dropTarget.id) {
      setDraggedItemId(null);
      setDropTarget(null);
      return;
    }
    const dragged = list.find((i) => i.id === draggedItemId);
    const targetIndex = list.findIndex((i) => i.id === dropTarget.id);
    if (!dragged || targetIndex === -1) {
      setDraggedItemId(null);
      setDropTarget(null);
      return;
    }

    const target = list[targetIndex];
    const dur = dragged.endTime - dragged.startTime;
    let newStart = 0;

    if (dropTarget.position === 'above') {
      const prev = targetIndex > 0 ? list[targetIndex - 1] : null;
      if (prev && prev.id !== draggedItemId) {
        newStart = Math.max(prev.endTime + 0.1, (prev.endTime + target.startTime) / 2);
      } else {
        newStart = Math.max(0, target.startTime - dur - 0.5);
      }
    } else {
      const next = targetIndex < list.length - 1 ? list[targetIndex + 1] : null;
      if (next && next.id !== draggedItemId) {
        newStart = Math.max(target.endTime + 0.1, (target.endTime + next.startTime) / 2);
      } else {
        newStart = target.endTime + 0.5;
      }
    }

    onChange(draggedItemId, 'startTime', newStart);
    setDraggedItemId(null);
    setDropTarget(null);
  };

  const DropIndicator: React.FC<{ position: 'above' | 'below' }> = ({ position }) => (
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
    onChange: (id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => void,
    deleteFn: (id: string) => void,
    isSubtitles: boolean,
  ) => {
    const sel = isSubtitles ? selectedSubtitleIds : selectedLyricIds;
    const toggle = isSubtitles ? toggleSubtitleSelection : toggleLyricSelection;
    const ref = isSubtitles ? subtitlesListRef : lyricsListRef;

    return (
      <div
        className="space-y-3 overflow-y-auto lyrics-list-scrollbar min-h-0 relative pr-1 pb-4"
        ref={ref}
      >
        {list.map((line) => (
          <div
            key={line.id}
            ref={(el) => {
              if (el) clipRefs.current.set(line.id, el);
              else clipRefs.current.delete(line.id);
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, line.id)}
            onDragOver={(e) => handleDragOver(e, line.id)}
            onDrop={(e) => handleDrop(e, list, onChange)}
            onDragEnd={() => {
              setDraggedItemId(null);
              setDropTarget(null);
            }}
            className={`relative flex flex-wrap items-center p-3 rounded-md border cursor-default ${
              sel.has(line.id)
                ? 'bg-primary/10 border-2 border-dashed border-primary shadow-md'
                : activeClipId === line.id
                  ? 'bg-primary/15 border-primary ring-1 ring-primary'
                  : 'bg-app-gray-light border-app-border'
            } ${draggedItemId === line.id ? 'opacity-40' : ''}`}
          >
            {dropTarget?.id === line.id && <DropIndicator position={dropTarget.position} />}

            <div className="cursor-move mr-2 text-app-gray hover:text-app-text flex-shrink-0">
              <GripVertical size={14} />
            </div>

            <button
              onClick={() => toggle(line.id)}
              className="mr-3 text-app-icon-color flex-shrink-0"
            >
              {sel.has(line.id) ? (
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
              className={`flex-1 min-w-[150px] bg-transparent border-none outline-none text-app-text text-sm mr-2 resize-none ${
                activeClipId === line.id ? 'font-medium' : ''
              }`}
              rows={1}
            />

            <div className="flex items-center mt-2 md:mt-0 ml-auto flex-shrink-0">
              <TimeInput
                value={line.startTime}
                active={activeClipId === line.id}
                onChange={(v) => onChange(line.id, 'startTime', v)}
              />
              <span className="text-app-gray mx-1">-</span>
              <TimeInput
                value={line.endTime}
                active={activeClipId === line.id}
                onChange={(v) => onChange(line.id, 'endTime', v)}
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
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
              activeLeftPanelTab === 'subtitles'
                ? 'bg-primary text-white'
                : 'text-app-gray hover:bg-app-gray-light'
            }`}
            onClick={() => setActiveLeftPanelTab('subtitles')}
          >
            <Type className="inline mr-2" size={16} /> Subtitles
          </button>
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
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

      <div className="flex-1 min-h-0 flex flex-col">
        {activeSubTab === 'edit' && (
          <div className="flex flex-col h-full overflow-hidden">
            <input
              ref={
                activeLeftPanelTab === 'subtitles'
                  ? subtitleFileInputRef
                  : lyricsFileInputRef
              }
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
                value={
                  activeLeftPanelTab === 'subtitles'
                    ? subtitlesPasteText
                    : lyricsPasteText
                }
                onChange={
                  activeLeftPanelTab === 'subtitles'
                    ? setSubtitlesPasteText
                    : setLyricsPasteText
                }
                expanded={
                  activeLeftPanelTab === 'subtitles'
                    ? isSubtitlesExpanded
                    : isLyricsExpanded
                }
                onToggle={() =>
                  activeLeftPanelTab === 'subtitles'
                    ? setIsSubtitlesExpanded((v) => !v)
                    : setIsLyricsExpanded((v) => !v)
                }
                placeholder={`Paste ${activeLeftPanelTab} here. Each line becomes a clip.`}
              />

              <button
                onClick={() =>
                  (activeLeftPanelTab === 'subtitles'
                    ? subtitleFileInputRef
                    : lyricsFileInputRef
                  ).current?.click()
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

              <button
                onClick={() =>
                  handleAutoSync(
                    activeLeftPanelTab === 'subtitles' ? 'subtitles' : 'lyrics',
                  )
                }
                disabled={
                  !(activeLeftPanelTab === 'subtitles'
                    ? subtitlesPasteText.trim()
                    : lyricsPasteText.trim())
                }
                className="w-full px-4 py-2 bg-success text-white rounded-md hover:bg-opacity-80 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="mr-2" size={18} />
                {activeLeftPanelTab === 'subtitles'
                  ? 'Auto Generate Subtitles'
                  : 'Auto-Sync Lyrics'}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={
                    activeLeftPanelTab === 'subtitles'
                      ? handleAddSubtitle
                      : handleAddLyric
                  }
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
                  <CheckSquare className="mr-1" size={14} />{' '}
                  {allSelected ? 'None' : 'All'}
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
              {activeLeftPanelTab === 'subtitles'
                ? renderList(sortedSubtitles, handleSubtitleChange, handleDeleteSubtitle, true)
                : renderList(sortedLyrics, handleLyricChange, handleDeleteLyric, false)}
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

// ---------- small internal components ----------

const TimeInput: React.FC<{
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

const ExpandableTextarea: React.FC<{
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

const TimingPreview: React.FC<{ clips: { text: string; duration: number }[] }> = ({
  clips,
}) => (
  <div className="p-3 bg-app-gray-light rounded-md border border-app-border">
    <div className="flex items-center mb-2">
      <Clock size={14} className="text-primary mr-2" />
      <span className="text-xs font-medium">Estimated Timing Preview</span>
      <span className="ml-auto text-xs text-app-gray">
        {clips.length} clips · Total:{' '}
        {clips.reduce((sum, c) => sum + c.duration, 0).toFixed(1)}s
      </span>
    </div>
    <div className="text-xs space-y-1">
      {clips.slice(0, 3).map((c, i) => (
        <div key={i} className="flex justify-between">
          <span className="truncate flex-1">{c.text}</span>
          <span className="text-app-gray ml-2">{c.duration.toFixed(1)}s</span>
        </div>
      ))}
      {clips.length > 3 && (
        <div className="text-app-gray">...and {clips.length - 3} more</div>
      )}
    </div>
  </div>
);

// small helper reused from formatTime util
import { formatTime } from '../../utils/formatTime';

const SUBTITLE_LANGUAGES = [
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
