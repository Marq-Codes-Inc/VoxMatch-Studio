// src/App.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeScreen } from './HomeScreen';
import { ProjectEditor } from './ProjectEditor';
import { VoxMatchProject, AppSettings, FileTrack } from './types/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_LAYOUT,
  DEFAULT_TRACK_KEY,
  makeDefaultTrack,
} from './constants/defaults';
import { generateId } from './utils/utils';
import {
  serializeProject,
  deserializeProject,
  ensureVxmExtension,
  VXM_EXTENSION,
} from './utils/projectFile';
import { invalidateProjectSnapshot } from './utils/projectSnapshot';

const SETTINGS_KEY = 'voxmatch-settings';
const PROJECT_KEY_PREFIX = 'voxmatch-project-';

export function shallowCompareProjects(
  a: VoxMatchProject,
  b: VoxMatchProject,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  if (
    a.id !== b.id ||
    a.name !== b.name ||
    a.isSaved !== b.isSaved ||
    a.activeFileId !== b.activeFileId ||
    a.mode !== b.mode ||
    a.projectFilePath !== b.projectFilePath ||
    a.settings?.theme !== b.settings?.theme ||
    a.settings?.primaryColor !== b.settings?.primaryColor
  ) {
    return false;
  }

  const aFiles = a.mediaFiles ?? [];
  const bFiles = b.mediaFiles ?? [];
  if (aFiles.length !== bFiles.length) return false;
  for (let i = 0; i < aFiles.length; i++) {
    const x = aFiles[i];
    const y = bFiles[i];
    if (
      x.id !== y.id ||
      x.loaded !== y.loaded ||
      x.name !== y.name ||
      x.path !== y.path ||
      x.posterDataUrl !== y.posterDataUrl
    ) {
      return false;
    }
  }

  const aLegacy = a as any;
  const bLegacy = b as any;

  if (
    Array.isArray(aLegacy.lyrics) ||
    Array.isArray(bLegacy.lyrics) ||
    Array.isArray(aLegacy.subtitles) ||
    Array.isArray(bLegacy.subtitles)
  ) {
    if (!clipsEqual(aLegacy.lyrics ?? [], bLegacy.lyrics ?? [])) return false;
    if (!clipsEqual(aLegacy.subtitles ?? [], bLegacy.subtitles ?? [])) return false;
  }

  if (typeof aLegacy.zoom === 'number' || typeof bLegacy.zoom === 'number') {
    if ((aLegacy.zoom ?? 1) !== (bLegacy.zoom ?? 1)) return false;
  }

  if (Array.isArray(aLegacy.markers) || Array.isArray(bLegacy.markers)) {
    const am = aLegacy.markers ?? [];
    const bm = bLegacy.markers ?? [];
    if (am.length !== bm.length) return false;
    for (let i = 0; i < am.length; i++) {
      if (
        am[i].id !== bm[i].id ||
        am[i].time !== bm[i].time ||
        am[i].label !== bm[i].label
      ) {
        return false;
      }
    }
  }

  const aTracks = a.tracks ?? {};
  const bTracks = b.tracks ?? {};
  const aKeys = Object.keys(aTracks).sort();
  const bKeys = Object.keys(bTracks).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
  }

  for (const k of aKeys) {
    if (!trackEqual(aTracks[k], bTracks[k])) return false;
  }

  return true;
}

function clipsEqual(
  a: { id: string; text: string; startTime: number; endTime: number }[],
  b: { id: string; text: string; startTime: number; endTime: number }[],
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
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

function trackEqual(a: FileTrack | undefined, b: FileTrack | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if ((a.zoom ?? 1) !== (b.zoom ?? 1)) return false;
  if ((a.mode ?? 'subtitles') !== (b.mode ?? 'subtitles')) return false;
  if (!clipsEqual(a.lyrics ?? [], b.lyrics ?? [])) return false;
  if (!clipsEqual(a.subtitles ?? [], b.subtitles ?? [])) return false;
  if ((a.markers?.length ?? 0) !== (b.markers?.length ?? 0)) return false;
  if (JSON.stringify(a.stageStyle) !== JSON.stringify(b.stageStyle)) return false;
  if (JSON.stringify(a.lyricTextStyle) !== JSON.stringify(b.lyricTextStyle)) return false;
  if (JSON.stringify(a.subtitleTextStyle) !== JSON.stringify(b.subtitleTextStyle))
    return false;
  return true;
}

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

function basenameWithoutExtension(filePath: string): string {
  const norm = filePath.replace(/\\/g, '/');
  const file = norm.split('/').pop() ?? '';
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
}

function resolveTheme(theme: AppSettings['theme']): 'light' | 'dark' {
  if (theme !== 'system') return theme || 'dark';
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDom(theme: AppSettings['theme'], primaryColor?: string) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolveTheme(theme));
  if (primaryColor) {
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-hover', `${primaryColor}E6`);
  }
}

function App() {
  const [activeProject, setActiveProject] = useState<VoxMatchProject | null>(null);
  const [projects, setProjects] = useState<VoxMatchProject[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings);

  const isUpdatingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProjectRef = useRef<VoxMatchProject | null>(null);
  const activeProjectRef = useRef<VoxMatchProject | null>(null);

  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
    if (!activeProject) {
      applyThemeToDom(appSettings.theme, appSettings.primaryColor);
    }
  }, [appSettings, activeProject]);

  useEffect(() => {
    if (appSettings.theme !== 'system' || activeProject) return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () =>
      applyThemeToDom('system', appSettings.primaryColor);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [appSettings.theme, appSettings.primaryColor, activeProject]);

  useEffect(() => {
    document.title = activeProject
      ? `VoxMatch Studio - ${activeProject.name}`
      : 'VoxMatch Studio';
  }, [activeProject]);

  useEffect(() => {
    const loaded: VoxMatchProject[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PROJECT_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key)!;
          loaded.push(deserializeProject(raw));
        } catch (e) {
          console.error('Failed to load project:', e);
        }
      }
    }
    loaded.sort((a, b) => b.updatedAt - a.updatedAt);
    setProjects(loaded);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  const persistProject = useCallback((project: VoxMatchProject) => {
    try {
      localStorage.setItem(
        `${PROJECT_KEY_PREFIX}${project.id}`,
        serializeProject(project),
      );
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === project.id);
        const next = exists
          ? prev.map((p) => (p.id === project.id ? project : p))
          : [project, ...prev];
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
      });
    } catch (error) {
      console.error('Failed to persist project:', error);
    }
  }, []);

  const loadProjectFromPath = useCallback(
    async (filePath: string) => {
      const fileContent = await window.electronAPI!.loadProjectFile(filePath);
      if (!fileContent) return;
      const project = deserializeProject(fileContent);
      project.projectFilePath = filePath;
      project.isSaved = true;
      project.updatedAt = Date.now();

      persistProject(project);
      lastProjectRef.current = project;
      setActiveProject(project);
      setEditorKey((prev) => prev + 1);
    },
    [persistProject],
  );

  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const unsubscribe = window.electronAPI.on(
      'app:openProjectFile',
      async (filePath: string) => {
        try {
          await loadProjectFromPath(filePath);
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
  }, [loadProjectFromPath]);

  const handleSettingChange = useCallback((name: string, value: any) => {
    setAppSettings((prev) => ({ ...prev, [name]: value } as AppSettings));
  }, []);

  const handleThemeChange = useCallback((theme: string) => {
    setAppSettings((prev) => ({
      ...prev,
      theme: theme as AppSettings['theme'],
    }));
  }, []);

  const handleCreateProject = useCallback(
    (name: string, mode: 'subtitles' | 'lyrics') => {
      const track = makeDefaultTrack(mode);
      const newProject: VoxMatchProject = {
        id: generateId(),
        name: name || `Project ${new Date().toLocaleDateString()}`,
        mode,
        mediaFiles: [],
        activeFileId: null,
        settings: appSettings,
        layout: { ...DEFAULT_LAYOUT },
        isSaved: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),

        lyrics: track.lyrics,
        subtitles: track.subtitles,
        markers: track.markers,
        stageStyle: track.stageStyle,
        lyricTextStyle: track.lyricTextStyle,
        subtitleTextStyle: track.subtitleTextStyle,
        zoom: track.zoom,

        tracks: {
          [DEFAULT_TRACK_KEY]: track,
        },
      };
      persistProject(newProject);
      lastProjectRef.current = newProject;
      setActiveProject(newProject);
      setEditorKey((prev) => prev + 1);
    },
    [persistProject, appSettings],
  );

  const handleOpenProject = useCallback((projectId: string) => {
    try {
      const stored = localStorage.getItem(`${PROJECT_KEY_PREFIX}${projectId}`);
      if (stored) {
        const project = deserializeProject(stored);
        lastProjectRef.current = project;
        setActiveProject(project);
        setEditorKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error opening project:', error);
    }
  }, []);

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
      await loadProjectFromPath(result.filePaths[0]);
    } catch (error) {
      console.error('Error opening project file:', error);
      alert(
        `Failed to open project:\n${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }, [loadProjectFromPath]);

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      localStorage.removeItem(`${PROJECT_KEY_PREFIX}${projectId}`);
      invalidateProjectSnapshot(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProject?.id === projectId) {
        setActiveProject(null);
        lastProjectRef.current = null;
      }
    },
    [activeProject],
  );

  const handleProjectUpdate = useCallback((updatedProject: VoxMatchProject) => {
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

    setAppSettings((prev) => {
      const nextTheme = stampedProject.settings?.theme ?? prev.theme;
      const nextColor = stampedProject.settings?.primaryColor ?? prev.primaryColor;
      if (prev.theme === nextTheme && prev.primaryColor === nextColor) {
        return prev;
      }
      return { ...prev, theme: nextTheme, primaryColor: nextColor };
    });

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          `${PROJECT_KEY_PREFIX}${stampedProject.id}`,
          serializeProject(stampedProject),
        );
        setProjects((prev) =>
          prev
            .map((p) => (p.id === stampedProject.id ? stampedProject : p))
            .sort((a, b) => b.updatedAt - a.updatedAt),
        );
      } finally {
        isUpdatingRef.current = false;
        saveTimeoutRef.current = null;
      }
    }, 500);
  }, []);

  const handleSaveProjectAs = useCallback(async () => {
    const current = activeProjectRef.current;
    if (!current) return;
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
        defaultPath: `${current.name}.${VXM_EXTENSION}`,
        filters: [
          { name: 'VoxMatch Project', extensions: [VXM_EXTENSION] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (!selected) return;

      const filePath = ensureVxmExtension(selected);
      const newName = basenameWithoutExtension(filePath) || current.name;

      const updatedProject: VoxMatchProject = {
        ...current,
        name: newName,
        projectFilePath: filePath,
        isSaved: true,
        updatedAt: Date.now(),
      };

      const ipcPayload = JSON.parse(serializeProject(updatedProject));
      await window.electronAPI.saveProject(ipcPayload, filePath);

      persistProject(updatedProject);
      setActiveProject(updatedProject);
      lastProjectRef.current = updatedProject;
    } catch (error) {
      console.error('Error saving project as:', error);
      alert(
        `Failed to save project:\n${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }, [persistProject]);

  const handleSaveProject = useCallback(async () => {
    const current = activeProjectRef.current;
    if (!current) return;

    const existingPath = current.projectFilePath;
    if (!existingPath || !window.electronAPI) {
      await handleSaveProjectAs();
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const updatedProject: VoxMatchProject = {
      ...current,
      updatedAt: Date.now(),
      isSaved: true,
    };

    try {
      const ipcPayload = JSON.parse(serializeProject(updatedProject));
      await window.electronAPI.saveProject(ipcPayload, existingPath);

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
  }, [persistProject, handleSaveProjectAs]);

  const handleCloseProject = useCallback(() => {
    const current = activeProjectRef.current;
    if (current) {
      persistProject({ ...current, updatedAt: Date.now() });
    }
    setActiveProject(null);
    lastProjectRef.current = null;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [persistProject]);

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
