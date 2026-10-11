// src/components/editor/TopBar.tsx
import React from 'react';
import { Settings, Info, HelpCircle, Download, Save } from 'lucide-react';

interface TopBarProps {
  isProjectSaved: boolean;
  isVerticalLayout: boolean;
  onToggleLayout: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onOpenPreferences: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
  onCloseProject: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isProjectSaved,
  isVerticalLayout,
  onToggleLayout,
  onSave,
  onSaveAs,
  onExport,
  onOpenPreferences,
  onOpenHelp,
  onOpenAbout,
  onCloseProject,
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 h-14 bg-app-surface shadow-md flex items-center justify-between px-4 z-20 border-b border-app-border">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={onCloseProject}
      >
        <img
          src="assets/VoxMatch-logo.png"
          alt="VoxMatch Logo"
          className="w-40"
          onError={e => {
            e.currentTarget.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'flex items-center gap-3';
            fallback.innerHTML = `
              <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">V</span>
              </div>
              <span class="text-white font-semibold">VoxMatch Studio</span>
            `;
            e.currentTarget.parentElement?.appendChild(fallback);
          }}
        />
      </div>

      <div className="flex items-center space-x-2">
        {!isProjectSaved && (
          <span className="text-xs text-yellow-500 bg-orange-800 px-2 py-1 rounded font-medium">
            Unsaved
          </span>
        )}

        <button
          onClick={onToggleLayout}
          className="p-2 rounded-md hover:bg-app-gray-light text-app-icon-color"
          title={
            isVerticalLayout
              ? 'Switch to Horizontal Layout'
              : 'Switch to Vertical Layout'
          }
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {isVerticalLayout ? (
              <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
            ) : (
              <rect x="6" y="3" width="12" height="18" rx="2" ry="2" />
            )}
          </svg>
        </button>

        <button
          onClick={onOpenPreferences}
          className="p-2 rounded-md hover:bg-app-gray-light text-app-icon-color"
          title="Preferences"
        >
          <Settings size={20} />
        </button>

        <button
          onClick={onOpenHelp}
          className="p-2 rounded-md hover:bg-app-gray-light text-app-icon-color"
          title="Help"
        >
          <HelpCircle size={20} />
        </button>

        <button
          onClick={onOpenAbout}
          className="p-2 rounded-md hover:bg-app-gray-light text-app-icon-color"
          title="About"
        >
          <Info size={20} />
        </button>

        <button
          onClick={onSave}
          className={`p-2 rounded-md hover:bg-app-gray-light text-app-icon-color ${
            isProjectSaved ? 'opacity-50 cursor-default' : ''
          }`}
          title="Save Project (Ctrl+S)"
          disabled={isProjectSaved}
        >
          <Save size={20} />
        </button>

        <button
          onClick={onSaveAs}
          className="p-2 rounded-md hover:bg-app-gray-light text-app-icon-color"
          title="Save Project As (Ctrl+Shift+S)"
        >
          Save As
        </button>

        <button
          onClick={onExport}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover flex items-center text-sm"
          title="Export Project"
        >
          <Download className="mr-2" size={18} /> Export
        </button>
      </div>
    </div>
  );
};