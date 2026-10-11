// src/ProjectEditor.tsx
import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  useLayoutEffect,
} from 'react';
import {
  Sliders,
  Volume2,
  Type,
  Keyboard,
  BookOpen,
  Search,
  Mail,
} from 'lucide-react';
import { Modal } from './components/ui/Modal';
import { TopBar } from './components/editor/TopBar';
import { ContextMenu } from './components/editor/ContextMenu';
import { HorizontalLayout } from './components/layout/HorizontalLayout';
import { VerticalLayout } from './components/layout/VerticalLayout';
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

const preferenceSections = [
  { id: 'general', name: 'General', icon: Sliders },
  { id: 'audio-video', name: 'Audio & Video', icon: Volume2 },
  { id: 'lyrics-subtitles', name: 'Lyrics & Subtitles', icon: Type },
  { id: 'shortcuts', name: 'Shortcuts', icon: Keyboard },
];

const helpSections = [
  { id: 'quick-start', name: 'Quick Start', icon: BookOpen },
  { id: 'tutorials', name: 'Tutorials', icon: BookOpen },
  { id: 'faq', name: 'FAQ', icon: Search },
  { id: 'support', name: 'Support', icon: Mail },
];

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

  // Shared video slot rect — position the persistent VideoPreviewPanel here
  const videoSlotRef = useRef<HTMLDivElement>(null);
  const [videoSlotRect, setVideoSlotRect] = useState<VideoSlotRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

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
    setActiveLeftPanelTab,
    setActiveSubTab,
    setZoom,
    setStageStyle,
    setLyricTextStyle,
    setSubtitleTextStyle,
    handleLyricChange,
    handleSubtitleChange,
    handleAddLyric,
    handleAddSubtitle,
    handleDeleteLyric,
    handleDeleteSubtitle,
    handleMergeSubtitles,
    handleSplitSubtitle,
    toggleSubtitleSelection,
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
  } = projectState;

  const [horizontalSizes, setHorizontalSizes] = useState({
    leftWidth: 35,
    videoHeight: 60,
    importHeight: 40,
  });
  const [verticalSizes, setVerticalSizes] = useState({
    leftWidth: 70,
    topSplit: 40,
    bottomHeight: 40,
  });

  const [videoAspect, setVideoAspect] = useState<number | null>(null);

  const isModalOpen =
    isPreferencesModalOpen ||
    isAboutModalOpen ||
    isHelpModalOpen ||
    isExportModalOpen ||
    isFileInfoModalOpen ||
    isStageSettingsModalOpen;

  // ─────────────────────────────────────────────────────────
  // Keep the shared VideoPreviewPanel aligned with its slot
  // ─────────────────────────────────────────────────────────
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

    const ro = new ResizeObserver(update);
    ro.observe(slot);
    ro.observe(container);

    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [
    layout.isVerticalLayout,
    layout.isMaximizedVideo,
    horizontalSizes,
    verticalSizes,
  ]);

  const handleOpenStageSettingsModal = useCallback(() => {
    setIsStageSettingsModalOpen(true);
  }, [setIsStageSettingsModalOpen]);

  const handleOpenFileLocal = useCallback(async (): Promise<void> => {
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
      updateTimelineData(id, newStart, newEnd, activeLeftPanelTab);
      markAsUnsaved();
    },
    [updateTimelineData, activeLeftPanelTab, markAsUnsaved],
  );

  const wrappedDeleteTimelineItem = useCallback(
    (id: string) => {
      deleteTimelineItem(id, activeLeftPanelTab);
      markAsUnsaved();
    },
    [deleteTimelineItem, activeLeftPanelTab, markAsUnsaved],
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

  const handleVideoLoadedMetadata = useCallback(() => {
    const video = mediaElementRef.current;
    if (video && video.videoWidth && video.videoHeight) {
      setVideoAspect(video.videoWidth / video.videoHeight);
    }
  }, [mediaElementRef]);

  const contextValue: ProjectEditorContextValue = useMemo(
    () => ({
      isPlaying,
      currentTime,
      volume,
      activeLeftPanelTab,
      activeSubTab,
      lyrics,
      subtitles,
      selectedSubtitleIds,
      mediaDuration,
      isMediaLoaded,
      importedFiles,
      activeFileId,
      mediaUrl,
      loadingFileId,
      zoom,
      markers,
      currentSubtitleText,
      settings,
      stageStyle,
      lyricTextStyle,
      subtitleTextStyle,
      canUndo,
      canRedo,
      activeFile,
      timelineData,
      setIsPlaying: mediaPlayback.setIsPlaying,
      setVolume,
      setActiveLeftPanelTab,
      setActiveSubTab,
      setZoom: wrappedSetZoom,
      handleSeek,
      togglePlayPause,
      handleLyricChange,
      handleSubtitleChange,
      handleAddLyric: wrappedHandleAddLyric,
      handleAddSubtitle: wrappedHandleAddSubtitle,
      handleDeleteLyric,
      handleDeleteSubtitle,
      handleMergeSubtitles,
      handleSplitSubtitle,
      toggleSubtitleSelection,
      handleBatchAddLyrics,
      handleBatchAddSubtitles,
      undo,
      redo,
      handleSettingChange,
      setStageStyle: wrappedSetStageStyle,
      setLyricTextStyle: wrappedSetLyricTextStyle,
      setSubtitleTextStyle: wrappedSetSubtitleTextStyle,
      onFileActivate: wrappedOnFileActivate,
      handleOpenFile: handleOpenFileLocal,
      handleFilesDropped,
      handleClearTimelineAll,
      updateTimelineData: wrappedUpdateTimelineData,
      deleteTimelineItem: wrappedDeleteTimelineItem,
      addMarker: wrappedAddMarker,
      addTimelineItem,
      duplicateTimelineItem,
      handleNewClip,
      formatTime,
      markAsUnsaved,
      mediaElementRef,
      audioElementRef,
      analyserRef,
      isVuOverlayEnabled,
      toggleVuOverlay,
    }),
    [
      isPlaying,
      currentTime,
      volume,
      activeLeftPanelTab,
      activeSubTab,
      lyrics,
      subtitles,
      selectedSubtitleIds,
      mediaDuration,
      isMediaLoaded,
      importedFiles,
      activeFileId,
      mediaUrl,
      loadingFileId,
      zoom,
      markers,
      currentSubtitleText,
      settings,
      stageStyle,
      lyricTextStyle,
      subtitleTextStyle,
      canUndo,
      canRedo,
      activeFile,
      timelineData,
      mediaPlayback.setIsPlaying,
      setVolume,
      setActiveLeftPanelTab,
      setActiveSubTab,
      wrappedSetZoom,
      handleSeek,
      togglePlayPause,
      handleLyricChange,
      handleSubtitleChange,
      wrappedHandleAddLyric,
      wrappedHandleAddSubtitle,
      handleDeleteLyric,
      handleDeleteSubtitle,
      handleMergeSubtitles,
      handleSplitSubtitle,
      toggleSubtitleSelection,
      handleBatchAddLyrics,
      handleBatchAddSubtitles,
      undo,
      redo,
      handleSettingChange,
      wrappedSetStageStyle,
      wrappedSetLyricTextStyle,
      wrappedSetSubtitleTextStyle,
      wrappedOnFileActivate,
      handleOpenFileLocal,
      handleFilesDropped,
      handleClearTimelineAll,
      wrappedUpdateTimelineData,
      wrappedDeleteTimelineItem,
      wrappedAddMarker,
      addTimelineItem,
      duplicateTimelineItem,
      handleNewClip,
      formatTime,
      markAsUnsaved,
      mediaElementRef,
      audioElementRef,
      analyserRef,
      isVuOverlayEnabled,
      toggleVuOverlay,
    ],
  );

  const contentSignature = useMemo(
    () =>
      JSON.stringify({
        lyrics,
        subtitles,
        mediaFiles: importedFiles.map(f => ({
          id: f.id,
          name: f.name,
          path: f.path,
          loaded: f.loaded,
          duration: f.duration,
        })),
        activeFileId,
        markers,
        zoom,
        settings,
        stageStyle,
        lyricTextStyle,
        subtitleTextStyle,
        layout: {
          leftWidth: horizontalSizes.leftWidth,
          videoHeight: horizontalSizes.videoHeight,
          topSplit: verticalSizes.topSplit,
          bottomHeight: verticalSizes.bottomHeight,
        },
        isSaved: isProjectSaved,
      }),
    [
      lyrics,
      subtitles,
      importedFiles,
      activeFileId,
      markers,
      zoom,
      settings,
      stageStyle,
      lyricTextStyle,
      subtitleTextStyle,
      horizontalSizes,
      verticalSizes,
      isProjectSaved,
    ],
  );

  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSignatureRef.current === contentSignature) return;
    lastSignatureRef.current = contentSignature;

    const updatedProject: VoxMatchProject = {
      ...project,
      layout: {
        ...project.layout,
        panels: {
          ...project.layout.panels,
          leftPanelWidth: horizontalSizes.leftWidth,
          videoPanelHeight: horizontalSizes.videoHeight,
          importMediaPanelVerticalWidth: verticalSizes.topSplit,
          leftPanelBottomHeight: verticalSizes.bottomHeight,
        },
      },
      settings,
      lyrics,
      subtitles,
      mediaFiles: importedFiles,
      activeFileId,
      stageStyle,
      lyricTextStyle,
      subtitleTextStyle,
      markers,
      zoom,
      isSaved: isProjectSaved,
    };
    onProjectUpdate(updatedProject);
  }, [
    contentSignature,
    project,
    onProjectUpdate,
    settings,
    lyrics,
    subtitles,
    importedFiles,
    activeFileId,
    stageStyle,
    lyricTextStyle,
    subtitleTextStyle,
    markers,
    zoom,
    horizontalSizes,
    verticalSizes,
    isProjectSaved,
  ]);

  useEffect(() => {
    onThemeChange(settings.theme);
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--primary', settings.primaryColor);
    document.documentElement.style.setProperty(
      '--primary-hover',
      `${settings.primaryColor}E6`,
    );
  }, [settings, onThemeChange]);

  useKeyboardShortcuts(
    [
      {
        ...SHORTCUTS.PLAY_PAUSE,
        handler: () => !isModalOpen && togglePlayPause(),
      },
      { ...SHORTCUTS.UNDO, handler: () => !isModalOpen && canUndo && undo() },
      { ...SHORTCUTS.REDO, handler: () => !isModalOpen && canRedo && redo() },
      {
        ...SHORTCUTS.REDO_ALT,
        handler: () => !isModalOpen && canRedo && redo(),
      },
      { ...SHORTCUTS.SAVE, handler: () => !isModalOpen && handleSaveProject() },
      {
        ...SHORTCUTS.SAVE_AS,
        handler: () => !isModalOpen && handleSaveProjectAs(),
      },
      {
        ...SHORTCUTS.NEW_CLIP,
        handler: () => !isModalOpen && handleNewClip(),
      },
    ],
    { enabled: true },
  );

  useEffect(() => {
    const handleClickOutside = () =>
      editor.setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [editor.setContextMenu]);

  const handleHorizontalResize = useCallback(
    (updates: Partial<typeof horizontalSizes>) => {
      setHorizontalSizes(prev => ({ ...prev, ...updates }));
      markAsUnsaved();
    },
    [markAsUnsaved],
  );

  const handleVerticalResize = useCallback(
    (updates: Partial<typeof verticalSizes>) => {
      setVerticalSizes(prev => ({ ...prev, ...updates }));
      markAsUnsaved();
    },
    [markAsUnsaved],
  );

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
          accept="audio/*,video/*"
          multiple
          onChange={e => {
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
              containerRef={containerRef}
              isLeftPanelTopRowFilled={layout.isLeftPanelTopRowFilled}
              isMaximizedVideo={layout.isMaximizedVideo}
              onToggleLeftPanelTopRowFilled={toggleLeftPanelTopRowFilled}
              onToggleMaximizeVideo={toggleMaximizeVideo}
              onContextMenu={handleContextMenu}
              onOpenStageSettingsModal={handleOpenStageSettingsModal}
              videoSlotRef={videoSlotRef}
            />
          ) : (
            <HorizontalLayout
              sizes={horizontalSizes}
              onResize={handleHorizontalResize}
              containerRef={containerRef}
              isLeftPanelFilled={layout.isLeftPanelFilled}
              isMaximizedVideo={layout.isMaximizedVideo}
              onToggleLeftPanelFilled={toggleLeftPanelFilled}
              onToggleMaximizeVideo={toggleMaximizeVideo}
              onContextMenu={handleContextMenu}
              onOpenStageSettingsModal={handleOpenStageSettingsModal}
              videoSlotRef={videoSlotRef}
            />
          )}

          {/* Persistent VideoPreviewPanel — never unmounts across layout switches */}
          <div
            className="absolute z-10"
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
              setIsMaximizedVideo={toggleMaximizeVideo}
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
            />
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
            onClose={() => setIsExportModalOpen(false)}
          />
        </Modal>

        <Modal
          isOpen={isPreferencesModalOpen}
          onClose={() => setIsPreferencesModalOpen(false)}
          title="Preferences"
          isSidePanelContent
        >
          <div className="flex h-[calc(90vh-100px)]">
            <div className="w-1/4 bg-app-gray-dark border-r border-app-border p-4 space-y-2 overflow-y-auto">
              {preferenceSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActivePreferenceSection(section.id)}
                  className={`w-full flex items-center p-3 rounded-md text-left ${
                    activePreferenceSection === section.id
                      ? 'bg-primary text-white'
                      : 'text-app-text hover:bg-app-gray-light'
                  }`}
                >
                  <section.icon size={18} className="mr-3" /> {section.name}
                </button>
              ))}
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <SettingsModalContent
                settings={settings}
                handleSettingChange={handleSettingChange}
                activeSection={activePreferenceSection}
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          title="Help & Support"
          isSidePanelContent
        >
          <div className="flex h-[calc(90vh-100px)]">
            <div className="w-1/4 bg-app-gray-dark border-r border-app-border p-4 space-y-2 overflow-y-auto">
              {helpSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveHelpSection(section.id)}
                  className={`w-full flex items-center p-3 rounded-md text-left ${
                    activeHelpSection === section.id
                      ? 'bg-primary text-white'
                      : 'text-app-text hover:bg-app-gray-light'
                  }`}
                >
                  <section.icon size={18} className="mr-3" /> {section.name}
                </button>
              ))}
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <HelpModalContent
                activeSection={activeHelpSection}
                openAccordion={openAccordion}
                toggleAccordion={toggleAccordion}
              />
            </div>
          </div>
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
            setStageStyle={newStyle => {
              setStageStyle(newStyle);
              markAsUnsaved();
            }}
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

export const ProjectEditor: React.FC<ProjectEditorProps> = props => (
  <ProjectEditorContent {...props} />
);