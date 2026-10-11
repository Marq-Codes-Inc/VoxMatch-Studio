// src/App.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeScreen } from './HomeScreen';
import { ProjectEditor } from './ProjectEditor';
import { VoxMatchProject, AppSettings } from './types/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STAGE_STYLE,
  DEFAULT_TEXT_STYLE,
  DEFAULT_LAYOUT,
} from './constants/defaults';
import { generateId } from './utils/utils';
import {
  serializeProject,
  deserializeProject,
  ensureVxmExtension,
  VXM_EXTENSION,
} from './utils/projectFile';

// Storage keys

const SETTINGS_KEY = 'voxmatch-settings';
const PROJECT_KEY_PREFIX = 'voxmatch-project-';

// Content-aware project comparison.
//
// IMPORTANT: `updatedAt` is deliberately EXCLUDED from this comparison.
// The parent (App) bumps `updatedAt` only after the guard trips — this
// prevents an infinite save loop where the sync effect in ProjectEditor
// produces a "new" project object on every render.
export function shallowCompareProjects(
  a: VoxMatchProject,
  b: VoxMatchProject,
): boolean {
  if (a === b) return true;

  if (
    a.id !== b.id ||
    a.name !== b.name ||
    a.isSaved !== b.isSaved ||
    a.zoom !== b.zoom ||
    a.activeFileId !== b.activeFileId ||
    a.mode !== b.mode ||
    a.projectFilePath !== b.projectFilePath
  ) {
    return false;
  }

  if (
    a.lyrics.length !== b.lyrics.length ||
    a.subtitles.length !== b.subtitles.length ||
    a.mediaFiles.length !== b.mediaFiles.length ||
    a.markers.length !== b.markers.length
  ) {
    return false;
  }

  if (!clipsEqual(a.lyrics, b.lyrics)) return false;
  if (!clipsEqual(a.subtitles, b.subtitles)) return false;

  for (let i = 0; i < a.mediaFiles.length; i++) {
    const x = a.mediaFiles[i];
    const y = b.mediaFiles[i];
    if (
      x.id !== y.id ||
      x.loaded !== y.loaded ||
      x.name !== y.name ||
      x.path !== y.path
    ) {
      return false;
    }
  }

  return true;
}

function clipsEqual(
  a: { id: string; text: string; startTime: number; endTime: number }[],
  b: { id: string; text: string; startTime: number; endTime: number }[],
): boolean {
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.text !== y.text ||
      x.startTime !== y.startTime ||
      x.endTime !== y.endTime
    ) {
      return false;
    }
  }
  return true;
}

// Settings load

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
};

// Component

function App() {
  const [activeProject, setActiveProject] = useState<VoxMatchProject | null>(
    null,
  );
  const [projects, setProjects] = useState<VoxMatchProject[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings);

  const isUpdatingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProjectRef = useRef<VoxMatchProject | null>(null);

  // Settings → localStorage + theme
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
    const theme = appSettings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (appSettings.primaryColor) {
      document.documentElement.style.setProperty(
        '--primary',
        appSettings.primaryColor,
      );
    }
  }, [appSettings]);

  // Document title
  useEffect(() => {
    document.title = activeProject
      ? `VoxMatch Studio - ${activeProject.name}`
      : 'VoxMatch Studio';
  }, [activeProject]);

  // Load projects from localStorage
  useEffect(() => {
    const loaded: VoxMatchProject[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PROJECT_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key)!;
          const project = deserializeProject(raw);
          loaded.push(project);
        } catch (e) {
          console.error('Failed to load project:', e);
        }
      }
    }
    loaded.sort((a, b) => b.updatedAt - a.updatedAt);
    setProjects(loaded);
  }, []);

  // Cleanup pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // Persist project to localStorage
  const persistProject = useCallback((project: VoxMatchProject) => {
    try {
      localStorage.setItem(
        `${PROJECT_KEY_PREFIX}${project.id}`,
        serializeProject(project),
      );
      setProjects(prev => {
        const exists = prev.some(p => p.id === project.id);
        const next = exists
          ? prev.map(p => (p.id === project.id ? project : p))
          : [project, ...prev];
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
      });
      console.log(`✅ Project "${project.name}" saved`);
    } catch (error) {
      console.error('Failed to persist project:', error);
    }
  }, []);

  // Handle .vxm open requests from Electron
  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const unsubscribe = window.electronAPI.on(
      'app:openProjectFile',
      async (filePath: string) => {
        console.log(`📂 Received open request: ${filePath}`);
        try {
          const fileContent =
            await window.electronAPI!.loadProjectFile(filePath);
          if (!fileContent) return;

          const project = deserializeProject(fileContent);
          project.projectFilePath = filePath;
          project.isSaved = true;
          project.updatedAt = Date.now();

          persistProject(project);
          setActiveProject(project);
          setEditorKey(prev => prev + 1);
        } catch (error) {
          console.error('Failed to open .vxm from OS:', error);
          alert(
            `Failed to open project:\n${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      },
    );

    window.electronAPI.notifyAppReady();

    return unsubscribe;
  }, [persistProject]);

  // Settings handlers
  const handleSettingChange = useCallback((name: string, value: any) => {
    setAppSettings(prev => ({ ...prev, [name]: value } as AppSettings));
  }, []);

  const handleThemeChange = useCallback((theme: string) => {
    setAppSettings(prev => ({
      ...prev,
      theme: theme as AppSettings['theme'],
    }));
  }, []);

  // Create project
  const handleCreateProject = useCallback(
    (name: string, mode: 'subtitles' | 'lyrics') => {
      const newProject: VoxMatchProject = {
        id: generateId(),
        name: name || `Project ${new Date().toLocaleDateString()}`,
        mode,
        lyrics: [],
        subtitles: [],
        mediaFiles: [],
        activeFileId: null,
        markers: [],
        settings: appSettings,
        stageStyle: DEFAULT_STAGE_STYLE,
        lyricTextStyle: DEFAULT_TEXT_STYLE,
        subtitleTextStyle: DEFAULT_TEXT_STYLE,
        layout: DEFAULT_LAYOUT,
        zoom: 1,
        isSaved: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      persistProject(newProject);
      setActiveProject(newProject);
      setEditorKey(prev => prev + 1);
    },
    [persistProject, appSettings],
  );

  // Open project from localStorage
  const handleOpenProject = useCallback((projectId: string) => {
    try {
      const stored = localStorage.getItem(`${PROJECT_KEY_PREFIX}${projectId}`);
      if (stored) {
        const project = deserializeProject(stored);
        setActiveProject(project);
        setEditorKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error opening project:', error);
    }
  }, []);

  // Open project from .vxm file (via dialog)
  const handleOpenProjectFile = useCallback(async () => {
    if (!window.electronAPI) {
      console.warn('Electron API not available — cannot open .vxm files.');
      return;
    }
    try {
      const result = await window.electronAPI.openFile({
        properties: ['openFile'],
        filters: [
          { name: 'VoxMatch Project', extensions: [VXM_EXTENSION] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled || !result.filePaths?.[0]) return;

      const filePath = result.filePaths[0];
      const fileContent = await window.electronAPI.loadProjectFile(filePath);
      if (!fileContent) return;

      const project = deserializeProject(fileContent);
      project.projectFilePath = filePath;
      project.isSaved = true;
      project.updatedAt = Date.now();

      persistProject(project);
      setActiveProject(project);
      setEditorKey(prev => prev + 1);
      console.log(`📂 Opened project from ${filePath}`);
    } catch (error) {
      console.error('Error opening project file:', error);
      alert(
        `Failed to open project:\n${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }, [persistProject]);

  // Delete project
  const handleDeleteProject = useCallback(
    (projectId: string) => {
      localStorage.removeItem(`${PROJECT_KEY_PREFIX}${projectId}`);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (activeProject?.id === projectId) setActiveProject(null);
    },
    [activeProject],
  );

  // Project updates from editor
  //
  // The parent is the source of truth for `updatedAt`. We bump it here,
  // ONLY when content actually changed (per shallowCompareProjects), so
  // the caller's sync effect can pass the same content back without
  // creating a feedback loop.
  const handleProjectUpdate = useCallback(
    (updatedProject: VoxMatchProject) => {
      if (isUpdatingRef.current) return;

      if (
        lastProjectRef.current &&
        shallowCompareProjects(lastProjectRef.current, updatedProject)
      ) {
        return;
      }

      const stampedProject: VoxMatchProject = {
        ...updatedProject,
        updatedAt: Date.now(),
      };

      isUpdatingRef.current = true;
      lastProjectRef.current = stampedProject;
      setActiveProject(stampedProject);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            `${PROJECT_KEY_PREFIX}${stampedProject.id}`,
            serializeProject(stampedProject),
          );
          setProjects(prev =>
            prev
              .map(p => (p.id === stampedProject.id ? stampedProject : p))
              .sort((a, b) => b.updatedAt - a.updatedAt),
          );
        } finally {
          isUpdatingRef.current = false;
          saveTimeoutRef.current = null;
        }
      }, 500);
    },
    [],
  );

  // Save As → always prompts for a .vxm path
  const handleSaveProjectAs = useCallback(async () => {
    if (!activeProject) return;
    if (!window.electronAPI) {
      console.warn('Save As requires Electron.');
      return;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    try {
      const selected = await window.electronAPI.selectSaveLocation({
        title: 'Save Project As',
        defaultPath: `${activeProject.name}.${VXM_EXTENSION}`,
        filters: [
          { name: 'VoxMatch Project', extensions: [VXM_EXTENSION] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (!selected) return;

      const filePath = ensureVxmExtension(selected);
      const updatedProject: VoxMatchProject = {
        ...activeProject,
        projectFilePath: filePath,
        isSaved: true,
        updatedAt: Date.now(),
      };

      // Strip File/Blob/URL handles before IPC — they're not cloneable
      const ipcPayload = JSON.parse(serializeProject(updatedProject));

      await window.electronAPI.saveProject(ipcPayload, filePath);

      persistProject(updatedProject);
      setActiveProject(updatedProject);
      lastProjectRef.current = updatedProject;
      console.log(`✅ Saved As ${filePath}`);
    } catch (error) {
      console.error('Error saving project as:', error);
      alert(
        `Failed to save project:\n${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }, [activeProject, persistProject]);

  // Explicit save
  const handleSaveProject = useCallback(async () => {
    if (!activeProject) return;

    const existingPath = activeProject.projectFilePath;

    if (!existingPath || !window.electronAPI) {
      await handleSaveProjectAs();
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const updatedProject: VoxMatchProject = {
      ...activeProject,
      updatedAt: Date.now(),
      isSaved: true,
    };

    try {
      const ipcPayload = JSON.parse(serializeProject(updatedProject));

      await window.electronAPI.saveProject(ipcPayload, existingPath);
      console.log(`✅ Saved to ${existingPath}`);

      persistProject(updatedProject);
      setActiveProject(updatedProject);
      lastProjectRef.current = updatedProject;
    } catch (error) {
      console.error('Error saving to file:', error);
      alert(
        `Failed to save project:\n${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }, [activeProject, persistProject, handleSaveProjectAs]);

  // Close project
  const handleCloseProject = useCallback(() => {
    if (activeProject) {
      const updatedProject = { ...activeProject, updatedAt: Date.now() };
      persistProject(updatedProject);
    }
    setActiveProject(null);
    lastProjectRef.current = null;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [activeProject, persistProject]);

  // Render
  if (!activeProject) {
    return (
      <HomeScreen
        projects={projects}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        onOpenProjectFile={handleOpenProjectFile}
        onDeleteProject={handleDeleteProject}
        settings={appSettings}
        handleSettingChange={handleSettingChange}
      />
    );
  }

  return (
    <ProjectEditor
      key={`${activeProject.id}-${editorKey}`}
      project={activeProject}
      onProjectUpdate={handleProjectUpdate}
      onSaveProject={handleSaveProject}
      onSaveProjectAs={handleSaveProjectAs}
      onCloseProject={handleCloseProject}
      onThemeChange={handleThemeChange}
      currentTheme={appSettings.theme || 'dark'}
    />
  );
}

export default App;