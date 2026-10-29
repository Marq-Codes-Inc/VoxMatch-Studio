// src/ProjectEditor.tsx
import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  useLayoutEffect,
} from 'react';
import { Modal } from './components/ui/Modal';
import { TopBar } from './components/editor/TopBar';
import { ContextMenu } from './components/editor/ContextMenu';
import {
  HorizontalLayout,
  HorizontalLayoutSizes,
} from './components/layout/HorizontalLayout';
import {
  VerticalLayout,
  VerticalLayoutSizes,
} from './components/layout/VerticalLayout';
import { VideoPreviewPanel } from './components/panels/VideoPreviewPanel';
import { FileInfoModalContent } from './components/modals/FileInfoModalContent';
import { StageSettingsContent } from './components/modals/StageSettingsModalContent';
import { SettingsModalContent } from './components/modals/SettingsModalContent';
import { AboutModalContent } from './components/modals/AboutModalContent';
import { HelpModalContent } from './components/modals/HelpModalContent';
import { ExportModalContent } from './components/modals/ExportModalContent';
import { FloatingVuMeter } from './components/audio/FloatingVuMeter';
import { VoxMatchProject } from './types/types';
import { useProjectEditor } from './hooks/useProjectEditor';
import { useKeyboardShortcuts, SHORTCUTS } from './hooks/useKeyboardShortcuts';
import {
  ProjectEditorProvider,
  ProjectEditorContextValue,
} from './contexts/ProjectEditorContext';
import { StageStyle, TextStyle, ImportedMediaFile } from './types/types';

interface ProjectEditorProps {
  project: VoxMatchProject;
  onProjectUpdate: (project: VoxMatchProject) => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onCloseProject: () => void;
  onThemeChange: (theme: string) => void;
  currentTheme: string;
}

interface VideoSlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('Editor crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-app-bg text-app-text p-8">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-app-gray">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProjectEditorContent: React.FC<ProjectEditorProps> = ({
  project,
  onProjectUpdate,
  onSaveProject,
  onSaveProjectAs,
  onCloseProject,
  onThemeChange,
}) => {
  const editor = useProjectEditor(project, onSaveProject, onSaveProjectAs);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoSlotRef = useRef<HTMLDivElement>(null);

  const [videoSlotRect, setVideoSlotRect] = useState<VideoSlotRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [horizontalSizes, setHorizontalSizes] = useState<HorizontalLayoutSizes>({
    leftWidth: 35,
    videoHeight: 60,
    importHeight: 40,
  });
  const [verticalSizes, setVerticalSizes] = useState<VerticalLayoutSizes>({
    leftWidth: 70,
    topSplit: 40,
    bottomHeight: 40,
  });
  const [videoAspect, setVideoAspect] = useState<number | null>(null);

  const {
    projectState,
    mediaPlayback,
    isProjectSaved,
    contextMenu,
    layout,
    markAsUnsaved,
    toggleVerticalLayout,
    toggleMaximizeVideo,
    toggleLeftPanelFilled,
    toggleLeftPanelTopRowFilled,
    handleContextMenu,
    handleContextMenuItemClick,
    handleFilesDropped,
    handleClearTimelineAll,
    handleSaveProject,
    handleSaveProjectAs,
    handleExport,
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
    activePreferenceSection,
    setActivePreferenceSection,
    activeHelpSection,
    setActiveHelpSection,
    openAccordion,
    toggleAccordion,
    handleNewClip,
    formatTime,
    onFileActivate,
    isVuOverlayEnabled,
    toggleVuOverlay,
  } = editor;

  const {
    isPlaying,
    currentTime,
    volume,
    mediaDuration,
    isMediaLoaded,
    mediaUrl,
    mediaElementRef,
    audioElementRef,
    analyserRef,
    setVolume,
    handleSeek,
    togglePlayPause,
  } = mediaPlayback;

  const {
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
    activeFile,
    timelineData,
    canUndo,
    canRedo,
    subtitleLanguage,
    clipboardClip,
    tracks,
    setActiveLeftPanelTab,
    setActiveSubTab,
    setZoom,
    setStageStyle,
    setLyricTextStyle,
    setSubtitleTextStyle,
    setSubtitleLanguage,
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
    updateTimelineData,
    deleteTimelineItem,
    addMarker,
    addTimelineItem,
    duplicateTimelineItem,
    splitTimelineItem,
    mergeTimelineItems,
    pushHistory,
    copyClipToClipboard,
    pasteClipboardAt,
    switchActiveFile,
  } = projectState;

  const isModalOpen =
    isPreferencesModalOpen ||
    isAboutModalOpen ||
    isHelpModalOpen ||
    isExportModalOpen ||
    isFileInfoModalOpen ||
    isStageSettingsModalOpen;

  useLayoutEffect(() => {
    const slot = videoSlotRef.current;
    const container = containerRef.current;
    if (!slot || !container) return;

    const update = () => {
      const slotRect = slot.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setVideoSlotRect({
        left: slotRect.left - containerRect.left,
        top: slotRect.top - containerRect.top,
        width: slotRect.width,
        height: slotRect.height,
      });
    };

    update();

    let raf2: number | null = null;
    const raf1 = requestAnimationFrame(() => {
      update();
      raf2 = requestAnimationFrame(update);
    });

    const ro = new ResizeObserver(update);
    ro.observe(slot);
    ro.observe(container);
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [
    layout.isVerticalLayout,
    layout.isMaximizedVideo,
    horizontalSizes,
    verticalSizes,
  ]);

  const handleVideoLoadedMetadata = useCallback((aspect: number) => {
    setVideoAspect(aspect);
  }, []);

  const handleOpenFileLocal = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const wrappedSetStageStyle = useCallback(
    (style: StageStyle | ((prev: StageStyle) => StageStyle)) => {
      setStageStyle(style);
      markAsUnsaved();
    },
    [setStageStyle, markAsUnsaved],
  );

  const wrappedSetLyricTextStyle = useCallback(
    (style: TextStyle | ((prev: TextStyle) => TextStyle)) => {
      setLyricTextStyle(style);
      markAsUnsaved();
    },
    [setLyricTextStyle, markAsUnsaved],
  );

  const wrappedSetSubtitleTextStyle = useCallback(
    (style: TextStyle | ((prev: TextStyle) => TextStyle)) => {
      setSubtitleTextStyle(style);
      markAsUnsaved();
    },
    [setSubtitleTextStyle, markAsUnsaved],
  );

  const wrappedHandleAddLyric = useCallback(() => {
    handleAddLyric(currentTime);
  }, [handleAddLyric, currentTime]);

  const wrappedHandleAddSubtitle = useCallback(() => {
    handleAddSubtitle(currentTime);
  }, [handleAddSubtitle, currentTime]);

  const wrappedUpdateTimelineData = useCallback(
    (id: string, newStart: number, newEnd: number) => {
      updateTimelineData(id, newStart, newEnd);
      markAsUnsaved();
    },
    [updateTimelineData, markAsUnsaved],
  );

  const wrappedDeleteTimelineItem = useCallback(
    (id: string) => {
      deleteTimelineItem(id);
      markAsUnsaved();
    },
    [deleteTimelineItem, markAsUnsaved],
  );

  const wrappedAddMarker = useCallback(
    (time: number, label: string) => {
      addMarker(time, label);
      markAsUnsaved();
    },
    [addMarker, markAsUnsaved],
  );

  const wrappedSetZoom = useCallback(
    (value: number) => {
      setZoom(value);
      markAsUnsaved();
    },
    [setZoom, markAsUnsaved],
  );

  const wrappedOnFileActivate = useCallback(
    async (file: ImportedMediaFile) => {
      await onFileActivate(file);
    },
    [onFileActivate],
  );

  const openStageSettingsModal = useCallback(() => {
    setIsStageSettingsModalOpen(true);
  }, [setIsStageSettingsModalOpen]);

  const handleToggleMaximizeVideo = useCallback(() => {
    toggleMaximizeVideo();
  }, [toggleMaximizeVideo]);

  const contextValue: ProjectEditorContextValue = useMemo(
    () => ({
      isPlaying,
      currentTime,
      volume,
      mediaDuration,
      isMediaLoaded,
      mediaUrl,
      mediaElementRef,
      audioElementRef,
      analyserRef,
      activeLeftPanelTab,
      activeSubTab,
      layout,
      tracks,
      lyrics,
      subtitles,
      timelineData,
      markers,
      zoom,
      settings,
      stageStyle,
      lyricTextStyle,
      subtitleTextStyle,
      currentSubtitleText,
      subtitleLanguage,
      selectedSubtitleIds,
      selectedLyricIds,
      selectedIds,
      clipboardClip,
      importedFiles,
      activeFileId,
      activeFile,
      loadingFileId,
      canUndo,
      canRedo,
      undo,
      redo,
      setIsPlaying: mediaPlayback.setIsPlaying,
      setVolume,
      handleSeek,
      togglePlayPause,
      setActiveLeftPanelTab,
      setActiveSubTab,
      setZoom: wrappedSetZoom,
      handleLyricChange,
      handleSubtitleChange,
      handleAddLyric: wrappedHandleAddLyric,
      handleAddSubtitle: wrappedHandleAddSubtitle,
      handleDeleteLyric,
      handleDeleteSubtitle,
      handleMergeSubtitles,
      handleSplitSubtitle,
      handleSplitSubtitleAt,
      handleBatchAddLyrics,
      handleBatchAddSubtitles,
      toggleSubtitleSelection,
      toggleLyricSelection,
      toggleTimelineSelection,
      clearSelection,
      selectAll,
      handleSettingChange,
      setStageStyle: wrappedSetStageStyle as React.Dispatch<
        React.SetStateAction<StageStyle>
      >,
      setLyricTextStyle: wrappedSetLyricTextStyle as React.Dispatch<
        React.SetStateAction<TextStyle>
      >,
      setSubtitleTextStyle: wrappedSetSubtitleTextStyle as React.Dispatch<
        React.SetStateAction<TextStyle>
      >,
      setSubtitleLanguage,
      updateTimelineData: wrappedUpdateTimelineData,
      deleteTimelineItem: wrappedDeleteTimelineItem,
      addTimelineItem,
      duplicateTimelineItem,
      splitTimelineItem,
      mergeTimelineItems,
      addMarker: wrappedAddMarker,
      copyClipToClipboard,
      pasteClipboardAt,
      onFileActivate: wrappedOnFileActivate,
      handleOpenFile: handleOpenFileLocal,
      handleFilesDropped,
      handleClearTimelineAll,
      handleNewClip,
      switchActiveFile,
      formatTime,
      markAsUnsaved,
      pushHistory,
      isVuOverlayEnabled,
      toggleVuOverlay,
      importSubtitleFile: editor.importSubtitleFile,
      openStageSettingsModal,
    }),
    [
      isPlaying,
      currentTime,
      volume,
      mediaDuration,
      isMediaLoaded,
      mediaUrl,
      mediaElementRef,
      audioElementRef,
      analyserRef,
      activeLeftPanelTab,
      activeSubTab,
      layout,
      tracks,
      lyrics,
      subtitles,
      timelineData,
      markers,
      zoom,
      settings,
      stageStyle,
      lyricTextStyle,
      subtitleTextStyle,
      currentSubtitleText,
      subtitleLanguage,
      selectedSubtitleIds,
      selectedLyricIds,
      selectedIds,
      clipboardClip,
      importedFiles,
      activeFileId,
      activeFile,
      loadingFileId,
      canUndo,
      canRedo,
      undo,
      redo,
      mediaPlayback.setIsPlaying,
      setVolume,
      handleSeek,
      togglePlayPause,
      setActiveLeftPanelTab,
      setActiveSubTab,
      wrappedSetZoom,
      handleLyricChange,
      handleSubtitleChange,
      wrappedHandleAddLyric,
      wrappedHandleAddSubtitle,
      handleDeleteLyric,
      handleDeleteSubtitle,
      handleMergeSubtitles,
      handleSplitSubtitle,
      handleSplitSubtitleAt,
      handleBatchAddLyrics,
      handleBatchAddSubtitles,
      toggleSubtitleSelection,
      toggleLyricSelection,
      toggleTimelineSelection,
      clearSelection,
      selectAll,
      handleSettingChange,
      wrappedSetStageStyle,
      wrappedSetLyricTextStyle,
      wrappedSetSubtitleTextStyle,
      setSubtitleLanguage,
      wrappedUpdateTimelineData,
      wrappedDeleteTimelineItem,
      addTimelineItem,
      duplicateTimelineItem,
      splitTimelineItem,
      mergeTimelineItems,
      wrappedAddMarker,
      copyClipToClipboard,
      pasteClipboardAt,
      wrappedOnFileActivate,
      handleOpenFileLocal,
      handleFilesDropped,
      handleClearTimelineAll,
      handleNewClip,
      switchActiveFile,
      formatTime,
      markAsUnsaved,
      pushHistory,
      isVuOverlayEnabled,
      toggleVuOverlay,
      editor.importSubtitleFile,
      openStageSettingsModal,
    ],
  );

  const contentSignature = useMemo(
    () =>
      JSON.stringify({
        name: project.name,
        tracks,
        activeFileId,
        mediaFiles: importedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          path: f.path,
          loaded: f.loaded,
          duration: f.duration,
          posterDataUrl: f.posterDataUrl ?? null,
        })),
        settings,
        layout: {
          leftWidth: horizontalSizes.leftWidth,
          videoHeight: horizontalSizes.videoHeight,
          topSplit: verticalSizes.topSplit,
          bottomHeight: verticalSizes.bottomHeight,
          isVerticalLayout: layout.isVerticalLayout,
          isMaximizedVideo: layout.isMaximizedVideo,
          isLeftPanelFilled: layout.isLeftPanelFilled,
          isLeftPanelTopRowFilled: layout.isLeftPanelTopRowFilled,
        },
        isSaved: isProjectSaved,
      }),
    [
      project.name,
      tracks,
      activeFileId,
      importedFiles,
      settings,
      horizontalSizes,
      verticalSizes,
      isProjectSaved,
      layout,
    ],
  );

  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSignatureRef.current === contentSignature) return;
    lastSignatureRef.current = contentSignature;

    const updatedProject: VoxMatchProject = {
      ...project,
      name: project.name,
      layout: {
        ...project.layout,
        isVerticalLayout: layout.isVerticalLayout,
        isMaximizedVideo: layout.isMaximizedVideo,
        isLeftPanelFilled: layout.isLeftPanelFilled,
        isLeftPanelTopRowFilled: layout.isLeftPanelTopRowFilled,
        panels: {
          ...project.layout.panels,
          leftPanelWidth: horizontalSizes.leftWidth,
          videoPanelHeight: horizontalSizes.videoHeight,
          importMediaPanelVerticalWidth: verticalSizes.topSplit,
          leftPanelBottomHeight: verticalSizes.bottomHeight,
        },
      },
      tracks,
      activeFileId,
      mediaFiles: importedFiles,
      settings,
      isSaved: isProjectSaved,
    };
    onProjectUpdate(updatedProject);
  }, [
    contentSignature,
    project,
    onProjectUpdate,
    tracks,
    activeFileId,
    importedFiles,
    settings,
    horizontalSizes,
    verticalSizes,
    isProjectSaved,
    layout,
  ]);

  useEffect(() => {
    onThemeChange(settings.theme);
  }, [settings.theme, onThemeChange]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute(
      'data-theme',
      settings.theme === 'system' ? getSystemTheme() : settings.theme,
    );
    root.style.setProperty('--primary', settings.primaryColor);
    root.style.setProperty('--primary-hover', `${settings.primaryColor}E6`);
  }, [settings.theme, settings.primaryColor]);

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () =>
      document.documentElement.setAttribute(
        'data-theme',
        mq.matches ? 'dark' : 'light',
      );
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  useKeyboardShortcuts(
    [
      {
        ...SHORTCUTS.PLAY_PAUSE,
        handler: () => !isModalOpen && togglePlayPause(),
      },
      {
        ...SHORTCUTS.UNDO,
        handler: () => !isModalOpen && canUndo && undo(),
      },
      {
        ...SHORTCUTS.REDO,
        handler: () => !isModalOpen && canRedo && redo(),
      },
      {
        ...SHORTCUTS.REDO_ALT,
        handler: () => !isModalOpen && canRedo && redo(),
      },
      {
        ...SHORTCUTS.SAVE,
        handler: () => !isModalOpen && handleSaveProject(),
      },
      {
        ...SHORTCUTS.SAVE_AS,
        handler: () => !isModalOpen && handleSaveProjectAs(),
      },
      {
        ...SHORTCUTS.NEW_CLIP,
        handler: () => !isModalOpen && handleNewClip(),
      },
      {
        ...SHORTCUTS.COPY,
        handler: () => {
          if (isModalOpen || selectedIds.size !== 1) return;
          copyClipToClipboard([...selectedIds][0]);
        },
      },
      {
        ...SHORTCUTS.PASTE,
        handler: () => {
          if (isModalOpen || !clipboardClip || mediaDuration <= 0) return;
          pasteClipboardAt(currentTime);
        },
      },
      {
        ...SHORTCUTS.DELETE,
        handler: () => {
          if (isModalOpen || selectedIds.size === 0) return;
          selectedIds.forEach((id) => wrappedDeleteTimelineItem(id));
          clearSelection();
        },
      },
    ],
    { enabled: true },
  );

  useEffect(() => {
    const onDocClick = () =>
      editor.setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [editor]);

  const handleHorizontalResize = useCallback(
    (updates: Partial<HorizontalLayoutSizes>) => {
      setHorizontalSizes((prev) => ({ ...prev, ...updates }));
      markAsUnsaved();
    },
    [markAsUnsaved],
  );

  const handleVerticalResize = useCallback(
    (updates: Partial<VerticalLayoutSizes>) => {
      setVerticalSizes((prev) => ({ ...prev, ...updates }));
      markAsUnsaved();
    },
    [markAsUnsaved],
  );

  void activeSubTab;

  return (
    <ProjectEditorProvider value={contextValue}>
      <div
        ref={containerRef}
        className="flex h-screen w-screen bg-app-bg text-app-text overflow-hidden relative font-inter"
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="audio/*,video/*,.srt,.vtt,.lrc,.ass,.ssa"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) handleFilesDropped(files);
            e.target.value = '';
          }}
        />

        <TopBar
          isProjectSaved={isProjectSaved}
          isVerticalLayout={layout.isVerticalLayout}
          onToggleLayout={toggleVerticalLayout}
          onSave={handleSaveProject}
          onSaveAs={handleSaveProjectAs}
          onExport={handleExport}
          onOpenPreferences={() => setIsPreferencesModalOpen(true)}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenAbout={() => setIsAboutModalOpen(true)}
          onCloseProject={onCloseProject}
        />

        <main className="flex-1 flex pt-14 min-h-0 relative">
          {layout.isVerticalLayout ? (
            <VerticalLayout
              sizes={verticalSizes}
              onResize={handleVerticalResize}
              isLeftPanelTopRowFilled={layout.isLeftPanelTopRowFilled}
              isMaximizedVideo={layout.isMaximizedVideo}
              onToggleLeftPanelTopRowFilled={toggleLeftPanelTopRowFilled}
              onToggleMaximizeVideo={handleToggleMaximizeVideo}
              onContextMenu={handleContextMenu}
              onOpenStageSettingsModal={openStageSettingsModal}
              videoSlotRef={videoSlotRef}
            />
          ) : (
            <HorizontalLayout
              sizes={horizontalSizes}
              onResize={handleHorizontalResize}
              isLeftPanelFilled={layout.isLeftPanelFilled}
              isMaximizedVideo={layout.isMaximizedVideo}
              onToggleLeftPanelFilled={toggleLeftPanelFilled}
              onToggleMaximizeVideo={handleToggleMaximizeVideo}
              onContextMenu={handleContextMenu}
              onOpenStageSettingsModal={openStageSettingsModal}
              videoSlotRef={videoSlotRef}
            />
          )}

          <div className="absolute inset-0 z-30 pointer-events-none">
            <div
              className="absolute"
              style={{
                left: videoSlotRect.left,
                top: videoSlotRect.top,
                width: videoSlotRect.width,
                height: videoSlotRect.height,
                pointerEvents: 'auto',
              }}
            >
              <VideoPreviewPanel
                isVerticalLayout={layout.isVerticalLayout}
                isPlaying={isPlaying}
                togglePlayPause={togglePlayPause}
                isMaximizedVideo={layout.isMaximizedVideo}
                setIsMaximizedVideo={handleToggleMaximizeVideo}
                mediaUrl={mediaUrl}
                mediaElementRef={mediaElementRef}
                currentTime={currentTime}
                mediaDuration={mediaDuration}
                activeFile={activeFile}
                settings={settings}
                currentSubtitleText={currentSubtitleText}
                stageStyle={stageStyle}
                lyricTextStyle={lyricTextStyle}
                subtitleTextStyle={subtitleTextStyle}
                overlayMode={activeLeftPanelTab === 'lyrics' ? 'lyrics' : 'subtitles'}
                handleSeek={handleSeek}
                videoAspect={videoAspect}
                isMediaLoaded={isMediaLoaded}
                onVideoLoadedMetadata={handleVideoLoadedMetadata}
              />
            </div>
          </div>
        </main>

        <ContextMenu
          contextMenu={contextMenu}
          onItemClick={handleContextMenuItemClick}
          activeFileId={activeFileId}
        />

        <Modal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
          title="About VoxMatch Studio"
        >
          <AboutModalContent />
        </Modal>

        <Modal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title="Export Project Settings"
        >
          <ExportModalContent
            settings={settings}
            handleSettingChange={handleSettingChange}
            selectSaveLocation={async () =>
              window.electronAPI?.selectSaveLocation?.() ?? null
            }
            file={activeFile || null}
            project={project}
            mediaElementRef={mediaElementRef}
            onClose={() => setIsExportModalOpen(false)}
          />
        </Modal>

        <Modal
          isOpen={isPreferencesModalOpen}
          onClose={() => setIsPreferencesModalOpen(false)}
          title="Preferences"
          isSidePanelContent
        >
          <PreferencesPanel
            activeSection={activePreferenceSection}
            onSectionChange={setActivePreferenceSection}
            settings={settings}
            handleSettingChange={handleSettingChange}
          />
        </Modal>

        <Modal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          title="Help & Support"
          isSidePanelContent
        >
          <HelpPanel
            activeSection={activeHelpSection}
            onSectionChange={setActiveHelpSection}
            openAccordion={openAccordion}
            toggleAccordion={toggleAccordion}
          />
        </Modal>

        <Modal
          isOpen={isFileInfoModalOpen}
          onClose={() => setIsFileInfoModalOpen(false)}
          title="File Information"
        >
          <FileInfoModalContent file={selectedFileInfo} />
        </Modal>

        <Modal
          isOpen={isStageSettingsModalOpen}
          onClose={() => setIsStageSettingsModalOpen(false)}
          title="Stage Settings"
          size="stage"
        >
          <StageSettingsContent
            stageStyle={stageStyle}
            setStageStyle={wrappedSetStageStyle}
            onClose={() => setIsStageSettingsModalOpen(false)}
          />
        </Modal>

        {isVuOverlayEnabled && (
          <FloatingVuMeter
            analyserRef={analyserRef}
            isPlaying={isPlaying}
            onClose={toggleVuOverlay}
          />
        )}
      </div>
    </ProjectEditorProvider>
  );
};

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const PreferencesPanel: React.FC<{
  activeSection: string;
  onSectionChange: (s: string) => void;
  settings: any;
  handleSettingChange: (name: string, value: any) => void;
}> = ({ activeSection, onSectionChange, settings, handleSettingChange }) => {
  const sections = [
    { id: 'general', name: 'General' },
    { id: 'audio-video', name: 'Audio & Video' },
    { id: 'lyrics-subtitles', name: 'Lyrics & Subtitles' },
    { id: 'shortcuts', name: 'Shortcuts' },
  ];
  return (
    <div className="flex h-[calc(90vh-100px)]">
      <div className="w-1/4 bg-app-gray-dark border-r border-app-border p-4 space-y-2 overflow-y-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onSectionChange(s.id)}
            className={`w-full flex items-center p-3 rounded-md text-left ${
              activeSection === s.id
                ? 'bg-primary text-white'
                : 'text-app-text hover:bg-app-gray-light'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <SettingsModalContent
          settings={settings}
          handleSettingChange={handleSettingChange}
          activeSection={activeSection}
        />
      </div>
    </div>
  );
};

const HelpPanel: React.FC<{
  activeSection: string;
  onSectionChange: (s: string) => void;
  openAccordion: string | null;
  toggleAccordion: (s: string) => void;
}> = ({ activeSection, onSectionChange, openAccordion, toggleAccordion }) => {
  const sections = [
    { id: 'quick-start', name: 'Quick Start' },
    { id: 'tutorials', name: 'Tutorials' },
    { id: 'faq', name: 'FAQ' },
    { id: 'support', name: 'Support' },
  ];
  return (
    <div className="flex h-[calc(90vh-100px)]">
      <div className="w-1/4 bg-app-gray-dark border-r border-app-border p-4 space-y-2 overflow-y-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onSectionChange(s.id)}
            className={`w-full flex items-center p-3 rounded-md text-left ${
              activeSection === s.id
                ? 'bg-primary text-white'
                : 'text-app-text hover:bg-app-gray-light'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <HelpModalContent
          activeSection={activeSection}
          openAccordion={openAccordion}
          toggleAccordion={toggleAccordion}
        />
      </div>
    </div>
  );
};

export const ProjectEditor: React.FC<ProjectEditorProps> = (props) => (
  <EditorErrorBoundary>
    <ProjectEditorContent {...props} />
  </EditorErrorBoundary>
);
