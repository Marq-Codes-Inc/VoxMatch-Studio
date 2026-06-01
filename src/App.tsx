// src/App.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeScreen } from './HomeScreen';
import { ProjectEditor } from './ProjectEditor';
import { VoxMatchProject, AppSettings } from './types/types';
import { DEFAULT_SETTINGS, DEFAULT_STAGE_STYLE, DEFAULT_TEXT_STYLE, DEFAULT_LAYOUT } from './constants/defaults';
import { generateId } from './utils/utils';

function shallowCompareProjects(a: VoxMatchProject, b: VoxMatchProject): boolean {
  if (a.id !== b.id) return false;
  if (a.updatedAt !== b.updatedAt) return false;
  if (a.name !== b.name) return false;
  if (a.isSaved !== b.isSaved) return false;
  if (a.zoom !== b.zoom) return false;
  if (a.activeFileId !== b.activeFileId) return false;
  if (a.lyrics.length !== b.lyrics.length) return false;
  if (a.subtitles.length !== b.subtitles.length) return false;
  if (a.mediaFiles.length !== b.mediaFiles.length) return false;
  if (a.markers.length !== b.markers.length) return false;
  return true;
}

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('voxmatch-settings');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_SETTINGS;
};

function App() {
  const [activeProject, setActiveProject] = useState<VoxMatchProject | null>(null);
  const [projects, setProjects] = useState<VoxMatchProject[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings);
  
  const isUpdatingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProjectRef = useRef<VoxMatchProject | null>(null);

  useEffect(() => {
    localStorage.setItem('voxmatch-settings', JSON.stringify(appSettings));
    const theme = appSettings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (appSettings.primaryColor) {
      document.documentElement.style.setProperty('--primary', appSettings.primaryColor);
    }
  }, [appSettings]);

  useEffect(() => {
    document.title = activeProject ? `VoxMatch Studio - ${activeProject.name}` : 'VoxMatch Studio';
  }, [activeProject]);

  useEffect(() => {
    const loadProjects = () => {
      const loadedProjects: VoxMatchProject[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('voxmatch-project-')) {
          try {
            const project = JSON.parse(localStorage.getItem(key)!);
            project.mediaFiles = project.mediaFiles.map((file: any) => ({
              ...file,
              url: null,
              loaded: false,
              file: undefined
            }));
            loadedProjects.push(project);
          } catch (e) {
            console.error('Failed to load project:', e);
          }
        }
      }
      loadedProjects.sort((a, b) => b.updatedAt - a.updatedAt);
      setProjects(loadedProjects);
    };
    loadProjects();
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const persistProject = useCallback((project: VoxMatchProject) => {
    try {
      localStorage.setItem(`voxmatch-project-${project.id}`, JSON.stringify(project));
      setProjects(prev => {
        const exists = prev.some(p => p.id === project.id);
        if (!exists) return [project, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
        return prev.map(p => p.id === project.id ? project : p).sort((a, b) => b.updatedAt - a.updatedAt);
      });
      console.log(`✅ Project "${project.name}" saved`);
    } catch (error) {
      console.error('Failed to persist project:', error);
    }
  }, []);

  // Fixed: matches HomeScreen expected signature
  const handleSettingChange = useCallback((name: string, value: any) => {
    setAppSettings(prev => ({ ...prev, [name]: value } as AppSettings));
  }, []);

  const handleThemeChange = useCallback((theme: string) => {
    setAppSettings(prev => ({ ...prev, theme: theme as AppSettings['theme'] }));
  }, []);

  const handleCreateProject = useCallback((name: string, mode: 'subtitles' | 'lyrics') => {
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
      updatedAt: Date.now()
    };
    persistProject(newProject);
    setActiveProject(newProject);
    setEditorKey(prev => prev + 1);
  }, [persistProject, appSettings]);

  const handleOpenProject = useCallback((projectId: string) => {
    try {
      const stored = localStorage.getItem(`voxmatch-project-${projectId}`);
      if (stored) {
        const project = JSON.parse(stored);
        project.mediaFiles = project.mediaFiles.map((file: any) => ({
          ...file,
          url: null,
          loaded: false,
          file: undefined
        }));
        setActiveProject(project);
        setEditorKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error opening project:', error);
    }
  }, []);

  const handleOpenProjectFile = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.openFile({
        properties: ['openFile'],
        filters: [{ name: 'VoxMatch Project', extensions: ['voxmatch'] }]
      });
      if (!result.canceled && result.filePaths?.[0]) {
        const filePath = result.filePaths[0];
        const fileContent = await window.electronAPI.loadProjectFile(filePath);
        if (fileContent) {
          const project = JSON.parse(fileContent);
          project.mediaFiles = project.mediaFiles.map((file: any) => ({
            ...file,
            url: null,
            loaded: false,
            file: undefined
          }));
          project.projectFilePath = filePath;
          project.isSaved = true;
          persistProject(project);
          setActiveProject(project);
          setEditorKey(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error opening project file:', error);
    }
  }, [persistProject]);

  const handleDeleteProject = useCallback((projectId: string) => {
    localStorage.removeItem(`voxmatch-project-${projectId}`);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProject?.id === projectId) setActiveProject(null);
  }, [activeProject]);

  const handleProjectUpdate = useCallback((updatedProject: VoxMatchProject) => {
    if (isUpdatingRef.current) return;
    if (lastProjectRef.current && shallowCompareProjects(lastProjectRef.current, updatedProject)) return;
    isUpdatingRef.current = true;
    lastProjectRef.current = updatedProject;
    setActiveProject(updatedProject);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`voxmatch-project-${updatedProject.id}`, JSON.stringify(updatedProject));
        setProjects(prev =>
          prev.map(p => p.id === updatedProject.id ? updatedProject : p)
            .sort((a, b) => b.updatedAt - a.updatedAt)
        );
        console.log(`✅ Project "${updatedProject.name}" auto-saved`);
      } finally {
        isUpdatingRef.current = false;
        saveTimeoutRef.current = null;
      }
    }, 500);
  }, []);

  const handleSaveProject = useCallback(async () => {
    if (!activeProject) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const updatedProject = { ...activeProject, updatedAt: Date.now(), isSaved: true };
    if (updatedProject.projectFilePath && window.electronAPI) {
      try {
        await window.electronAPI.saveProject(updatedProject, updatedProject.projectFilePath);
        console.log(`✅ Project saved to file: ${updatedProject.projectFilePath}`);
      } catch (error) { console.error('Error saving to file:', error); }
    }
    persistProject(updatedProject);
    setActiveProject(updatedProject);
    lastProjectRef.current = updatedProject;
  }, [activeProject, persistProject]);

  const handleSaveProjectAs = useCallback(async () => {
    if (!activeProject || !window.electronAPI) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    try {
      const filePath = await window.electronAPI.selectSaveLocation();
      if (filePath) {
        const updatedProject = { ...activeProject, projectFilePath: filePath, isSaved: true, updatedAt: Date.now() };
        await window.electronAPI.saveProject(updatedProject, filePath);
        persistProject(updatedProject);
        setActiveProject(updatedProject);
        lastProjectRef.current = updatedProject;
      }
    } catch (error) { console.error('Error saving project as:', error); }
  }, [activeProject, persistProject]);

  const handleCloseProject = useCallback(() => {
    if (activeProject) {
      const updatedProject = { ...activeProject, updatedAt: Date.now() };
      persistProject(updatedProject);
    }
    setActiveProject(null);
    lastProjectRef.current = null;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, [activeProject, persistProject]);

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
