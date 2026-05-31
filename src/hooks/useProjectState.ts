import { useState, useCallback } from 'react';
import { AppSettings, LyricLine, ImportedMediaFile, TimelineMarker, StageStyle, TextStyle } from '../types/types';
import { VoxMatchProject } from '../types/project';
import { generateId } from '../utils/utils';

export interface UseProjectStateReturn {
  activeLeftPanelTab: 'subtitles' | 'lyrics';
  activeSubTab: 'edit' | 'styles' | 'templates';
  lyrics: LyricLine[];
  subtitles: LyricLine[];
  selectedSubtitleIds: Set<string>;
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
  
  canUndo: boolean;
  canRedo: boolean;
  activeFile: ImportedMediaFile | null;
  timelineData: LyricLine[];
  
  setActiveLeftPanelTab: (tab: 'subtitles' | 'lyrics') => void;
  setActiveSubTab: (tab: 'edit' | 'styles' | 'templates') => void;
  setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>;
  setSubtitles: React.Dispatch<React.SetStateAction<LyricLine[]>>;
  setSelectedSubtitleIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setImportedFiles: React.Dispatch<React.SetStateAction<ImportedMediaFile[]>>;
  setActiveFileId: (id: string | null) => void;
  setLoadingFileId: (id: string | null) => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setMarkers: React.Dispatch<React.SetStateAction<TimelineMarker[]>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setStageStyle: React.Dispatch<React.SetStateAction<StageStyle>>;
  setLyricTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;
  setSubtitleTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;
  setCurrentSubtitleText: (text: string | null) => void;
  
  handleLyricChange: (id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => void;
  handleSubtitleChange: (id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => void;
  handleAddLyric: (currentTime: number) => void;
  handleAddSubtitle: (currentTime: number) => void;
  handleDeleteLyric: (id: string) => void;
  handleDeleteSubtitle: (id: string) => void;
  handleMergeSubtitles: () => void;
  handleSplitSubtitle: () => void;
  toggleSubtitleSelection: (id: string) => void;
  handleBatchAddLyrics: (newLyrics: Omit<LyricLine, 'id'>[]) => void;
  handleBatchAddSubtitles: (newSubtitles: Omit<LyricLine, 'id'>[]) => void;
  undo: () => void;
  redo: () => void;
  handleSettingChange: (name: string, value: string | boolean | number) => void;
  importFiles: (files: File[]) => Promise<ImportedMediaFile[]>;
  handleOpenFile: () => Promise<void>;
  handleClearTimelineAll: () => void;
  updateTimelineData: (id: string, newStart: number, newEnd: number, activeTab: 'subtitles' | 'lyrics') => void;
  deleteTimelineItem: (id: string, activeTab: 'subtitles' | 'lyrics') => void;
  addMarker: (time: number, label: string) => void;
  updateFileAfterLoad: (loadedFile: ImportedMediaFile) => void;
  updateCurrentSubtitleText: (currentTime: number) => void;
  onFileActivate: (file: ImportedMediaFile) => Promise<ImportedMediaFile>;
  addTimelineItem: (item: LyricLine) => void;
  duplicateTimelineItem: (id: string, newStart?: number, newEnd?: number) => void;
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function useProjectState(project: VoxMatchProject): UseProjectStateReturn {
  const [activeLeftPanelTab, setActiveLeftPanelTab] = useState<'subtitles' | 'lyrics'>(
    project.mode === 'lyrics' ? 'lyrics' : 'subtitles'
  );
  const [activeSubTab, setActiveSubTab] = useState<'edit' | 'styles' | 'templates'>('edit');
  const [lyrics, setLyrics] = useState<LyricLine[]>(project.lyrics || []);
  const [subtitles, setSubtitles] = useState<LyricLine[]>(project.subtitles || []);
  const [selectedSubtitleIds, setSelectedSubtitleIds] = useState<Set<string>>(new Set());
  const [importedFiles, setImportedFiles] = useState<ImportedMediaFile[]>(project.mediaFiles || []);
  const [activeFileId, setActiveFileId] = useState<string | null>(project.activeFileId);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(project.zoom || 1);
  const [markers, setMarkers] = useState<TimelineMarker[]>(project.markers || []);
  const [settings, setSettings] = useState<AppSettings>(project.settings);
  const [stageStyle, setStageStyle] = useState<StageStyle>(project.stageStyle);
  const [lyricTextStyle, setLyricTextStyle] = useState<TextStyle>(project.lyricTextStyle);
  const [subtitleTextStyle, setSubtitleTextStyle] = useState<TextStyle>(project.subtitleTextStyle);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string | null>(null);

  // undo / redo
  const [history, setHistory] = useState<{ subtitles: LyricLine[]; lyrics: LyricLine[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const activeFile = importedFiles.find(f => f.id === activeFileId) || null;
  const timelineData = activeLeftPanelTab === 'subtitles' ? subtitles : lyrics;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // save current state as history entry before mutation
  const pushHistory = useCallback((newSubtitles: LyricLine[], newLyrics: LyricLine[]) => {
    setHistory(prev => {
      const cleanPrev = prev.slice(0, historyIndex + 1);
      return [...cleanPrev, { subtitles: clone(newSubtitles), lyrics: clone(newLyrics) }];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // ─── handlers ─────────────────────────────────────────

  const handleLyricChange = useCallback((id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => {
    setLyrics(prev => prev.map(line => line.id === id ? { ...line, [field]: value } : line));
  }, []);

  const handleSubtitleChange = useCallback((id: string, field: 'text' | 'startTime' | 'endTime', value: string | number) => {
    setSubtitles(prev => prev.map(line => line.id === id ? { ...line, [field]: value } : line));
  }, []);

  const handleAddLyric = useCallback((currentTime: number) => {
    setLyrics(prev => {
      const newLine: LyricLine = {
        id: generateId(),
        text: '',
        startTime: currentTime,
        endTime: currentTime + 2,
      };
      const updated = [...prev, newLine];
      pushHistory(clone(updated), subtitles); // preserve subtitles
      return updated;
    });
  }, [subtitles, pushHistory]);

  const handleAddSubtitle = useCallback((currentTime: number) => {
    setSubtitles(prev => {
      const newLine: LyricLine = {
        id: generateId(),
        text: '',
        startTime: currentTime,
        endTime: currentTime + 2,
      };
      const updated = [...prev, newLine];
      pushHistory(updated, clone(lyrics));
      return updated;
    });
  }, [lyrics, pushHistory]);

  const handleDeleteLyric = useCallback((id: string) => {
    setLyrics(prev => {
      const updated = prev.filter(l => l.id !== id);
      pushHistory(clone(updated), subtitles);
      return updated;
    });
  }, [subtitles, pushHistory]);

  const handleDeleteSubtitle = useCallback((id: string) => {
    setSubtitles(prev => {
      const updated = prev.filter(l => l.id !== id);
      pushHistory(updated, clone(lyrics));
      return updated;
    });
  }, [lyrics, pushHistory]);

  const handleMergeSubtitles = useCallback(() => {
    if (selectedSubtitleIds.size < 2) return;
    const sorted = [...selectedSubtitleIds].map(id => subtitles.find(s => s.id === id)!)
      .sort((a, b) => a.startTime - b.startTime);
    const merged: LyricLine = {
      id: generateId(),
      text: sorted.map(s => s.text).join(' '),
      startTime: sorted[0].startTime,
      endTime: sorted[sorted.length - 1].endTime,
    };
    setSubtitles(prev => {
      const updated = prev.filter(s => !selectedSubtitleIds.has(s.id));
      updated.push(merged);
      pushHistory(updated, clone(lyrics));
      return updated.sort((a, b) => a.startTime - b.startTime);
    });
    setSelectedSubtitleIds(new Set());
  }, [selectedSubtitleIds, subtitles, lyrics, pushHistory]);

  const handleSplitSubtitle = useCallback(() => {
    if (selectedSubtitleIds.size !== 1) return;
    const [id] = [...selectedSubtitleIds];
    setSubtitles(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;
      const sub = prev[index];
      const mid = (sub.startTime + sub.endTime) / 2;
      const first: LyricLine = { ...sub, id: generateId(), endTime: mid };
      const second: LyricLine = { ...sub, id: generateId(), startTime: mid };
      const updated = [...prev.slice(0, index), first, second, ...prev.slice(index + 1)];
      pushHistory(updated, clone(lyrics));
      return updated.sort((a, b) => a.startTime - b.startTime);
    });
    setSelectedSubtitleIds(new Set());
  }, [selectedSubtitleIds, subtitles, lyrics, pushHistory]);

  const toggleSubtitleSelection = useCallback((id: string) => {
    setSelectedSubtitleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchAddLyrics = useCallback((newLyrics: Omit<LyricLine, 'id'>[]) => {
    setLyrics(prev => {
      const updated = [...prev, ...newLyrics.map(l => ({ ...l, id: generateId() }))];
      pushHistory(clone(updated), subtitles);
      return updated;
    });
  }, [subtitles, pushHistory]);

  const handleBatchAddSubtitles = useCallback((newSubtitles: Omit<LyricLine, 'id'>[]) => {
    setSubtitles(prev => {
      const updated = [...prev, ...newSubtitles.map(s => ({ ...s, id: generateId() }))];
      pushHistory(updated, clone(lyrics));
      return updated;
    });
  }, [lyrics, pushHistory]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    setSubtitles(entry.subtitles);
    setLyrics(entry.lyrics);
    setHistoryIndex(newIndex);
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    setSubtitles(entry.subtitles);
    setLyrics(entry.lyrics);
    setHistoryIndex(newIndex);
  }, [canRedo, history, historyIndex]);

  const handleSettingChange = useCallback((name: string, value: string | boolean | number) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  }, []);

  const importFiles = useCallback(async (files: File[]): Promise<ImportedMediaFile[]> => {
    const newFiles: ImportedMediaFile[] = files
      .filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/'))
      .map(f => ({
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
    setImportedFiles(prev => [...prev, ...newFiles]);
    return newFiles;
  }, []);

  const handleOpenFile = useCallback(async () => {}, []); // handled by parent

  const handleClearTimelineAll = useCallback(() => {
    if (activeLeftPanelTab === 'subtitles') {
      setSubtitles([]);
      pushHistory([], clone(lyrics));
    } else {
      setLyrics([]);
      pushHistory(clone(subtitles), []);
    }
  }, [activeLeftPanelTab, subtitles, lyrics, pushHistory]);

  const updateTimelineData = useCallback((id: string, newStart: number, newEnd: number, activeTab: 'subtitles' | 'lyrics') => {
    if (activeTab === 'subtitles') {
      setSubtitles(prev => prev.map(item => item.id === id ? { ...item, startTime: newStart, endTime: newEnd } : item));
    } else {
      setLyrics(prev => prev.map(item => item.id === id ? { ...item, startTime: newStart, endTime: newEnd } : item));
    }
  }, []);

  const deleteTimelineItem = useCallback((id: string, activeTab: 'subtitles' | 'lyrics') => {
    if (activeTab === 'subtitles') {
      setSubtitles(prev => prev.filter(item => item.id !== id));
    } else {
      setLyrics(prev => prev.filter(item => item.id !== id));
    }
  }, []);

  const addMarker = useCallback((time: number, label: string) => {
    setMarkers(prev => [...prev, { id: generateId(), time, label }]);
  }, []);

  // ✅ FIX: Keep loaded state and pass regenerated url back into state
  const updateFileAfterLoad = useCallback((loadedFile: ImportedMediaFile) => {
    setImportedFiles(prev => prev.map(f => f.id === loadedFile.id ? { 
      ...f, 
      duration: loadedFile.duration,
      loaded: true,
      url: loadedFile.url
    } : f));
  }, []);

  const updateCurrentSubtitleText = useCallback((currentTime: number) => {
    const activeSub = subtitles.find(sub => currentTime >= sub.startTime && currentTime <= sub.endTime);
    setCurrentSubtitleText(activeSub?.text || null);
  }, [subtitles]);

  // real activation – sets active ID, loading state cleared by parent
  const onFileActivate = useCallback(async (file: ImportedMediaFile): Promise<ImportedMediaFile> => {
    // This will be used inside useProjectEditor to coordinate with media playback
    // For now we just return the file (the actual media loading happens externally)
    return file;
  }, []);

  const addTimelineItem = useCallback((item: LyricLine) => {
    if (activeLeftPanelTab === 'subtitles') {
      setSubtitles(prev => [...prev, item]);
    } else {
      setLyrics(prev => [...prev, item]);
    }
  }, [activeLeftPanelTab]);

  const duplicateTimelineItem = useCallback((id: string, newStart?: number, newEnd?: number) => {
    const source = timelineData.find(item => item.id === id);
    if (!source) return;
    const newItem: LyricLine = {
      ...source,
      id: generateId(),
      startTime: newStart ?? source.startTime,
      endTime: newEnd ?? source.endTime,
    };
    addTimelineItem(newItem);
  }, [timelineData, addTimelineItem]);

  return {
    activeLeftPanelTab, activeSubTab, lyrics, subtitles, selectedSubtitleIds,
    importedFiles, activeFileId, loadingFileId, zoom, markers, settings,
    stageStyle, lyricTextStyle, subtitleTextStyle, currentSubtitleText,
    canUndo, canRedo, activeFile, timelineData,
    setActiveLeftPanelTab, setActiveSubTab, setLyrics, setSubtitles,
    setSelectedSubtitleIds, setImportedFiles, setActiveFileId, setLoadingFileId,
    setZoom, setMarkers, setSettings, setStageStyle, setLyricTextStyle,
    setSubtitleTextStyle, setCurrentSubtitleText,
    handleLyricChange, handleSubtitleChange, handleAddLyric, handleAddSubtitle,
    handleDeleteLyric, handleDeleteSubtitle, handleMergeSubtitles,
    handleSplitSubtitle, toggleSubtitleSelection, handleBatchAddLyrics,
    handleBatchAddSubtitles, undo, redo, handleSettingChange,
    importFiles, handleOpenFile, handleClearTimelineAll,
    updateTimelineData, deleteTimelineItem, addMarker,
    updateFileAfterLoad, updateCurrentSubtitleText, onFileActivate,
    addTimelineItem, duplicateTimelineItem,
  };
}
