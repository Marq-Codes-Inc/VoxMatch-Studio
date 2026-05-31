// src/components/modals/FileInfoModalContent.tsx
import React from 'react';
import { ImportedMediaFile } from '../../types/types';
import { formatTime } from '../../utils/utils';

interface FileInfoModalContentProps {
  file: ImportedMediaFile | null;
}

export const FileInfoModalContent: React.FC<FileInfoModalContentProps> = ({ file }) => {
  if (!file) return null;

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-app-gray">Name</label>
          <p className="text-sm font-medium">{file.name}</p>
        </div>
        <div>
          <label className="text-xs text-app-gray">Type</label>
          <p className="text-sm font-medium">{file.type}</p>
        </div>
        <div>
          <label className="text-xs text-app-gray">Size</label>
          <p className="text-sm font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <div>
          <label className="text-xs text-app-gray">Path</label>
          <p className="text-sm font-medium truncate">{file.path}</p>
        </div>
        {file.duration && (
          <div>
            <label className="text-xs text-app-gray">Duration</label>
            <p className="text-sm font-medium">{formatTime(file.duration)}</p>
          </div>
        )}
      </div>
    </div>
  );
};
