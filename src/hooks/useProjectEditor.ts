import { useState, useCallback, useEffect, useRef } from 'react';
import { VoxMatchProject } from '../types/project';
import { ImportedMediaFile, LyricLine } from '../types/types';
import { useMediaPlayback } from './useMediaPlayback';
import { useProjectState } from './useProjectState';
import { generateId } from '../utils/utils';

export function useProjectEditor(initialProject: VoxMatchProject) {
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

  const markAsUnsaved = useCallback(() => setIsProjectSaved(false), []);

  const toggleVerticalLayout = useCallback(() => {
    setLayout(prev => ({ ...prev, isVerticalLayout: !prev.isVerticalLayout }));
    markAsUnsaved();
  }, [markAsUnsaved]);

  const toggleMaximizeVideo = useCallback(() => {
    setLayout(prev => ({ ...prev, isMaximizedVideo: !prev.isMaximizedVideo }));
  }, []);

  const toggleLeftPanelFilled = useCallback(() => {
    setLayout(prev => ({ ...prev, isLeftPanelFilled: !prev.isLeftPanelFilled }));
  }, []);

  const toggleLeftPanelTopRowFilled = useCallback(() => {
    setLayout(prev => ({ ...prev, isLeftPanelTopRowFilled: !prev.isLeftPanelTopRowFilled }));
  }, []);

  const toggleAccordion = useCallback((id: string) => {
    setOpenAccordion(prev => (prev === id ? null : id));
  }, []);

  // ── REAL file activation (loads into timeline) ──
  const onFileActivate = useCallback(async (file: ImportedMediaFile) => {
    console.log('🎯 Activating file:', file.name);
    projectState.setLoadingFileId(file.id);
    projectState.setActiveFileId(file.id);
    try {
      const loadedFile = await mediaPlayback.loadMediaIntoTimeline(file);
      projectState.updateFileAfterLoad(loadedFile);
      markAsUnsaved();
      return loadedFile;
    } catch (error) {
      console.error('Failed to activate media file:', error);
      projectState.setActiveFileId(null);
      throw error;
    } finally {
      projectState.setLoadingFileId(null);
    }
  }, [projectState, mediaPlayback, markAsUnsaved]);

  // ✅ FIX: Auto-load the active media file when the project is opened
  const hasAutoLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasAutoLoadedRef.current && initialProject.activeFileId) {
      hasAutoLoadedRef.current = true;
      const fileToLoad = projectState.importedFiles.find(f => f.id === initialProject.activeFileId);
      
      // Auto-activate if we have a path (Electron) or existing URL
      if (fileToLoad && !fileToLoad.loaded && (fileToLoad.path || fileToLoad.url)) {
        onFileActivate(fileToLoad).catch(err => {
          console.error('Failed to auto-load active media file:', err);
        });
      }
    }
  }, [initialProject.activeFileId, projectState.importedFiles, onFileActivate]);

  // ── Drop / open file import ──
  const handleFilesDropped = useCallback(async (files: File[]) => {
    const newFiles: ImportedMediaFile[] = files
      .filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/'))
      .map(file => ({
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        path: (file as any).path || '',
        file: file,
        duration: 0,
        loaded: false,
      }));

    if (newFiles.length === 0) {
      alert('No valid audio/video files selected.');
      return;
    }

    projectState.setImportedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const trulyNew = newFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...trulyNew];
    });
    markAsUnsaved();
  }, [projectState, markAsUnsaved]);

  // ── New clip (Ctrl+N) ──
  const handleNewClip = useCallback(() => {
    const now = mediaPlayback.currentTime;
    const newItem: LyricLine = {
      id: generateId(),
      text: '',
      startTime: now,
      endTime: now + 2,
    };
    if (projectState.activeLeftPanelTab === 'subtitles') {
      projectState.setSubtitles(prev => [...prev, newItem]);
    } else {
      projectState.setLyrics(prev => [...prev, newItem]);
    }
    markAsUnsaved();
  }, [mediaPlayback.currentTime, projectState, markAsUnsaved]);

  // ── Context menu handler (accepts MouseEvent | SyntheticEvent) ──
  const handleContextMenu = useCallback(
    (e: React.MouseEvent | React.SyntheticEvent, file: ImportedMediaFile, targetElement?: HTMLElement) => {
      e.preventDefault();
      let x = 0, y = 0;
      // If the event is a MouseEvent, use its coordinates
      if ('clientX' in e) {
        const mouseEvent = e as React.MouseEvent;
        x = mouseEvent.clientX;
        y = mouseEvent.clientY;
      } else if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        x = rect.left;
        y = rect.bottom;
      }
      setContextMenu({
        visible: true,
        x,
        y,
        type: 'file',
        data: null,
        file,
      });
    },
    []
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
        case 'remove':
          if (projectState.activeFileId === file.id) mediaPlayback.cleanupMedia();
          projectState.setImportedFiles(prev => prev.filter(f => f.id !== file.id));
          if (projectState.activeFileId === file.id) projectState.setActiveFileId(null);
          markAsUnsaved();
          break;
      }
      setContextMenu(prev => ({ ...prev, visible: false }));
    },
    [contextMenu, projectState, mediaPlayback, markAsUnsaved, onFileActivate]
  );

  const handleExport = useCallback(() => { setIsExportModalOpen(true); }, []);
  const handleSaveProject = useCallback(() => { setIsProjectSaved(true); }, []);
  const handleSaveProjectAs = useCallback(() => { setIsProjectSaved(true); }, []);
  const handleClearTimelineAll = useCallback(() => {
    if (projectState.activeLeftPanelTab === 'subtitles') {
      projectState.setSubtitles([]);
    } else {
      projectState.setLyrics([]);
    }
    markAsUnsaved();
  }, [projectState, markAsUnsaved]);

  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }, []);

  return {
    projectState,
    mediaPlayback,
    isProjectSaved,
    contextMenu,
    setContextMenu,
    layout,
    isPreferencesModalOpen, setIsPreferencesModalOpen,
    isAboutModalOpen, setIsAboutModalOpen,
    isHelpModalOpen, setIsHelpModalOpen,
    isExportModalOpen, setIsExportModalOpen,
    isFileInfoModalOpen, setIsFileInfoModalOpen,
    isStageSettingsModalOpen, setIsStageSettingsModalOpen,
    selectedFileInfo,
    setSelectedFileInfo,
    activePreferenceSection, setActivePreferenceSection,
    activeHelpSection, setActiveHelpSection,
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
  };
}