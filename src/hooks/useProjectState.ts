import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  AppSettings,
  LyricLine,
  ImportedMediaFile,
  TimelineMarker,
  StageStyle,
  TextStyle,
  FileTrack,
} from '../types/types';
import { VoxMatchProject } from '../types/project';
import { generateId } from '../utils/utils';
import { useHistory } from './useHistory';
import { projectSnapshotsEqual } from '../utils/projectSnapshotEqual';
import { makeEmptyTrack } from '../utils/projectFile';
import type { ProjectSnapshot } from '../types/history';

const DEFAULT_TRACK_KEY = '__default__';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function resolveCollisions(
  existing: LyricLine[],
  incoming: LyricLine[],
): LyricLine[] {
  const result = [...existing].sort((a, b) => a.startTime - b.startTime);
  for (const clip of incoming) {
    let candidate = { ...clip };
    let guard = 0;
    while (guard++ < 1000) {
      const conflict = result.find(
        (c) => candidate.startTime < c.endTime && candidate.endTime > c.startTime,
      );
      if (!conflict) break;
      const dur = candidate.endTime - candidate.startTime;
      candidate = {
        ...candidate,
        startTime: conflict.endTime + 0.05,
        endTime: conflict.endTime + 0.05 + dur,
      };
    }
    result.push(candidate);
  }
  return result.sort((a, b) => a.startTime - b.startTime);
}

export interface UseProjectStateReturn {
  activeLeftPanelTab: 'subtitles' | 'lyrics';
  activeSubTab: 'edit' | 'styles' | 'templates';
  lyrics: LyricLine[];
  subtitles: LyricLine[];
  selectedSubtitleIds: Set<string>;
  selectedLyricIds: Set<string>;
  selectedIds: Set<string>;
  importedFiles: ImportedMediaFile[];
  activeFileId: string | null;
  loadingFileId: string | null;
  zoom: number;
  markers: TimelineMarker[];
  settings: AppSettings;
  stageStyle: StageStyle;
  lyricTextStyle: TextStyle;
  subtitleTextStyle: TextStyle;
  currentSubtitleText: string | null;
  subtitleLanguage: string;

  canUndo: boolean;
  canRedo: boolean;
  activeFile: ImportedMediaFile | null;
  timelineData: LyricLine[];

  clipboardClip: LyricLine | null;
  tracks: Record<string, FileTrack>;

  setActiveLeftPanelTab: (tab: 'subtitles' | 'lyrics') => void;
  setActiveSubTab: (tab: 'edit' | 'styles' | 'templates') => void;
  setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>;
  setSubtitles: React.Dispatch<React.SetStateAction<LyricLine[]>>;
  setImportedFiles: React.Dispatch<React.SetStateAction<ImportedMediaFile[]>>;
  setActiveFileId: (id: string | null) => void;
  switchActiveFile: (id: string) => void;
  setLoadingFileId: (id: string | null) => void;
  setZoom: (value: number) => void;
  setMarkers: React.Dispatch<React.SetStateAction<TimelineMarker[]>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setStageStyle: (style: StageStyle | ((p: StageStyle) => StageStyle)) => void;
  setLyricTextStyle: (style: TextStyle | ((p: TextStyle) => TextStyle)) => void;
  setSubtitleTextStyle: (style: TextStyle | ((p: TextStyle) => TextStyle)) => void;
  setSubtitleLanguage: (lang: string) => void;
  setCurrentSubtitleText: (text: string | null) => void;
  setTracks: React.Dispatch<React.SetStateAction<Record<string, FileTrack>>>;

  handleLyricChange: (
    id: string,
    field: 'text' | 'startTime' | 'endTime',
    value: string | number,
  ) => void;
  handleSubtitleChange: (
    id: string,
    field: 'text' | 'startTime' | 'endTime',
    value: string | number,
  ) => void;
  handleAddLyric: (currentTime: number) => void;
  handleAddSubtitle: (currentTime: number) => void;
  handleDeleteLyric: (id: string) => void;
  handleDeleteSubtitle: (id: string) => void;
  handleMergeSubtitles: () => void;
  handleSplitSubtitle: () => void;
  handleSplitSubtitleAt: (id: string, t: number) => void;
  toggleSubtitleSelection: (id: string) => void;
  toggleLyricSelection: (id: string) => void;
  toggleTimelineSelection: (id: string, e?: React.MouseEvent) => void;
  clearSelection: () => void;
  selectAll: () => void;
  handleBatchAddLyrics: (newLyrics: Omit<LyricLine, 'id'>[]) => void;
  handleBatchAddSubtitles: (newSubtitles: Omit<LyricLine, 'id'>[]) => void;
  undo: () => void;
  redo: () => void;
  handleSettingChange: (name: string, value: string | boolean | number) => void;
  importFiles: (files: File[]) => Promise<ImportedMediaFile[]>;
  updateTimelineData: (
    id: string,
    newStart: number,
    newEnd: number,
  ) => void;
  deleteTimelineItem: (id: string) => void;
  addMarker: (time: number, label: string) => void;
  updateFileAfterLoad: (loadedFile: ImportedMediaFile) => void;
  updateCurrentSubtitleText: (currentTime: number) => void;
  addTimelineItem: (item: LyricLine) => void;
  duplicateTimelineItem: (id: string, newStart?: number, newEnd?: number) => void;
  splitTimelineItem: (id: string, splitTime: number) => void;
  mergeTimelineItems: (ids: string[]) => void;
  pushHistory: (label: string) => void;
  copyClipToClipboard: (id: string) => void;
  pasteClipboardAt: (time: number) => void;
  importClips: (
    clips: Array<{ text: string; startTime: number; endTime: number }>,
    options?: { replace?: boolean; targetTrack?: 'subtitles' | 'lyrics' },
  ) => { added: number; shifted: number };
}

export function useProjectState(project: VoxMatchProject): UseProjectStateReturn {
  const seedTracks = useCallback((): Record<string, FileTrack> => {
    const incoming: Record<string, FileTrack> = (project as any).tracks ?? {};
    const cloned = clone(incoming);
    const activeId = project.activeFileId ?? null;

    if (!activeId || !cloned[activeId]) {
      const legacyTrack = makeEmptyTrack(project.mode);
      const legacy = project as any;
      if (Array.isArray(legacy.lyrics)) legacyTrack.lyrics = clone(legacy.lyrics);
      if (Array.isArray(legacy.subtitles)) legacyTrack.subtitles = clone(legacy.subtitles);
      if (Array.isArray(legacy.markers)) legacyTrack.markers = clone(legacy.markers);
      if (legacy.stageStyle) legacyTrack.stageStyle = clone(legacy.stageStyle);
      if (legacy.lyricTextStyle) legacyTrack.lyricTextStyle = clone(legacy.lyricTextStyle);
      if (legacy.subtitleTextStyle) legacyTrack.subtitleTextStyle = clone(legacy.subtitleTextStyle);
      if (typeof legacy.zoom === 'number') legacyTrack.zoom = legacy.zoom;
      cloned[DEFAULT_TRACK_KEY] = legacyTrack;
    }
    return cloned;
  }, [project]);

  const [tracks, setTracks] = useState<Record<string, FileTrack>>(seedTracks);
  const [activeFileId, setActiveFileIdState] = useState<string | null>(
    project.activeFileId ?? DEFAULT_TRACK_KEY,
  );
  const [activeLeftPanelTab, setActiveLeftPanelTab] = useState<
    'subtitles' | 'lyrics'
  >(project.mode === 'lyrics' ? 'lyrics' : 'subtitles');
  const [activeSubTab, setActiveSubTab] = useState<
    'edit' | 'styles' | 'templates'
  >('edit');
  const [selectedSubtitleIds, setSelectedSubtitleIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedLyricIds, setSelectedLyricIds] = useState<Set<string>>(
    new Set(),
  );
  const [importedFiles, setImportedFiles] = useState<ImportedMediaFile[]>(
    project.mediaFiles || [],
  );
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(project.settings);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string | null>(null);
  const [subtitleLanguage, setSubtitleLanguageState] = useState<string>(
    project.settings?.defaultSubtitleLanguage ?? 'en-US',
  );
  const [clipboardClip, setClipboardClip] = useState<LyricLine | null>(null);
  const [layout, setLayoutState] = useState({
    isVerticalLayout: project.layout?.isVerticalLayout ?? false,
    isMaximizedVideo: false,
    isLeftPanelFilled: false,
    isLeftPanelTopRowFilled: false,
  });

  const effectiveActiveId =
    activeFileId && tracks[activeFileId]
      ? activeFileId
      : tracks[DEFAULT_TRACK_KEY]
        ? DEFAULT_TRACK_KEY
        : activeFileId ?? DEFAULT_TRACK_KEY;

  const activeTrack: FileTrack =
    tracks[effectiveActiveId] ?? makeEmptyTrack(project.mode);

  const lyrics = activeTrack.lyrics;
  const subtitles = activeTrack.subtitles;
  const markers = activeTrack.markers;
  const stageStyle = activeTrack.stageStyle;
  const lyricTextStyle = activeTrack.lyricTextStyle;
  const subtitleTextStyle = activeTrack.subtitleTextStyle;
  const zoom = activeTrack.zoom;

  const activeFile = importedFiles.find((f) => f.id === activeFileId) || null;
  const timelineData = activeLeftPanelTab === 'subtitles' ? subtitles : lyrics;
  const selectedIds =
    activeLeftPanelTab === 'subtitles' ? selectedSubtitleIds : selectedLyricIds;

  const updateActiveTrack = useCallback(
    (updater: (prev: FileTrack) => FileTrack) => {
      const key = effectiveActiveId;
      setTracks((prev) => {
        const base = prev[key] ?? makeEmptyTrack(project.mode);
        return { ...prev, [key]: updater(base) };
      });
      setActiveFileIdState((cur) => (cur === key ? cur : key));
    },
    [effectiveActiveId, project.mode],
  );

  const stateRef = useRef({
    tracks,
    activeFileId,
    activeLeftPanelTab,
    subtitleLanguage,
    importedFiles,
    settings,
    layout,
  });
  useEffect(() => {
    stateRef.current = {
      tracks,
      activeFileId,
      activeLeftPanelTab,
      subtitleLanguage,
      importedFiles,
      settings,
      layout,
    };
  });

  const history = useHistory<ProjectSnapshot>({
    maxSize: 200,
    isEqual: projectSnapshotsEqual,
  });

  const snapshot = useCallback((): ProjectSnapshot => {
    const s = stateRef.current;
    return {
      tracks: clone(s.tracks),
      activeFileId: s.activeFileId,
      activeLeftPanelTab: s.activeLeftPanelTab,
      subtitleLanguage: s.subtitleLanguage,
      importedFiles: s.importedFiles.map((f) => ({
        ...f,
        file: undefined,
        url: f.url ?? null,
      })),
      settings: clone(s.settings),
      layout: { ...s.layout },
    };
  }, []);

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    history.reset(snapshot());
  }, [history, snapshot]);

  const pendingHistoryLabelRef = useRef<string | null>(null);
  const commit = useCallback(<R,>(label: string, mutator: () => R): R => {
    pendingHistoryLabelRef.current = label;
    return mutator();
  }, []);

  useEffect(() => {
    if (!seededRef.current) return;
    const label = pendingHistoryLabelRef.current;
    if (!label) return;
    pendingHistoryLabelRef.current = null;
    history.push(snapshot(), label);
  }, [
    tracks,
    activeFileId,
    activeLeftPanelTab,
    subtitleLanguage,
    importedFiles,
    settings,
    layout,
    history,
    snapshot,
  ]);

  const pushHistory = useCallback(
    (label: string) => history.push(snapshot(), label),
    [history, snapshot],
  );

  const applySnapshot = useCallback((snap: ProjectSnapshot) => {
    setTracks(clone(snap.tracks));
    setActiveFileIdState(snap.activeFileId);
    setActiveLeftPanelTab(snap.activeLeftPanelTab);
    setSubtitleLanguageState(snap.subtitleLanguage);
    setImportedFiles(
      snap.importedFiles.map((f) => ({ ...f, file: undefined, url: f.url ?? null })),
    );
    if (snap.settings) setSettings(clone(snap.settings));
    if (snap.layout) setLayoutState({ ...snap.layout });
  }, []);

  const undo = useCallback(() => {
    const snap = history.undo();
    if (snap) applySnapshot(snap);
  }, [history, applySnapshot]);

  const redo = useCallback(() => {
    const snap = history.redo();
    if (snap) applySnapshot(snap);
  }, [history, applySnapshot]);

  const setLyrics = useCallback<React.Dispatch<React.SetStateAction<LyricLine[]>>>(
    (value) => {
      updateActiveTrack((t) => ({
        ...t,
        lyrics:
          typeof value === 'function'
            ? (value as (p: LyricLine[]) => LyricLine[])(t.lyrics)
            : value,
      }));
    },
    [updateActiveTrack],
  );

  const setSubtitles = useCallback<
    React.Dispatch<React.SetStateAction<LyricLine[]>>
  >(
    (value) => {
      updateActiveTrack((t) => ({
        ...t,
        subtitles:
          typeof value === 'function'
            ? (value as (p: LyricLine[]) => LyricLine[])(t.subtitles)
            : value,
      }));
    },
    [updateActiveTrack],
  );

  const setMarkers = useCallback<
    React.Dispatch<React.SetStateAction<TimelineMarker[]>>
  >(
    (value) => {
      updateActiveTrack((t) => ({
        ...t,
        markers:
          typeof value === 'function'
            ? (value as (p: TimelineMarker[]) => TimelineMarker[])(t.markers)
            : value,
      }));
    },
    [updateActiveTrack],
  );

  const setZoom = useCallback(
    (value: number) => {
      commit('zoom', () => {
        updateActiveTrack((t) => ({ ...t, zoom: value }));
      });
    },
    [commit, updateActiveTrack],
  );

  const setStageStyle = useCallback(
    (style: StageStyle | ((p: StageStyle) => StageStyle)) => {
      commit('stage-style', () => {
        updateActiveTrack((t) => ({
          ...t,
          stageStyle:
            typeof style === 'function'
              ? (style as (p: StageStyle) => StageStyle)(t.stageStyle)
              : style,
        }));
      });
    },
    [commit, updateActiveTrack],
  );

  const setLyricTextStyle = useCallback(
    (style: TextStyle | ((p: TextStyle) => TextStyle)) => {
      commit('lyric-style', () => {
        updateActiveTrack((t) => ({
          ...t,
          lyricTextStyle:
            typeof style === 'function'
              ? (style as (p: TextStyle) => TextStyle)(t.lyricTextStyle)
              : style,
        }));
      });
    },
    [commit, updateActiveTrack],
  );

  const setSubtitleTextStyle = useCallback(
    (style: TextStyle | ((p: TextStyle) => TextStyle)) => {
      commit('subtitle-style', () => {
        updateActiveTrack((t) => ({
          ...t,
          subtitleTextStyle:
            typeof style === 'function'
              ? (style as (p: TextStyle) => TextStyle)(t.subtitleTextStyle)
              : style,
        }));
      });
    },
    [commit, updateActiveTrack],
  );

  const setSubtitleLanguage = useCallback(
    (lang: string) => {
      commit('subtitle-language', () => {
        setSubtitleLanguageState(lang);
        setSettings((prev) => ({ ...prev, defaultSubtitleLanguage: lang }));
      });
    },
    [commit],
  );

  const toggleSubtitleSelection = useCallback((id: string) => {
    setSelectedSubtitleIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleLyricSelection = useCallback((id: string) => {
    setSelectedLyricIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleTimelineSelection = useCallback(
    (id: string, _e?: React.MouseEvent) => {
      if (activeLeftPanelTab === 'subtitles') toggleSubtitleSelection(id);
      else toggleLyricSelection(id);
    },
    [activeLeftPanelTab, toggleSubtitleSelection, toggleLyricSelection],
  );

  const clearSelection = useCallback(() => {
    setSelectedSubtitleIds(new Set());
    setSelectedLyricIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    if (activeLeftPanelTab === 'subtitles') {
      setSelectedSubtitleIds(new Set(subtitles.map((s) => s.id)));
    } else {
      setSelectedLyricIds(new Set(lyrics.map((l) => l.id)));
    }
  }, [activeLeftPanelTab, subtitles, lyrics]);

  const handleLyricChange = useCallback(
    (id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => {
      commit(`lyric:${field}`, () => {
        setLyrics((prev) =>
          prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)),
        );
      });
    },
    [commit, setLyrics],
  );

  const handleSubtitleChange = useCallback(
    (id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => {
      commit(`subtitle:${field}`, () => {
        setSubtitles((prev) =>
          prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)),
        );
      });
    },
    [commit, setSubtitles],
  );

  const handleAddLyric = useCallback(
    (currentTime: number) => {
      commit('add-lyric', () => {
        setLyrics((prev) => [
          ...prev,
          { id: generateId(), text: '', startTime: currentTime, endTime: currentTime + 2 },
        ]);
      });
    },
    [commit, setLyrics],
  );

  const handleAddSubtitle = useCallback(
    (currentTime: number) => {
      commit('add-subtitle', () => {
        setSubtitles((prev) => [
          ...prev,
          { id: generateId(), text: '', startTime: currentTime, endTime: currentTime + 2 },
        ]);
      });
    },
    [commit, setSubtitles],
  );

  const handleDeleteLyric = useCallback(
    (id: string) => {
      commit('delete-lyric', () => setLyrics((prev) => prev.filter((l) => l.id !== id)));
    },
    [commit, setLyrics],
  );

  const handleDeleteSubtitle = useCallback(
    (id: string) => {
      commit('delete-subtitle', () =>
        setSubtitles((prev) => prev.filter((l) => l.id !== id)),
      );
    },
    [commit, setSubtitles],
  );

  const handleMergeSubtitles = useCallback(() => {
    if (selectedSubtitleIds.size < 2) return;
    commit('merge-subtitles', () => {
      const sorted = [...selectedSubtitleIds]
        .map((id) => subtitles.find((s) => s.id === id)!)
        .filter(Boolean)
        .sort((a, b) => a.startTime - b.startTime);
      if (sorted.length < 2) return;
      const merged: LyricLine = {
        id: generateId(),
        text: sorted.map((s) => s.text).join(' '),
        startTime: sorted[0].startTime,
        endTime: sorted[sorted.length - 1].endTime,
      };
      setSubtitles((prev) =>
        [...prev.filter((s) => !selectedSubtitleIds.has(s.id)), merged].sort(
          (a, b) => a.startTime - b.startTime,
        ),
      );
      setSelectedSubtitleIds(new Set());
    });
  }, [selectedSubtitleIds, subtitles, commit, setSubtitles]);

  const splitAt = useCallback(
    (list: LyricLine[], id: string, splitTime: number): LyricLine[] => {
      const item = list.find((c) => c.id === id);
      if (!item) return list;
      if (splitTime <= item.startTime || splitTime >= item.endTime) return list;
      const first: LyricLine = { ...item, id: generateId(), endTime: splitTime };
      const second: LyricLine = { ...item, id: generateId(), startTime: splitTime };
      return list
        .flatMap((c) => (c.id === id ? [first, second] : [c]))
        .sort((a, b) => a.startTime - b.startTime);
    },
    [],
  );

  const handleSplitSubtitle = useCallback(() => {
    if (selectedSubtitleIds.size !== 1) return;
    const [id] = [...selectedSubtitleIds];
    const item = subtitles.find((s) => s.id === id);
    if (!item) return;
    const mid = (item.startTime + item.endTime) / 2;
    commit('split-subtitle', () => {
      setSubtitles((prev) => splitAt(prev, id, mid));
      setSelectedSubtitleIds(new Set());
    });
  }, [selectedSubtitleIds, subtitles, commit, setSubtitles, splitAt]);

  const handleSplitSubtitleAt = useCallback(
    (id: string, t: number) => {
      commit('split-subtitle', () => {
        setSubtitles((prev) => splitAt(prev, id, t));
      });
    },
    [commit, setSubtitles, splitAt],
  );

  const splitTimelineItem = useCallback(
    (id: string, splitTime: number) => {
      commit('split-clip', () => {
        if (activeLeftPanelTab === 'subtitles') {
          setSubtitles((prev) => splitAt(prev, id, splitTime));
        } else {
          setLyrics((prev) => splitAt(prev, id, splitTime));
        }
      });
    },
    [activeLeftPanelTab, commit, setSubtitles, setLyrics, splitAt],
  );

  const mergeTimelineItems = useCallback(
    (ids: string[]) => {
      if (ids.length < 2) return;
      const list = activeLeftPanelTab === 'subtitles' ? subtitles : lyrics;
      const items = ids
        .map((id) => list.find((c) => c.id === id))
        .filter(Boolean) as LyricLine[];
      if (items.length < 2) return;
      items.sort((a, b) => a.startTime - b.startTime);
      const merged: LyricLine = {
        id: generateId(),
        text: items.map((c) => c.text).join(' '),
        startTime: items[0].startTime,
        endTime: items[items.length - 1].endTime,
      };
      commit('merge-clips', () => {
        const idSet = new Set(ids);
        const setter = activeLeftPanelTab === 'subtitles' ? setSubtitles : setLyrics;
        setter((prev) =>
          [...prev.filter((c) => !idSet.has(c.id)), merged].sort(
            (a, b) => a.startTime - b.startTime,
          ),
        );
        clearSelection();
      });
    },
    [activeLeftPanelTab, subtitles, lyrics, commit, setSubtitles, setLyrics, clearSelection],
  );

  const addTimelineItem = useCallback(
    (item: LyricLine) => {
      commit('timeline-add', () => {
        if (activeLeftPanelTab === 'subtitles') setSubtitles((prev) => [...prev, item]);
        else setLyrics((prev) => [...prev, item]);
      });
    },
    [activeLeftPanelTab, commit, setSubtitles, setLyrics],
  );

  const duplicateTimelineItem = useCallback(
    (id: string, newStart?: number, newEnd?: number) => {
      const source = timelineData.find((item) => item.id === id);
      if (!source) return;
      const newItem: LyricLine = {
        ...source,
        id: generateId(),
        startTime: newStart ?? source.startTime,
        endTime: newEnd ?? source.endTime,
      };
      addTimelineItem(newItem);
    },
    [timelineData, addTimelineItem],
  );

  const updateTimelineData = useCallback(
    (id: string, newStart: number, newEnd: number) => {
      commit('timeline-drag', () => {
        const setter = activeLeftPanelTab === 'subtitles' ? setSubtitles : setLyrics;
        setter((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, startTime: newStart, endTime: newEnd } : item,
          ),
        );
      });
    },
    [activeLeftPanelTab, commit, setSubtitles, setLyrics],
  );

  const deleteTimelineItem = useCallback(
    (id: string) => {
      commit('timeline-delete', () => {
        const setter = activeLeftPanelTab === 'subtitles' ? setSubtitles : setLyrics;
        setter((prev) => prev.filter((item) => item.id !== id));
      });
    },
    [activeLeftPanelTab, commit, setSubtitles, setLyrics],
  );

  const handleBatchAddLyrics = useCallback(
    (newLyrics: Omit<LyricLine, 'id'>[]) => {
      if (newLyrics.length === 0) return;
      commit('batch-add-lyrics', () => {
        setLyrics((prev) => [...prev, ...newLyrics.map((l) => ({ ...l, id: generateId() }))]);
      });
    },
    [commit, setLyrics],
  );

  const handleBatchAddSubtitles = useCallback(
    (newSubtitles: Omit<LyricLine, 'id'>[]) => {
      if (newSubtitles.length === 0) return;
      commit('batch-add-subtitles', () => {
        setSubtitles((prev) => [
          ...prev,
          ...newSubtitles.map((s) => ({ ...s, id: generateId() })),
        ]);
      });
    },
    [commit, setSubtitles],
  );

  const importClips = useCallback(
    (
      clips: Array<{ text: string; startTime: number; endTime: number }>,
      options?: { replace?: boolean; targetTrack?: 'subtitles' | 'lyrics' },
    ) => {
      const target = options?.targetTrack ?? activeLeftPanelTab;
      const shouldReplace = options?.replace ?? false;
      if (clips.length === 0) return { added: 0, shifted: 0 };

      const withIds: LyricLine[] = clips
        .map((c) => ({
          id: generateId(),
          text: c.text,
          startTime: Math.max(0, c.startTime),
          endTime: Math.max(c.startTime + 0.05, c.endTime),
        }))
        .sort((a, b) => a.startTime - b.startTime);

      const existing = shouldReplace ? [] : target === 'subtitles' ? subtitles : lyrics;
      const merged = shouldReplace ? [...withIds] : resolveCollisions(existing, withIds);
      const shiftedCount = merged.length - (existing.length + withIds.length);

      commit(`import-clips:${target}`, () => {
        if (target === 'subtitles') setSubtitles(merged);
        else setLyrics(merged);
      });

      return { added: withIds.length, shifted: shiftedCount };
    },
    [activeLeftPanelTab, subtitles, lyrics, commit, setSubtitles, setLyrics],
  );

  const handleSettingChange = useCallback(
    (name: string, value: string | boolean | number) => {
      commit(`setting:${name}`, () => {
        setSettings((prev) => ({ ...prev, [name]: value }));
      });
    },
    [commit],
  );

  const switchActiveFile = useCallback(
    (id: string) => {
      if (id === activeFileId) return;
      commit('switch-file', () => {
        setTracks((prev) =>
          prev[id] ? prev : { ...prev, [id]: makeEmptyTrack(project.mode) },
        );
        setActiveFileIdState(id);
      });
    },
    [activeFileId, commit, project.mode],
  );

  const importFiles = useCallback(
    async (files: File[]): Promise<ImportedMediaFile[]> => {
      const newFiles: ImportedMediaFile[] = files
        .filter((f) => f.type.startsWith('audio/') || f.type.startsWith('video/'))
        .map((f) => ({
          id: generateId(),
          name: f.name,
          size: f.size,
          type: f.type,
          url: URL.createObjectURL(f),
          path: (f as any).path || '',
          file: f,
          duration: 0,
          loaded: false,
        }));

      commit('import-files', () => {
        setImportedFiles((prev) => [...prev, ...newFiles]);
        setTracks((prev) => {
          const next = { ...prev };
          for (const f of newFiles) {
            if (!next[f.id]) next[f.id] = makeEmptyTrack(project.mode);
          }
          return next;
        });
      });

      return newFiles;
    },
    [commit, project.mode],
  );

  const updateFileAfterLoad = useCallback((loadedFile: ImportedMediaFile) => {
    setImportedFiles((prev) =>
      prev.map((f) =>
        f.id === loadedFile.id
          ? {
              ...f,
              duration: loadedFile.duration,
              loaded: true,
              url: loadedFile.url,
              posterDataUrl: loadedFile.posterDataUrl ?? f.posterDataUrl,
            }
          : f,
      ),
    );
  }, []);

  const addMarker = useCallback(
    (time: number, label: string) => {
      commit('add-marker', () => {
        setMarkers((prev) => [...prev, { id: generateId(), time, label }]);
      });
    },
    [commit, setMarkers],
  );

  const updateCurrentSubtitleText = useCallback(
    (currentTime: number) => {
      const source = activeLeftPanelTab === 'lyrics' ? lyrics : subtitles;
      const activeClip = source.find(
        (clip) => currentTime >= clip.startTime && currentTime <= clip.endTime,
      );
      setCurrentSubtitleText(activeClip?.text || null);
    },
    [activeLeftPanelTab, lyrics, subtitles],
  );

  const copyClipToClipboard = useCallback(
    (id: string) => {
      const list = activeLeftPanelTab === 'subtitles' ? subtitles : lyrics;
      const clip = list.find((c) => c.id === id);
      if (clip) setClipboardClip({ ...clip });
    },
    [activeLeftPanelTab, subtitles, lyrics],
  );

  const pasteClipboardAt = useCallback(
    (time: number) => {
      if (!clipboardClip) return;
      const duration = clipboardClip.endTime - clipboardClip.startTime;
      const start = Math.max(0, time);
      const payload = {
        text: clipboardClip.text,
        startTime: start,
        endTime: start + duration,
      };
      if (activeLeftPanelTab === 'subtitles') handleBatchAddSubtitles([payload]);
      else handleBatchAddLyrics([payload]);
    },
    [clipboardClip, activeLeftPanelTab, handleBatchAddSubtitles, handleBatchAddLyrics],
  );

  return useMemo<UseProjectStateReturn>(
    () => ({
      activeLeftPanelTab,
      activeSubTab,
      lyrics,
      subtitles,
      selectedSubtitleIds,
      selectedLyricIds,
      selectedIds,
      importedFiles,
      activeFileId,
      loadingFileId,
      zoom,
      markers,
      settings,
      stageStyle,
      lyricTextStyle,
      subtitleTextStyle,
      currentSubtitleText,
      subtitleLanguage,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      activeFile,
      timelineData,
      clipboardClip,
      tracks,

      setActiveLeftPanelTab,
      setActiveSubTab,
      setLyrics,
      setSubtitles,
      setImportedFiles,
      setActiveFileId: setActiveFileIdState,
      switchActiveFile,
      setLoadingFileId,
      setZoom,
      setMarkers,
      setSettings,
      setStageStyle,
      setLyricTextStyle,
      setSubtitleTextStyle,
      setSubtitleLanguage,
      setCurrentSubtitleText,
      setTracks,

      handleLyricChange,
      handleSubtitleChange,
      handleAddLyric,
      handleAddSubtitle,
      handleDeleteLyric,
      handleDeleteSubtitle,
      handleMergeSubtitles,
      handleSplitSubtitle,
      handleSplitSubtitleAt,
      toggleSubtitleSelection,
      toggleLyricSelection,
      toggleTimelineSelection,
      clearSelection,
      selectAll,
      handleBatchAddLyrics,
      handleBatchAddSubtitles,
      undo,
      redo,
      handleSettingChange,
      importFiles,
      updateTimelineData,
      deleteTimelineItem,
      addMarker,
      updateFileAfterLoad,
      updateCurrentSubtitleText,
      addTimelineItem,
      duplicateTimelineItem,
      splitTimelineItem,
      mergeTimelineItems,
      pushHistory,
      copyClipToClipboard,
      pasteClipboardAt,
      importClips,
    }),
    [
      activeLeftPanelTab,
      activeSubTab,
      lyrics,
      subtitles,
      selectedSubtitleIds,
      selectedLyricIds,
      selectedIds,
      importedFiles,
      activeFileId,
      loadingFileId,
      zoom,
      markers,
      settings,
      stageStyle,
      lyricTextStyle,
      subtitleTextStyle,
      currentSubtitleText,
      subtitleLanguage,
      history.canUndo,
      history.canRedo,
      activeFile,
      timelineData,
      clipboardClip,
      tracks,
      setZoom,
      setStageStyle,
      setLyricTextStyle,
      setSubtitleTextStyle,
      setSubtitleLanguage,
      setLyrics,
      setSubtitles,
      setMarkers,
      handleLyricChange,
      handleSubtitleChange,
      handleAddLyric,
      handleAddSubtitle,
      handleDeleteLyric,
      handleDeleteSubtitle,
      handleMergeSubtitles,
      handleSplitSubtitle,
      handleSplitSubtitleAt,
      toggleSubtitleSelection,
      toggleLyricSelection,
      toggleTimelineSelection,
      clearSelection,
      selectAll,
      handleBatchAddLyrics,
      handleBatchAddSubtitles,
      undo,
      redo,
      handleSettingChange,
      importFiles,
      updateTimelineData,
      deleteTimelineItem,
      addMarker,
      updateFileAfterLoad,
      updateCurrentSubtitleText,
      addTimelineItem,
      duplicateTimelineItem,
      splitTimelineItem,
      mergeTimelineItems,
      pushHistory,
      copyClipToClipboard,
      pasteClipboardAt,
      importClips,
      switchActiveFile,
    ],
  );
}