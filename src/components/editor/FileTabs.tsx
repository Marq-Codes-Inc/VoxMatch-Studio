// src/components/editor/FileTabs.tsx
import React from 'react';
import { Film, Music, Loader2 } from 'lucide-react';
import { useProjectEditor } from '../../contexts/ProjectEditorContext';

export const FileTabs: React.FC = () => {
  const { importedFiles, activeFileId, switchActiveFile, loadingFileId } =
    useProjectEditor();

  if (importedFiles.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto lyrics-list-scrollbar w-full py-0.5"
      style={{ scrollbarWidth: 'thin' }}
    >
      {importedFiles.map((file) => {
        const isActive = file.id === activeFileId;
        const isLoading = loadingFileId === file.id;
        const isVideo = file.type.startsWith('video');
        return (
          <button
            key={file.id}
            onClick={() => !isLoading && switchActiveFile(file.id)}
            disabled={isLoading}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-app-gray-dark text-app-text hover:bg-app-gray-light'
            } ${isLoading ? 'opacity-60' : ''}`}
            title={file.name}
          >
            {isLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isVideo ? (
              <Film size={13} className={isActive ? 'text-white' : 'text-blue-400'} />
            ) : (
              <Music size={13} className={isActive ? 'text-white' : 'text-green-400'} />
            )}
            <span className="max-w-[220px] truncate">{file.name}</span>
          </button>
        );
      })}
    </div>
  );
};

