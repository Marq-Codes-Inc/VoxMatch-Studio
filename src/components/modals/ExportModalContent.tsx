// src/components/modals/ExportModalContent.tsx (Fix imports)
import React, { useState } from 'react';
import { AppSettings, ImportedMediaFile, VoxMatchProject } from '../../types/types';

interface ExportModalContentProps {
  settings: AppSettings;
  handleSettingChange: (name: string, value: string | boolean | number | any) => void;
  selectSaveLocation: () => Promise<string | null>;
  file: ImportedMediaFile | null;
  project: VoxMatchProject;
  onClose: () => void;
}

export const ExportModalContent: React.FC<ExportModalContentProps> = ({
  file,
  project,
  onClose
}) => {
  const [exportFormat, setExportFormat] = useState('mp4');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!file) {
      alert('No media file loaded');
      return;
    }

    setIsExporting(true);
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Export completed successfully!');
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <label className="text-sm font-medium block mb-2">Export Format</label>
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
          className="w-full bg-app-input-bg border border-app-border rounded-md px-3 py-2"
        >
          <option value="mp4">MP4 (Video + Subtitles)</option>
          <option value="webm">WebM (Video + Subtitles)</option>
          <option value="srt">SRT (Subtitles only)</option>
          <option value="ass">ASS/SSA (Subtitles only)</option>
          <option value="lrc">LRC (Lyrics only)</option>
        </select>
      </div>

      <div className="bg-app-gray-light p-3 rounded-md">
        <p className="text-sm font-medium">Export Summary</p>
        <p className="text-xs text-app-gray mt-1">
          Media: {file?.name || 'No file'}<br />
          Mode: {project.mode === 'lyrics' ? 'Lyrics' : 'Subtitles'}<br />
          Clips: {project.mode === 'lyrics' ? project.lyrics.length : project.subtitles.length}
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-app-gray-light rounded-md hover:bg-app-gray"
        >
          Cancel
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting || !file}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  );
};