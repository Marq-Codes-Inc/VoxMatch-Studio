import React, { useEffect, useState } from 'react';
import {
  Plus,
  FolderOpen,
  Settings,
  Info,
  HelpCircle,
  LayoutGrid,
  List,
  Film,
  Music,
} from 'lucide-react';
import { VoxMatchProject, AppSettings } from './types/types';
import { Modal } from './components/ui/Modal';
import { NewProjectModalContent } from './components/modals/NewProjectModal';
import { SettingsModalContent } from './components/modals/SettingsModalContent';
import { AboutModalContent } from './components/modals/AboutModalContent';
import { HelpModalContent } from './components/modals/HelpModalContent';
import { ProjectCard } from './components/projects/ProjectCard';
import { ProjectRow } from './components/projects/ProjectRow';

interface HomeScreenProps {
  projects: VoxMatchProject[];
  onCreateProject: (name: string, mode: 'subtitles' | 'lyrics') => void;
  onOpenProject: (projectId: string) => void;
  onOpenProjectFile: () => void;
  onDeleteProject: (projectId: string) => void;
  settings?: AppSettings;
  handleSettingChange?: (name: string, value: string | boolean | number | any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  onOpenProjectFile,
  onDeleteProject,
  settings = {
    theme: 'dark',
    primaryColor: '#046466',
    autoSave: false,
    defaultReadingSpeed: 'normal',
    timing: {
      baseDurationPerChar: 0.08,
      minClipDuration: 1.0,
      maxClipDuration: 5.0,
      pauseBetweenClips: 0.2,
    },
  } as AppSettings,
  handleSettingChange = (name, value) => console.log('Setting changed:', name, value),
}) => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [settingsActiveSection, setSettingsActiveSection] = useState('general');
  const [helpActiveSection, setHelpActiveSection] = useState('quick-start');
  const [helpAccordion, setHelpAccordion] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-system');
    if (settings.theme === 'system') {
      root.classList.add('theme-system');
    } else if (settings.theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.add('theme-dark');
    }
  }, [settings.theme]);

  const toggleHelpAccordion = (section: string) => {
    setHelpAccordion((prev) => (prev === section ? null : section));
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalProjects = projects.length;
  const videoCount = projects.reduce((count, p) => count + p.mediaFiles.filter(f => f.type.startsWith('video')).length, 0);
  const audioCount = projects.reduce((count, p) => count + p.mediaFiles.filter(f => f.type.startsWith('audio')).length, 0);

  return (
    <div className="h-screen flex flex-col bg-app-bg overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-app-surface border-b border-app-border px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="assets/VoxMatch-logo.png"
              alt="VoxMatch Studio"
              className="w-40"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowSettingsModal(true)} className="p-2.5 rounded-md hover:bg-app-gray-light text-app-icon-color transition-colors" title="Settings">
              <Settings size={20} />
            </button>
            <button onClick={() => setShowHelpModal(true)} className="p-2.5 rounded-md hover:bg-app-gray-light text-app-icon-color transition-colors" title="Help">
              <HelpCircle size={20} />
            </button>
            <button onClick={() => setShowAboutModal(true)} className="p-2.5 rounded-md hover:bg-app-gray-light text-app-icon-color transition-colors" title="About">
              <Info size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="max-w-7xl mx-auto px-8 py-8 w-full flex flex-col h-full">
          <div className="flex-shrink-0">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-app-text mb-2">Projects</h1>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
                >
                  <Plus size={18} />
                  New Project
                </button>
                <button
                  onClick={onOpenProjectFile}
                  className="px-5 py-2.5 bg-app-gray-light text-app-text rounded-lg hover:bg-app-gray flex items-center gap-2 border border-app-border transition-colors"
                >
                  <FolderOpen size={18} />
                  Open Project
                </button>
              </div>

              <div className="flex items-center gap-1 bg-app-gray-dark rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-white' : 'text-app-icon-color hover:bg-app-gray-light'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-white' : 'text-app-icon-color hover:bg-app-gray-light'
                  }`}
                  title="List View"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {projects.length > 0 ? (
            <>
              <div className="flex-shrink-0 flex items-center gap-6 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <Film size={14} className="text-blue-400" />
                  <span className="text-app-gray">{videoCount} Videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Music size={14} className="text-green-400" />
                  <span className="text-app-gray">{audioCount} Audio</span>
                </div>
                <div className="text-app-gray text-sm">{totalProjects} Total</div>
              </div>

              <div
                className="flex-1 overflow-y-auto pr-2 min-h-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                    {projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onOpen={onOpenProject}
                        onDelete={onDeleteProject}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pb-4">
                    {projects.map((project) => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        onOpen={onOpenProject}
                        onDelete={onDeleteProject}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-app-surface border border-app-border rounded-2xl p-16 text-center">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FolderOpen size={32} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-app-text mb-2">Your studio is empty!</h3>
              <p className="text-app-gray mb-6">Hit the New Project button to start.</p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover inline-flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
              >
                <Plus size={18} />
                Create Your First Project
              </button>
            </div>
          )}

          <div className="flex-shrink-0 mt-6 pt-6 border-t border-app-border text-center">
            <p className="text-app-gray text-sm">VoxMatch Studio &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </main>

      {/* Modals using reusable Modal component */}
      <Modal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        title="Create New Project"
        size="lg"
      >
        <NewProjectModalContent
          onClose={() => setShowNewProjectModal(false)}
          onCreate={(name, mode) => {
            onCreateProject(name, mode);
            setShowNewProjectModal(false);
          }}
        />
      </Modal>

      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Settings"
        size="xl"
      >
        <SettingsModalWithSections
          settings={settings}
          handleSettingChange={handleSettingChange}
          activeSection={settingsActiveSection}
          onSectionChange={setSettingsActiveSection}
        />
      </Modal>

      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Help"
        size="xl"   // larger for Help
      >
        <HelpModalWithSections
          activeSection={helpActiveSection}
          onSectionChange={setHelpActiveSection}
          accordion={helpAccordion}
          onToggleAccordion={toggleHelpAccordion}
        />
      </Modal>

      <Modal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="About VoxMatch Studio"
        size="md"
      >
        <AboutModalContent />
      </Modal>
    </div>
  );
};

// Internal sub-components for modal navigation
const SettingsModalWithSections: React.FC<{
  settings: AppSettings;
  handleSettingChange: (name: string, value: any) => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}> = ({ settings, handleSettingChange, activeSection, onSectionChange }) => {
  const sections = [
    { id: 'general', label: 'General' },
    { id: 'audio-video', label: 'Audio/Video' },
    { id: 'lyrics-subtitles', label: 'Lyrics/Subtitles' },
    { id: 'shortcuts', label: 'Shortcuts' },
  ];

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-app-border p-3 space-y-1 flex-shrink-0">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              activeSection === section.id ? 'bg-primary text-white' : 'text-app-text hover:bg-app-gray-light'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <SettingsModalContent
          settings={settings}
          handleSettingChange={handleSettingChange}
          activeSection={activeSection}
        />
      </div>
    </div>
  );
};

const HelpModalWithSections: React.FC<{
  activeSection: string;
  onSectionChange: (section: string) => void;
  accordion: string | null;
  onToggleAccordion: (section: string) => void;
}> = ({ activeSection, onSectionChange, accordion, onToggleAccordion }) => {
  const sections = [
    { id: 'quick-start', label: 'Quick Start' },
    { id: 'tutorials', label: 'Tutorials' },
    { id: 'faq', label: 'FAQ' },
    { id: 'support', label: 'Support' },
  ];

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-app-border p-3 space-y-1 flex-shrink-0">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              activeSection === section.id ? 'bg-primary text-white' : 'text-app-text hover:bg-app-gray-light'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <HelpModalContent
          activeSection={activeSection}
          openAccordion={accordion}
          toggleAccordion={onToggleAccordion}
        />
      </div>
    </div>
  );
};

