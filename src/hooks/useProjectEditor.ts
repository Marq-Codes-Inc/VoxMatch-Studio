import { useState, useCallback, useEffect, useRef } from 'react';
import { VoxMatchProject } from '../types/project';
import { ImportedMediaFile, LyricLine } from '../types/types';
import { useMediaPlayback } from './useMediaPlayback';
import { useProjectState } from './useProjectState';
import { generateId } from '../utils/utils';
import { parseSubtitleFile, isSubtitleFileName } from '../utils/subtitleImport';
import type { ImportSubtitleResult } from '../utils/subtitleImport';
import { extractVideoPoster } from '../utils/mediaPoster';

export function useProjectEditor(
  initialProject: VoxMatchProject,
  onSaveProject?: () => void | Promise<void>,
  onSaveProjectAs?: () => void | Promise<void>,
) {
  const projectState = useProjectState(initialProject);
  const mediaPlayback = useMediaPlayback();

  const [isProjectSaved, setIsProjectSaved] = useState(initialProject.isSaved);
  const [activePreferenceSection, setActivePreferenceSection] = useState('general');
  const [activeHelpSection, setActiveHelpSection] = useState('quick-start');
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFileInfoModalOpen, setIsFileInfoModalOpen] = useState(false);
  const [isStageSettingsModalOpen, setIsStageSettingsModalOpen] = useState(false);
  const [selectedFileInfo, setSelectedFileInfo] = useState<ImportedMediaFile | null>(null);

  const [isVuOverlayEnabled, setIsVuOverlayEnabled] = useState(false);
  const toggleVuOverlay = useCallback(() => setIsVuOverlayEnabled((v) => !v), []);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: string;
    data: any;
    file: ImportedMediaFile | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    type: '',
    data: null,
    file: null,
  });

  const [layout, setLayout] = useState({
    isVerticalLayout: initialProject.layout?.isVerticalLayout ?? false,
    isMaximizedVideo: false,
    isLeftPanelFilled: false,
    isLeftPanelTopRowFilled: false,
  });

  useEffect(() => {
    setIsProjectSaved(initialProject.isSaved);
  }, [initialProject.isSaved]);

  const markAsUnsaved = useCallback(() => setIsProjectSaved(false), []);

  const toggleVerticalLayout = useCallback(() => {
    setLayout((p) => ({ ...p, isVerticalLayout: !p.isVerticalLayout }));
    markAsUnsaved();
  }, [markAsUnsaved]);

  const toggleMaximizeVideo = useCallback(() => {
    setLayout((p) => ({ ...p, isMaximizedVideo: !p.isMaximizedVideo }));
  }, []);

  const toggleLeftPanelFilled = useCallback(() => {
    setLayout((p) => ({ ...p, isLeftPanelFilled: !p.isLeftPanelFilled }));
  }, []);

  const toggleLeftPanelTopRowFilled = useCallback(() => {
    setLayout((p) => ({ ...p, isLeftPanelTopRowFilled: !p.isLeftPanelTopRowFilled }));
  }, []);

  const toggleAccordion = useCallback((id: string) => {
    setOpenAccordion((p) => (p === id ? null : id));
  }, []);

  const {
    setLoadingFileId,
    setImportedFiles,
    setSubtitles,
    setLyrics,
    updateCurrentSubtitleText,
    activeLeftPanelTab,
    activeFileId,
    importedFiles,
    importClips,
    switchActiveFile,
    updateFileAfterLoad,
  } = projectState;

  const { loadMediaIntoTimeline, cleanupMedia, currentTime } = mediaPlayback;

  useEffect(() => {
    updateCurrentSubtitleText(currentTime);
  }, [currentTime, updateCurrentSubtitleText]);

  const onFileActivate = useCallback(
    async (file: ImportedMediaFile) => {
      setLoadingFileId(file.id);
      switchActiveFile(file.id);
      try {
        const loadedFile = await loadMediaIntoTimeline(file);

        let posterDataUrl = loadedFile.posterDataUrl ?? null;
        const isVideo = loadedFile.type?.startsWith('video');
        if (isVideo && !posterDataUrl) {
          const source = loadedFile.url || loadedFile.path;
          if (source) {
            try {
              posterDataUrl = await extractVideoPoster(source, {
                position: 0.1,
                width: 640,
                quality: 0.75,
              });
            } catch (err) {
              console.warn('Could not extract video poster:', err);
            }
          }
        }

        const finalFile: ImportedMediaFile = {
          ...loadedFile,
          posterDataUrl: posterDataUrl ?? null,
        };
        updateFileAfterLoad(finalFile);
        markAsUnsaved();
        return finalFile;
      } finally {
        setLoadingFileId(null);
      }
    },
    [
      setLoadingFileId,
      switchActiveFile,
      loadMediaIntoTimeline,
      markAsUnsaved,
      updateFileAfterLoad,
    ],
  );

  const hasAutoLoadedRef = useRef(false);
  useEffect(() => {
    if (hasAutoLoadedRef.current || !initialProject.activeFileId) return;
    hasAutoLoadedRef.current = true;
    const file = importedFiles.find((f) => f.id === initialProject.activeFileId);
    if (file && !file.loaded && (file.path || file.url)) {
      onFileActivate(file).catch((err) =>
        console.error('Failed to auto-load active media file:', err),
      );
    }
  }, [initialProject.activeFileId, importedFiles, onFileActivate]);

  const posterBackfillRef = useRef(false);
  useEffect(() => {
    if (posterBackfillRef.current) return;
    const active = importedFiles.find((f) => f.id === activeFileId);
    if (!active || active.posterDataUrl) return;
    if (!active.type?.startsWith('video')) return;
    if (!active.loaded) return;
    posterBackfillRef.current = true;
    const source = active.url || active.path;
    if (!source) return;
    extractVideoPoster(source, { position: 0.1, width: 640, quality: 0.75 })
      .then((poster) => {
        if (poster) {
          updateFileAfterLoad({ ...active, posterDataUrl: poster });
          markAsUnsaved();
        }
      })
      .catch((err) => console.warn('Poster backfill failed:', err));
  }, [importedFiles, activeFileId, updateFileAfterLoad, markAsUnsaved]);

  const importSubtitleFile = useCallback(
    async (
      file: File,
      options?: { replace?: boolean },
    ): Promise<ImportSubtitleResult | null> => {
      try {
        const content = await file.text();
        const parsed = parseSubtitleFile(file.name, content);
        if (!parsed.clips.length) {
          alert(`No usable clips were found in "${file.name}".`);
          return null;
        }
        const { added, shifted } = importClips(parsed.clips, options);
        markAsUnsaved();
        return {
          format: parsed.format,
          added,
          shifted,
          warnings: parsed.warnings,
        };
      } catch (err) {
        console.error('Failed to import subtitle file:', err);
        alert(`Failed to import "${file.name}"`);
        return null;
      }
    },
    [importClips, markAsUnsaved],
  );

  const handleFilesDropped = useCallback(
    async (files: File[]) => {
      const subtitleFiles: File[] = [];
      const mediaFiles: File[] = [];

      for (const f of files) {
        if (isSubtitleFileName(f.name)) subtitleFiles.push(f);
        else if (f.type.startsWith('audio/') || f.type.startsWith('video/'))
          mediaFiles.push(f);
      }

      for (const sf of subtitleFiles) await importSubtitleFile(sf);

      if (mediaFiles.length > 0) {
        const newFiles: ImportedMediaFile[] = mediaFiles.map((file) => ({
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          path: (file as any).path || '',
          file,
          duration: 0,
          loaded: false,
          posterDataUrl: null,
        }));

        setImportedFiles((prev) => {
          const existing = new Set(prev.map((f) => f.name));
          return [...prev, ...newFiles.filter((f) => !existing.has(f.name))];
        });
        markAsUnsaved();
      }
    },
    [setImportedFiles, markAsUnsaved, importSubtitleFile],
  );

  const handleNewClip = useCallback(() => {
    const now = currentTime;
    const newItem: LyricLine = {
      id: generateId(),
      text: '',
      startTime: now,
      endTime: now + 2,
    };
    if (activeLeftPanelTab === 'subtitles') setSubtitles((p) => [...p, newItem]);
    else setLyrics((p) => [...p, newItem]);
    markAsUnsaved();
  }, [currentTime, activeLeftPanelTab, setSubtitles, setLyrics, markAsUnsaved]);

  const handleContextMenu = useCallback(
    (
      e: React.MouseEvent | React.SyntheticEvent,
      file: ImportedMediaFile,
      targetElement?: HTMLElement,
    ) => {
      e.preventDefault();
      let x = 0;
      let y = 0;
      if ('clientX' in e) {
        x = (e as React.MouseEvent).clientX;
        y = (e as React.MouseEvent).clientY;
      } else if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        x = rect.left;
        y = rect.bottom;
      }
      setContextMenu({ visible: true, x, y, type: 'file', data: null, file });
    },
    [],
  );

  const handleContextMenuItemClick = useCallback(
    (action: string) => {
      const file = contextMenu.file;
      if (!file) return;

      switch (action) {
        case 'info':
          setSelectedFileInfo(file);
          setIsFileInfoModalOpen(true);
          break;
        case 'activate':
          onFileActivate(file);
          break;
        case 'remove': {
          if (activeFileId === file.id) cleanupMedia();
          setImportedFiles((p) => p.filter((f) => f.id !== file.id));
          if (activeFileId === file.id) {
            const remaining = importedFiles.filter((f) => f.id !== file.id);
            switchActiveFile(remaining[0]?.id ?? '');
          }
          markAsUnsaved();
          break;
        }
      }
      setContextMenu((p) => ({ ...p, visible: false }));
    },
    [
      contextMenu,
      onFileActivate,
      cleanupMedia,
      setImportedFiles,
      markAsUnsaved,
      activeFileId,
      importedFiles,
      switchActiveFile,
    ],
  );

  const handleExport = useCallback(() => setIsExportModalOpen(true), []);
  const handleSaveProject = useCallback(() => void onSaveProject?.(), [onSaveProject]);
  const handleSaveProjectAs = useCallback(() => void onSaveProjectAs?.(), [onSaveProjectAs]);

  const handleClearTimelineAll = useCallback(() => {
    if (activeLeftPanelTab === 'subtitles') setSubtitles([]);
    else setLyrics([]);
    markAsUnsaved();
  }, [activeLeftPanelTab, setSubtitles, setLyrics, markAsUnsaved]);

  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(3, '0')}`;
  }, []);

  return {
    projectState,
    mediaPlayback,
    isProjectSaved,
    contextMenu,
    setContextMenu,
    layout,
    isPreferencesModalOpen,
    setIsPreferencesModalOpen,
    isAboutModalOpen,
    setIsAboutModalOpen,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    isFileInfoModalOpen,
    setIsFileInfoModalOpen,
    isStageSettingsModalOpen,
    setIsStageSettingsModalOpen,
    selectedFileInfo,
    setSelectedFileInfo,
    activePreferenceSection,
    setActivePreferenceSection,
    activeHelpSection,
    setActiveHelpSection,
    openAccordion,
    toggleAccordion,
    markAsUnsaved,
    toggleVerticalLayout,
    toggleMaximizeVideo,
    toggleLeftPanelFilled,
    toggleLeftPanelTopRowFilled,
    onFileActivate,
    handleNewClip,
    handleFilesDropped,
    handleContextMenu,
    handleContextMenuItemClick,
    handleExport,
    handleSaveProject,
    handleSaveProjectAs,
    handleClearTimelineAll,
    formatTime,
    isVuOverlayEnabled,
    toggleVuOverlay,
    importSubtitleFile,
  };
}