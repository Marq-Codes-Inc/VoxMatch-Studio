// src/components/panels/ImportMediaPanel.tsx
import { Upload, MoreVertical, Film, Music, Plus, Loader } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { ImportedMediaFile } from '../../types/types';

interface ImportMediaPanelProps {
  importedFiles: ImportedMediaFile[];
  activeFileId: string | null;
  loadingFileId?: string | null;
  handleOpenFile: () => void;
  handleContextMenu: (
    e: React.MouseEvent | React.SyntheticEvent,
    file: ImportedMediaFile,
    targetElement?: HTMLElement,
  ) => void;
  handleDragStart?: (e: React.DragEvent, file: ImportedMediaFile) => void;
  onFileActivate: (file: ImportedMediaFile) => Promise<void>;
  onFilesDropped?: (files: File[]) => Promise<void>;
}

const ACCEPTED_EXT = new Set([
  'mp3', 'wav', 'm4a', 'ogg', 'flac', 'mp4', 'mov', 'webm', 'mkv',
  'srt', 'vtt', 'lrc', 'ass', 'ssa',
]);

function isFileDrag(e: React.DragEvent): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types as any).includes('Files');
}

export const ImportMediaPanel: React.FC<ImportMediaPanelProps> = ({
  importedFiles,
  activeFileId,
  loadingFileId,
  handleOpenFile,
  handleContextMenu,
  handleDragStart,
  onFileActivate,
  onFilesDropped,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  const dragDepthRef = useRef(0);

  const videoCount = importedFiles.filter((f) => f.type.startsWith('video')).length;
  const audioCount = importedFiles.filter((f) => f.type.startsWith('audio')).length;
  const totalCount = importedFiles.length;

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const resetDragState = () => {
    dragDepthRef.current = 0;
    setIsDragOver(false);
  };

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (dragDepthRef.current === 1) setIsDragOver(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      resetDragState();

      const files = Array.from(e.dataTransfer.files);
      const accepted = files.filter((file) => {
        const ext = file.name.toLowerCase().split('.').pop() || '';
        return (
          ACCEPTED_EXT.has(ext) ||
          file.type.startsWith('audio/') ||
          file.type.startsWith('video/')
        );
      });

      if (accepted.length === 0) {
        alert('Please drop audio, video, or subtitle files.');
        return;
      }

      setIsProcessingDrop(true);
      try {
        if (onFilesDropped) await onFilesDropped(accepted);
        else handleOpenFile();
      } catch (error) {
        console.error('Error processing dropped files:', error);
        alert('Failed to process some files. Please try again.');
      } finally {
        setIsProcessingDrop(false);
      }
    },
    [onFilesDropped, handleOpenFile],
  );

  const getFileIcon = (file: ImportedMediaFile) => {
    if (file.type.startsWith('video'))
      return <Film size={16} className="text-blue-400" />;
    if (file.type.startsWith('audio'))
      return <Music size={16} className="text-green-400" />;
    return <Upload size={16} />;
  };

  const handleItemDragStart = (
    e: React.DragEvent,
    file: ImportedMediaFile,
    isLoading: boolean,
  ) => {
    if (isLoading) return;
    e.dataTransfer.setData('text/plain', file.id);
    e.dataTransfer.effectAllowed = 'copy';
    handleDragStart?.(e, file);
  };

  return (
    <div
      className={`bg-app-surface p-4 rounded-lg border transition-colors flex flex-col h-full import-media-panel min-h-0 ${
        isDragOver ? 'border-primary border-2 bg-primary/5' : 'border-app-border'
      }`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <h3 className="text-xl font-semibold mb-4 flex items-center flex-shrink-0">
        <Upload className="mr-2 text-primary" /> Media
      </h3>

      {importedFiles.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center text-app-gray flex-grow flex flex-col justify-center transition-colors ${
            isDragOver ? 'border-primary bg-primary/10' : 'border-app-border'
          }`}
        >
          {isProcessingDrop ? (
            <>
              <Loader className="animate-spin mx-auto mb-2 text-primary" size={32} />
              <p className="mb-2 text-sm">Processing files...</p>
            </>
          ) : (
            <>
              <Upload className="mx-auto mb-3 text-app-gray" size={32} />
              <p className="mb-2 text-sm font-medium">
                Drag & drop media or subtitle files here
              </p>
              <p className="mb-2 text-xs text-app-gray">or</p>
              <button
                className="mt-2 px-4 py-1.5 bg-primary text-white rounded-md hover:bg-primary-hover text-sm cursor-pointer transition-colors"
                onClick={handleOpenFile}
              >
                Browse Files
              </button>
              <p className="mt-3 text-xs text-app-gray">
                Supported: MP3, WAV, M4A, OGG, FLAC, MP4, MOV, WebM, MKV
              </p>
              <p className="mt-1 text-xs text-app-gray">
                Subtitles: SRT, VTT, LRC, ASS
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <span className="text-xs text-app-gray">
              {totalCount} file{totalCount !== 1 ? 's' : ''} imported
            </span>
            <button
              onClick={handleOpenFile}
              disabled={isProcessingDrop}
              className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-hover flex items-center text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-1" size={16} /> Add File
            </button>
          </div>

          <div className="flex justify-start gap-4 mb-3 flex-shrink-0 text-xs font-mono text-app-gray bg-app-gray-light/50 p-2 rounded-md">
            <span className="flex items-center gap-1">
              <Film size={14} className="text-blue-400" /> {videoCount} Video
            </span>
            <span className="flex items-center gap-1">
              <Music size={14} className="text-green-400" /> {audioCount} Audio
            </span>
          </div>

          {isDragOver && (
            <div className="flex-shrink-0 mb-2 p-2 bg-primary/10 border border-dashed border-primary rounded-md text-center">
              <p className="text-xs text-primary">Drop files to add</p>
            </div>
          )}

          {isProcessingDrop && (
            <div className="flex-shrink-0 mb-2 p-2 bg-primary/10 rounded-md flex items-center justify-center gap-2">
              <Loader className="animate-spin text-primary" size={14} />
              <span className="text-xs">Processing...</span>
            </div>
          )}

          <ul className="space-y-1.5 overflow-y-auto lyrics-list-scrollbar flex-1 min-h-0">
            {importedFiles.map((file) => {
              const isActive = activeFileId === file.id;
              const isLoading = loadingFileId === file.id;
              const isLoaded = file.loaded;
              return (
                <li
                  key={file.id}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  onDoubleClick={async (e) => {
                    e.stopPropagation();
                    if (!isLoading && onFileActivate) await onFileActivate(file);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-md border text-sm transition-all cursor-default ${
                    isActive
                      ? 'bg-primary/20 text-app-text border-primary shadow-sm'
                      : 'bg-app-gray-light/50 text-app-text border-app-border hover:bg-app-gray-light hover:border-app-border-light'
                  } ${isLoading ? 'opacity-70' : ''}`}
                >
                  <div
                    draggable={!isLoading}
                    onDragStart={(e) => handleItemDragStart(e, file, isLoading)}
                    className={`flex-1 pr-2 truncate flex items-center ${
                      !isLoading ? 'cursor-grab' : 'cursor-default'
                    }`}
                  >
                    {isActive && (
                      <span
                        className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0 animate-pulse"
                        title="Active in timeline"
                      />
                    )}
                    {!isLoaded && !isLoading && (
                      <span
                        className="w-2 h-2 rounded-full bg-yellow-500 mr-2 flex-shrink-0"
                        title="Not loaded - double-click to load"
                      />
                    )}
                    <span className="mr-2 flex-shrink-0">{getFileIcon(file)}</span>
                    <div className="flex-1 min-w-0">
                      <span className="truncate block text-sm">{file.name}</span>
                      <span className="text-xs text-app-gray block truncate">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {isLoading && (
                      <Loader className="animate-spin text-primary" size={16} />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, file, e.currentTarget);
                      }}
                      className="p-1 rounded-full hover:bg-app-gray-dark text-app-icon-color flex-shrink-0 transition-colors"
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex-shrink-0 mt-2 pt-2 border-t border-app-border text-xs text-app-gray text-center">
            Double-click to load • Drag to timeline
          </div>
        </>
      )}
    </div>
  );
};