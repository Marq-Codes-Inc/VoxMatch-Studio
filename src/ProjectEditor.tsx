import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sliders, Volume2, Type, Keyboard, BookOpen, Search, Mail } from 'lucide-react';
import { Modal } from './components/ui/Modal';
import { TopBar } from './components/editor/TopBar';
import { ContextMenu } from './components/editor/ContextMenu';
import { HorizontalLayout } from './components/layout/HorizontalLayout';
import { VerticalLayout } from './components/layout/VerticalLayout';
import { FileInfoModalContent } from './components/modals/FileInfoModalContent';
import { StageSettingsContent } from './components/modals/StageSettingsModalContent';
import { SettingsModalContent } from './components/modals/SettingsModalContent';
import { AboutModalContent } from './components/modals/AboutModalContent';
import { HelpModalContent } from './components/modals/HelpModalContent';
import { ExportModalContent } from './components/modals/ExportModalContent';
import { VoxMatchProject } from './types/project';
import { useProjectEditor } from './hooks/useProjectEditor';
import { useKeyboardShortcuts, SHORTCUTS } from './hooks/useKeyboardShortcuts';
import { ProjectEditorProvider, ProjectEditorContextValue } from './contexts/ProjectEditorContext';
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

const ProjectEditorContent: React.FC<ProjectEditorProps> = ({
  project,
  onProjectUpdate,
  onSaveProject,
  onSaveProjectAs,
  onCloseProject,
  onThemeChange,
}) => {
  const editor = useProjectEditor(project);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    isPreferencesModalOpen, setIsPreferencesModalOpen,
    isAboutModalOpen, setIsAboutModalOpen,
    isHelpModalOpen, setIsHelpModalOpen,
    isExportModalOpen, setIsExportModalOpen,
    isFileInfoModalOpen, setIsFileInfoModalOpen,
    isStageSettingsModalOpen, setIsStageSettingsModalOpen,
    selectedFileInfo, setSelectedFileInfo,
    activePreferenceSection, setActivePreferenceSection,
    activeHelpSection, setActiveHelpSection,
    openAccordion, toggleAccordion,
    handleNewClip,
    formatTime,
    onFileActivate,
  } = editor;

  const {
    isPlaying, currentTime, volume, mediaDuration, isMediaLoaded, mediaUrl,
    mediaElementRef, audioElementRef, analyserRef, setVolume, handleSeek,
    togglePlayPause,
  } = mediaPlayback;

  const {
    activeLeftPanelTab, activeSubTab, lyrics, subtitles, selectedSubtitleIds,
    importedFiles, activeFileId, loadingFileId, zoom, markers, settings,
    stageStyle, lyricTextStyle, subtitleTextStyle, currentSubtitleText, activeFile,
    timelineData, canUndo, canRedo, setActiveLeftPanelTab, setActiveSubTab,
    setZoom, setStageStyle, setLyricTextStyle, setSubtitleTextStyle,
    handleLyricChange, handleSubtitleChange, handleAddLyric, handleAddSubtitle,
    handleDeleteLyric, handleDeleteSubtitle, handleMergeSubtitles, handleSplitSubtitle,
    toggleSubtitleSelection, handleBatchAddLyrics, handleBatchAddSubtitles,
    undo, redo, handleSettingChange, updateTimelineData, deleteTimelineItem,
    addMarker, addTimelineItem, duplicateTimelineItem,
  } = projectState;

  const [horizontalSizes, setHorizontalSizes] = useState({ leftWidth: 35, videoHeight: 60, importHeight: 40 });
  const [verticalSizes, setVerticalSizes] = useState({ leftWidth: 70, topSplit: 40, bottomHeight: 40 });

  // Portal target for the video element – will be placed inside VideoPreviewPanel
  const mediaPortalRef = useRef<HTMLDivElement>(null);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);

  // local file‑open trigger
  const handleOpenFileLocal = useCallback(async (): Promise<void> => {
    fileInputRef.current?.click();
  }, []);

  // wrappers that also mark as unsaved
  const wrappedSetStageStyle = useCallback((style: StageStyle | ((prev: StageStyle) => StageStyle)) => {
    setStageStyle(style);
    markAsUnsaved();
  }, [setStageStyle, markAsUnsaved]);
  const wrappedSetLyricTextStyle = useCallback((style: TextStyle | ((prev: TextStyle) => TextStyle)) => {
    setLyricTextStyle(style);
    markAsUnsaved();
  }, [setLyricTextStyle, markAsUnsaved]);
  const wrappedSetSubtitleTextStyle = useCallback((style: TextStyle | ((prev: TextStyle) => TextStyle)) => {
    setSubtitleTextStyle(style);
    markAsUnsaved();
  }, [setSubtitleTextStyle, markAsUnsaved]);
  const wrappedHandleAddLyric = useCallback(() => {
    handleAddLyric(currentTime);
  }, [handleAddLyric, currentTime]);
  const wrappedHandleAddSubtitle = useCallback(() => {
    handleAddSubtitle(currentTime);
  }, [handleAddSubtitle, currentTime]);
  const wrappedUpdateTimelineData = useCallback((id: string, newStart: number, newEnd: number) => {
    updateTimelineData(id, newStart, newEnd, activeLeftPanelTab);
    markAsUnsaved();
  }, [updateTimelineData, activeLeftPanelTab, markAsUnsaved]);
  const wrappedDeleteTimelineItem = useCallback((id: string) => {
    deleteTimelineItem(id, activeLeftPanelTab);
    markAsUnsaved();
  }, [deleteTimelineItem, activeLeftPanelTab, markAsUnsaved]);
  const wrappedAddMarker = useCallback((time: number, label: string) => {
    addMarker(time, label);
    markAsUnsaved();
  }, [addMarker, markAsUnsaved]);
  const wrappedSetZoom = useCallback((value: number) => {
    setZoom(value);
    markAsUnsaved();
  }, [setZoom, markAsUnsaved]);
  const wrappedOnFileActivate = useCallback(async (file: ImportedMediaFile) => {
    await onFileActivate(file);
  }, [onFileActivate]);

  // Handle video metadata loaded – updates aspect ratio
  const handleVideoLoadedMetadata = useCallback(() => {
    const video = mediaElementRef.current;
    if (video && video.videoWidth && video.videoHeight) {
      setVideoAspect(video.videoWidth / video.videoHeight);
    }
  }, [mediaElementRef]);

  // Context value (unchanged)
  const contextValue: ProjectEditorContextValue = useMemo(() => ({
    isPlaying, currentTime, volume, activeLeftPanelTab, activeSubTab, lyrics, subtitles,
    selectedSubtitleIds, mediaDuration, isMediaLoaded, importedFiles, activeFileId, mediaUrl,
    loadingFileId, zoom, markers, currentSubtitleText, settings, stageStyle, lyricTextStyle,
    subtitleTextStyle, canUndo, canRedo, activeFile, timelineData,
    setIsPlaying: mediaPlayback.setIsPlaying,
    setVolume, setActiveLeftPanelTab, setActiveSubTab, setZoom: wrappedSetZoom,
    handleSeek, togglePlayPause, handleLyricChange, handleSubtitleChange,
    handleAddLyric: wrappedHandleAddLyric, handleAddSubtitle: wrappedHandleAddSubtitle,
    handleDeleteLyric, handleDeleteSubtitle, handleMergeSubtitles, handleSplitSubtitle,
    toggleSubtitleSelection, handleBatchAddLyrics, handleBatchAddSubtitles,
    undo, redo, handleSettingChange, setStageStyle: wrappedSetStageStyle,
    setLyricTextStyle: wrappedSetLyricTextStyle, setSubtitleTextStyle: wrappedSetSubtitleTextStyle,
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
    mediaElementRef, audioElementRef, analyserRef,
  }), [
    isPlaying, currentTime, volume, activeLeftPanelTab, activeSubTab, lyrics, subtitles,
    selectedSubtitleIds, mediaDuration, isMediaLoaded, importedFiles, activeFileId, mediaUrl,
    loadingFileId, zoom, markers, currentSubtitleText, settings, stageStyle, lyricTextStyle,
    subtitleTextStyle, canUndo, canRedo, activeFile, timelineData, mediaPlayback.setIsPlaying,
    setVolume, setActiveLeftPanelTab, setActiveSubTab, wrappedSetZoom, handleSeek,
    togglePlayPause, handleLyricChange, handleSubtitleChange, wrappedHandleAddLyric,
    wrappedHandleAddSubtitle, handleDeleteLyric, handleDeleteSubtitle, handleMergeSubtitles,
    handleSplitSubtitle, toggleSubtitleSelection, handleBatchAddLyrics, handleBatchAddSubtitles,
    undo, redo, handleSettingChange, wrappedSetStageStyle, wrappedSetLyricTextStyle,
    wrappedSetSubtitleTextStyle, wrappedOnFileActivate, handleOpenFileLocal,
    handleFilesDropped, handleClearTimelineAll, wrappedUpdateTimelineData,
    wrappedDeleteTimelineItem, wrappedAddMarker, addTimelineItem, duplicateTimelineItem,
    handleNewClip, formatTime, markAsUnsaved,
    mediaElementRef, audioElementRef, analyserRef,
  ]);

  // save project data on change
  useEffect(() => {
    const data = {
      settings, lyrics, subtitles, mediaFiles: importedFiles, activeFileId, stageStyle,
      lyricTextStyle, subtitleTextStyle, markers, zoom, horizontalSizes, verticalSizes,
    };
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
        }
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
      updatedAt: Date.now(),
    };
    localStorage.setItem(`voxmatch-project-${project.id}`, JSON.stringify(updatedProject));
    onProjectUpdate(updatedProject);
  }, [project, isProjectSaved, onProjectUpdate,
    settings, lyrics, subtitles, importedFiles, activeFileId, stageStyle,
    lyricTextStyle, subtitleTextStyle, markers, zoom, horizontalSizes, verticalSizes]);

  // apply theme
  useEffect(() => {
    onThemeChange(settings.theme);
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--primary', settings.primaryColor);
    document.documentElement.style.setProperty('--primary-hover', `${settings.primaryColor}E6`);
  }, [settings, onThemeChange]);

  // keyboard shortcuts
  useKeyboardShortcuts([
    { ...SHORTCUTS.PLAY_PAUSE, handler: () => !isModalOpen && togglePlayPause() },
    { ...SHORTCUTS.UNDO, handler: () => !isModalOpen && canUndo && undo() },
    { ...SHORTCUTS.REDO, handler: () => !isModalOpen && canRedo && redo() },
    { ...SHORTCUTS.REDO_ALT, handler: () => !isModalOpen && canRedo && redo() },
    { ...SHORTCUTS.SAVE, handler: () => !isModalOpen && handleSaveProject() },
    { ...SHORTCUTS.SAVE_AS, handler: () => !isModalOpen && handleSaveProjectAs() },
    { ...SHORTCUTS.NEW_CLIP, handler: () => !isModalOpen && handleNewClip() },
  ], { enabled: true });

  const isModalOpen = isPreferencesModalOpen || isAboutModalOpen || isHelpModalOpen ||
    isExportModalOpen || isFileInfoModalOpen || isStageSettingsModalOpen;

  useEffect(() => {
    const handleClickOutside = () => editor.setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [editor.setContextMenu]);

  const handleHorizontalResize = useCallback((updates: Partial<typeof horizontalSizes>) => {
    setHorizontalSizes(prev => ({ ...prev, ...updates }));
    markAsUnsaved();
  }, [markAsUnsaved]);
  const handleVerticalResize = useCallback((updates: Partial<typeof verticalSizes>) => {
    setVerticalSizes(prev => ({ ...prev, ...updates }));
    markAsUnsaved();
  }, [markAsUnsaved]);

  return (
    <ProjectEditorProvider value={contextValue}>
      <div ref={containerRef} className="flex h-screen w-screen bg-app-bg text-app-text overflow-hidden relative font-inter">
        <style>{`
          :root { --primary: #046466; --primary-hover: #034a4c; --success: #10b981; --danger: #ef4444; --app-bg: #111111; --app-surface: #1a1a1a; --app-border: #2d2d2d; --app-gray-light: #2a2a2a; --app-gray: #a3a3a3; --app-gray-dark: #1f1f1f; --app-text: #e5e5e5; --app-icon-color: #a3a3a3; --app-input-bg: #222222; --app-timeline-bg: #0f0f0f; --app-border-disabled: #3a3a3a; }
          [data-theme="dark"] { --app-bg: #111111; --app-surface: #1a1a1a; --app-border: #2d2d2d; --app-gray-light: #2a2a2a; --app-gray: #a3a3a3; --app-gray-dark: #1f1f1f; --app-text: #e5e5e5; --app-icon-color: #a3a3a3; --app-input-bg: #222222; --app-timeline-bg: #0f0f0f; --app-border-disabled: #3a3a3a; }
          [data-theme="light"] { --app-bg: #f5f5f5; --app-surface: #ffffff; --app-border: #e0e0e0; --app-gray-light: #f0f0f0; --app-gray: #666666; --app-gray-dark: #e0e0e0; --app-text: #1a1a1a; --app-icon-color: #555555; --app-input-bg: #ffffff; --app-timeline-bg: #f0f0f0; --app-border-disabled: #d0d0d0; }
          button { transition: none !important; }
        `}</style>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="audio/*,video/*"
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

        <main className="flex-1 flex pt-14 min-h-0">
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
              mediaPortalRef={mediaPortalRef}
              videoAspect={videoAspect}
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
              mediaPortalRef={mediaPortalRef}
              videoAspect={videoAspect}
            />
          )}
        </main>

        {/* Portal: renders the actual <video> element into the VideoPreviewPanel's portal target */}
        {mediaPortalRef.current && createPortal(
          <video
            key={activeFileId}                     // forces unmount/remount on file switch
            ref={mediaElementRef}
            src={isMediaLoaded ? (mediaUrl || undefined) : undefined}
            onLoadedMetadata={handleVideoLoadedMetadata}
            className="absolute inset-0 w-full h-full object-contain z-10"
            style={{ display: activeFile?.type.startsWith('video') ? 'block' : 'none' }}
            playsInline
          />,
          mediaPortalRef.current
        )}

        <ContextMenu
          contextMenu={contextMenu}
          onItemClick={handleContextMenuItemClick}
          activeFileId={activeFileId}
        />

        {/* Modals – unchanged */}
        <Modal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} title="About VoxMatch Studio">
          <AboutModalContent />
        </Modal>
        <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export Project Settings">
          <ExportModalContent
            settings={settings}
            handleSettingChange={handleSettingChange}
            selectSaveLocation={async () => window.electronAPI?.selectSaveLocation?.() ?? null}
            file={activeFile || null}
            project={project}
            onClose={() => setIsExportModalOpen(false)}
          />
        </Modal>
        <Modal isOpen={isPreferencesModalOpen} onClose={() => setIsPreferencesModalOpen(false)} title="Preferences" isSidePanelContent={true}>
          <div className="flex h-[calc(90vh-100px)]">
            <div className="w-1/4 bg-app-gray-dark border-r border-app-border p-4 space-y-2 overflow-y-auto">
              {preferenceSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActivePreferenceSection(section.id)}
                  className={`w-full flex items-center p-3 rounded-md text-left ${
                    activePreferenceSection === section.id ? 'bg-primary text-white' : 'text-app-text hover:bg-app-gray-light'
                  }`}
                >
                  <section.icon size={18} className="mr-3" /> {section.name}
                </button>
              ))}
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <SettingsModalContent settings={settings} handleSettingChange={handleSettingChange} activeSection={activePreferenceSection} />
            </div>
          </div>
        </Modal>
        <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} title="Help & Support" isSidePanelContent={true}>
          <div className="flex h-[calc(90vh-100px)]">
            <div className="w-1/4 bg-app-gray-dark border-r border-app-border p-4 space-y-2 overflow-y-auto">
              {helpSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveHelpSection(section.id)}
                  className={`w-full flex items-center p-3 rounded-md text-left ${
                    activeHelpSection === section.id ? 'bg-primary text-white' : 'text-app-text hover:bg-app-gray-light'
                  }`}
                >
                  <section.icon size={18} className="mr-3" /> {section.name}
                </button>
              ))}
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <HelpModalContent activeSection={activeHelpSection} openAccordion={openAccordion} toggleAccordion={toggleAccordion} />
            </div>
          </div>
        </Modal>
        <Modal isOpen={isFileInfoModalOpen} onClose={() => setIsFileInfoModalOpen(false)} title="File Information">
          <FileInfoModalContent file={selectedFileInfo} />
        </Modal>
        <Modal isOpen={isStageSettingsModalOpen} onClose={() => setIsStageSettingsModalOpen(false)} title="Stage Settings" size="stage">
          <StageSettingsContent
            stageStyle={stageStyle}
            setStageStyle={(newStyle) => { setStageStyle(newStyle); markAsUnsaved(); }}
            onClose={() => setIsStageSettingsModalOpen(false)}
          />
        </Modal>
      </div>
    </ProjectEditorProvider>
  );
};

export const ProjectEditor: React.FC<ProjectEditorProps> = (props) => {
  return <ProjectEditorContent {...props} />;
};

