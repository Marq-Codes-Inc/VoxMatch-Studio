// src/components/panels/SubtitlesLyricsEditPanel.tsx
import {
  Type,
  FileText,
  Maximize2,
  Minimize2,
  Split,
  Combine,
  Trash2,
  CheckSquare,
  Plus,
  Layers,
  Edit,
  Loader,
  Upload,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { TemplatesContent } from '../modals/TemplatesContent';
import { Modal } from '../ui/Modal';
import { PasteImportModalContent } from '../modals/PasteImportModalContent';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';

import { LyricsList } from './EditPanel/LyricsList';
import { TextStyleControls } from './EditPanel/TextStyleControls';

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
    handleDeleteSubtitle,
    handleDeleteLyric,
    handleMergeSubtitles,
    handleSplitSubtitleAt,
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
    currentTime,
    activeFile,
    handleAlignTimestamps,
    cancelAlignTimestamps,
    isAligning,
    alignProgress,
  } = ctx;

  const lyricsListRef = useRef<HTMLDivElement>(null);
  const subtitlesListRef = useRef<HTMLDivElement>(null);

  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);

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

  const lastScrolledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeClipId || lastScrolledRef.current === activeClipId) return;
    const container = listRef.current;
    if (!container) return;
    
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

  const handleFineTuneClick = () => {
    if (!activeFile) return;
    const text = activeLeftPanelTab === 'lyrics' 
      ? lyrics.map(l => l.text).join('\n')
      : subtitles.map(s => s.text).join('\n');
      
    handleAlignTimestamps(activeFile, text, () => {
      // Success callback
      // We use setTimeout to let React paint the final UI state before blocking with an alert
      setTimeout(() => alert('Alignment complete! Check your timeline.'), 100);
    });
  };

  return (
    <div className="bg-app-surface p-4 rounded-lg border border-app-border h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 space-y-3 pb-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold flex items-center">
            <Edit className="mr-2 text-primary" /> Edit
          </h3>
          <div className="flex items-center gap-2">
            {isVerticalLayout ? (
              <button
                onClick={() => setIsLeftPanelTopRowFilled(!isLeftPanelTopRowFilled)}
                className="p-2 rounded-md text-app-icon-color hover:bg-app-gray-light"
                title={isLeftPanelTopRowFilled ? 'Restore Panel' : 'Fill Pane'}
              >
                {isLeftPanelTopRowFilled ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            ) : (
              <button
                onClick={() => setIsLeftPanelFilled(!isLeftPanelFilled)}
                className="p-2 rounded-md text-app-icon-color hover:bg-app-gray-light"
                title={isLeftPanelFilled ? 'Restore Panel' : 'Fill Pane'}
              >
                {isLeftPanelFilled ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
          </div>
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
            
            {/* Header Actions (Create / Fine-Tune) */}
            <div className="flex-shrink-0 pb-3 flex items-center justify-end gap-2">
              <div className="relative group">
                <button
                  onClick={() => setIsPasteModalOpen(true)}
                  disabled={isAligning}
                  className="px-4 py-2 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray-dark hover:text-white flex items-center justify-center text-sm font-medium transition-colors border border-transparent hover:border-app-border-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="mr-1.5" size={16} /> Add Clips
                </button>
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-[100] px-2 py-1 bg-app-surface border border-app-border text-app-text text-xs rounded shadow-lg whitespace-nowrap">
                  Paste text or import a subtitle file
                </div>
              </div>
              
              {activeFile && activeList.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFineTuneClick}
                    disabled={isAligning}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover flex items-center justify-center text-sm font-medium disabled:opacity-80 transition-all shadow-md shadow-primary/20"
                    title="Aligns existing clips precisely to the audio using AI"
                  >
                    {isAligning ? (
                      <>
                        <Loader className="animate-spin mr-1.5" size={16} />
                        Aligning {alignProgress}%
                      </>
                    ) : (
                      'Fine-Tune Timing'
                    )}
                  </button>

                  {isAligning && (
                    <button
                      onClick={cancelAlignTimestamps}
                      className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger/80 flex items-center justify-center text-sm font-medium transition-colors shadow-md shadow-danger/20"
                      title="Cancel alignment"
                    >
                      <XCircle className="mr-1.5" size={16} />
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Contextual Selection Toolbar */}
            {selectedSet.size > 0 && !isAligning && (
              <div className="flex-shrink-0 pb-3 flex flex-wrap gap-2 p-2 bg-app-gray-light/50 rounded-lg border border-app-border animate-fade-in">
                <span className="text-xs text-app-text font-medium py-1.5 px-1 mr-auto">
                  {selectedSet.size} selected
                </span>
                {activeLeftPanelTab === 'subtitles' && (
                  <>
                    <button
                      onClick={() => {
                        if (selectedSubtitleIds.size === 1) {
                          handleSplitSubtitleAt([...selectedSubtitleIds][0], currentTime);
                        }
                      }}
                      disabled={selectedSubtitleIds.size !== 1}
                      className="px-2.5 py-1.5 bg-app-surface border border-app-border text-app-text rounded hover:bg-app-gray flex items-center text-xs disabled:opacity-50"
                    >
                      <Split className="mr-1" size={12} /> Split
                    </button>
                    <button
                      onClick={handleMergeSubtitles}
                      disabled={selectedSubtitleIds.size < 2}
                      className="px-2.5 py-1.5 bg-app-surface border border-app-border text-app-text rounded hover:bg-app-gray flex items-center text-xs disabled:opacity-50"
                    >
                      <Combine className="mr-1" size={12} /> Merge
                    </button>
                  </>
                )}
                <button
                  onClick={handleDeleteSelected}
                  className="px-2.5 py-1.5 bg-app-surface border border-app-border text-danger rounded hover:bg-danger/10 flex items-center text-xs"
                >
                  <Trash2 className="mr-1" size={12} /> Delete
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col">
              {activeList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-app-gray-light/5 rounded-lg border-2 border-dashed border-app-border">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <FileText size={32} className="text-primary opacity-80" />
                  </div>
                  <h4 className="text-lg font-semibold text-app-text mb-2">No {activeLeftPanelTab} yet</h4>
                  <p className="text-sm text-app-gray mb-6 max-w-[250px]">
                    Paste your text or import a subtitle file to generate timeline clips.
                  </p>
                  <button
                    onClick={() => setIsPasteModalOpen(true)}
                    disabled={isAligning}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover flex items-center justify-center text-sm font-medium shadow-lg shadow-primary/20 transition-all mb-3 disabled:opacity-50"
                  >
                    <Upload className="mr-2" size={16} />
                    Get Started
                  </button>
                  
                  <button
                    onClick={() => setActiveSubTab('styles')}
                    className="text-xs text-app-gray hover:text-app-text flex items-center justify-center gap-1 transition-colors group"
                  >
                    <Layers size={14} className="group-hover:text-primary transition-colors" />
                    Or customize the Stage layout first
                  </button>
                </div>
              ) : (
                <LyricsList
                  list={activeList}
                  activeClipId={activeClipId}
                  selectedIds={selectedSet}
                  toggleSelection={activeLeftPanelTab === 'subtitles' ? toggleSubtitleSelection : toggleLyricSelection}
                  onChange={activeLeftPanelTab === 'subtitles' ? handleSubtitleChange : handleLyricChange}
                  onDelete={activeLeftPanelTab === 'subtitles' ? handleDeleteSubtitle : handleDeleteLyric}
                  listRef={listRef}
                />
              )}
            </div>

            {/* Select All Footer */}
            {activeList.length > 0 && (
              <div className="flex-shrink-0 pt-3 mt-2 border-t border-app-border flex justify-end items-center">
                <button
                  onClick={handleSelectAll}
                  disabled={isAligning}
                  className="px-2 py-1.5 text-app-gray hover:text-app-text flex items-center text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <CheckSquare className="mr-1.5" size={14} /> {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'styles' && (
          <div className="flex-1 overflow-y-auto lyrics-list-scrollbar pr-2 space-y-4">
            <button
              onClick={onOpenStageSettingsModal}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-app-gray-light hover:bg-app-gray-dark text-app-text text-sm font-medium"
            >
              <Layers size={16} /> Edit Stage Settings
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

      <Modal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        title={`Add ${activeLeftPanelTab === 'subtitles' ? 'Subtitles' : 'Lyrics'}`}
        size="lg"
      >
        <PasteImportModalContent onClose={() => setIsPasteModalOpen(false)} />
      </Modal>
    </div>
  );
};
