import React, { useState } from 'react';
import { Type, Mic, Plus } from 'lucide-react';

interface NewProjectModalContentProps {
  onClose: () => void;
  onCreate: (name: string, mode: 'subtitles' | 'lyrics') => void;
}

export const NewProjectModalContent: React.FC<NewProjectModalContentProps> = ({
  onClose,
  onCreate,
}) => {
  const [projectName, setProjectName] = useState('');
  const [mode, setMode] = useState<'subtitles' | 'lyrics'>('subtitles');

  const handleCreate = () => {
    const finalName = projectName.trim() || `Project ${new Date().toLocaleDateString()}`;
    onCreate(finalName, mode);
    setProjectName('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="p-8 space-y-7">
      <div>
        <label className="block text-sm font-medium text-app-text mb-2.5">Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="My Awesome Project"
          className="w-full px-5 py-3.5 bg-app-input-bg border border-app-border rounded-xl text-app-text text-base placeholder:text-app-gray/50 focus:border-primary outline-none transition-colors"
          autoFocus
        />
        <p className="text-xs text-app-gray mt-2">
          {projectName.trim()
            ? `Will be saved as "${projectName.trim()}"`
            : 'Leave blank for auto-generated name'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-app-text mb-3.5">Project Type</label>
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setMode('subtitles')}
            className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
              mode === 'subtitles'
                ? 'border-primary bg-primary/10'
                : 'border-app-border bg-app-gray-light/30 hover:border-app-border-light hover:bg-app-gray-light/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                mode === 'subtitles' ? 'bg-primary text-white' : 'bg-app-gray-dark text-app-gray'
              }`}>
                <Type size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-app-text text-lg mb-2">Subtitles</h3>
                <p className="text-sm text-app-gray leading-relaxed">
                  Create and edit subtitles for videos with precise timing control
                </p>
              </div>
            </div>
            {mode === 'subtitles' && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              </div>
            )}
          </div>

          <div
            onClick={() => setMode('lyrics')}
            className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
              mode === 'lyrics'
                ? 'border-primary bg-primary/10'
                : 'border-app-border bg-app-gray-light/30 hover:border-app-border-light hover:bg-app-gray-light/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                mode === 'lyrics' ? 'bg-primary text-white' : 'bg-app-gray-dark text-app-gray'
              }`}>
                <Mic size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-app-text text-lg mb-2">Lyrics</h3>
                <p className="text-sm text-app-gray leading-relaxed">
                  Sync lyrics with audio tracks for karaoke-style projects
                </p>
              </div>
            </div>
            {mode === 'lyrics' && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-app-gray mt-4 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-app-gray" />
          {mode === 'subtitles'
            ? 'Subtitles mode opens with the subtitles panel active'
            : 'Lyrics mode opens with the lyrics panel active'}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-5 bg-app-gray-dark/30 border-t border-app-border -mx-8 px-8 pb-8">
        <button
          onClick={onClose}
          className="px-6 py-3 text-app-text-secondary hover:text-app-text rounded-xl transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          className="px-7 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />  {/* we'll need to import Plus, or pass it as prop – let's import */}
          Create Project
        </button>
      </div>
    </div>
  );
};
