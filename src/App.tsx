// src/App.tsx - Fixed version with proper state management
import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeScreen } from './HomeScreen';
import { ProjectEditor } from './ProjectEditor';
import { VoxMatchProject } from './types/types';
import { DEFAULT_SETTINGS, DEFAULT_STAGE_STYLE, DEFAULT_TEXT_STYLE, DEFAULT_LAYOUT } from './constants/defaults';
import { generateId } from './utils/utils';

// Utility for deep comparison of projects to prevent unnecessary updates
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

function App() {
  const [activeProject, setActiveProject] = useState<VoxMatchProject | null>(null);
  const [projects, setProjects] = useState<VoxMatchProject[]>([]);
  const [globalTheme, setGlobalTheme] = useState('dark');
  const [editorKey, setEditorKey] = useState(0);
  
  // Refs to prevent update loops
  const isUpdatingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProjectRef = useRef<VoxMatchProject | null>(null);

  // Update window title when project changes
  useEffect(() => {
    if (activeProject) {
      document.title = `VoxMatch Studio - ${activeProject.name}`;
    } else {
      document.title = 'VoxMatch Studio';
    }
  }, [activeProject]);

  // Load projects from localStorage on mount
  useEffect(() => {
    const loadProjects = () => {
      const loadedProjects: VoxMatchProject[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('voxmatch-project-')) {
          try {
            const project = JSON.parse(localStorage.getItem(key)!);
            // Ensure media files are properly initialized
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to save project to localStorage and update projects list
  const persistProject = useCallback((project: VoxMatchProject) => {
    try {
      // Save to localStorage
      localStorage.setItem(`voxmatch-project-${project.id}`, JSON.stringify(project));
      
      // Update projects list without causing loops
      setProjects(prev => {
        const exists = prev.some(p => p.id === project.id);
        if (!exists) {
          return [project, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return prev.map(p => p.id === project.id ? project : p)
          .sort((a, b) => b.updatedAt - a.updatedAt);
      });
      
      console.log(`✅ Project "${project.name}" saved to localStorage`);
    } catch (error) {
      console.error('Failed to persist project:', error);
    }
  }, []);

  const handleThemeChange = useCallback((theme: string) => {
    setGlobalTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const handleCreateProject = useCallback((name: string, mode: 'subtitles' | 'lyrics') => {
    const newProject: VoxMatchProject = {
      id: generateId(),
      name: name || `Project ${new Date().toLocaleDateString()}`,
      mode: mode,
      lyrics: [],
      subtitles: [],
      mediaFiles: [],
      activeFileId: null,
      markers: [],
      settings: DEFAULT_SETTINGS,
      stageStyle: DEFAULT_STAGE_STYLE,
      lyricTextStyle: DEFAULT_TEXT_STYLE,
      subtitleTextStyle: DEFAULT_TEXT_STYLE,
      layout: DEFAULT_LAYOUT, // Default horizontal layout
      zoom: 1,
      isSaved: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Save to localStorage immediately
    persistProject(newProject);
    
    setActiveProject(newProject);
    setEditorKey(prev => prev + 1);
  }, [persistProject]);

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
          
          // Save to localStorage
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
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
  }, [activeProject]);

  // Handle project updates from the editor - CRITICAL: Prevent update loops
  const handleProjectUpdate = useCallback((updatedProject: VoxMatchProject) => {
    // Prevent recursive updates
    if (isUpdatingRef.current) return;
    
    // Check if the project actually changed using our comparison function
    if (lastProjectRef.current && shallowCompareProjects(lastProjectRef.current, updatedProject)) {
      return;
    }
    
    isUpdatingRef.current = true;
    lastProjectRef.current = updatedProject;
    
    // Update active project
    setActiveProject(updatedProject);
    
    // Debounce the localStorage save and projects list update
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        // Save to localStorage
        localStorage.setItem(`voxmatch-project-${updatedProject.id}`, JSON.stringify(updatedProject));
        
        // Update projects list
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
    
    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    const updatedProject = {
      ...activeProject,
      updatedAt: Date.now(),
      isSaved: true
    };
    
    // Save to file if path exists
    if (updatedProject.projectFilePath && window.electronAPI) {
      try {
        await window.electronAPI.saveProject(updatedProject, updatedProject.projectFilePath);
        console.log(`✅ Project saved to file: ${updatedProject.projectFilePath}`);
      } catch (error) {
        console.error('Error saving to file:', error);
      }
    }
    
    // Always save to localStorage
    persistProject(updatedProject);
    
    setActiveProject(updatedProject);
    lastProjectRef.current = updatedProject;
  }, [activeProject, persistProject]);

  const handleSaveProjectAs = useCallback(async () => {
    if (!activeProject || !window.electronAPI) return;
    
    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    try {
      const filePath = await window.electronAPI.selectSaveLocation();
      if (filePath) {
        const updatedProject = {
          ...activeProject,
          projectFilePath: filePath,
          isSaved: true,
          updatedAt: Date.now()
        };
        
        await window.electronAPI.saveProject(updatedProject, filePath);
        console.log(`✅ Project saved to file: ${filePath}`);
        
        // Save to localStorage
        persistProject(updatedProject);
        
        setActiveProject(updatedProject);
        lastProjectRef.current = updatedProject;
      }
    } catch (error) {
      console.error('Error saving project as:', error);
    }
  }, [activeProject, persistProject]);

  const handleCloseProject = useCallback(() => {
    if (activeProject) {
      // Save final state before closing
      const updatedProject = {
        ...activeProject,
        updatedAt: Date.now()
      };
      persistProject(updatedProject);
      console.log(`✅ Project "${updatedProject.name}" saved on close`);
    }
    setActiveProject(null);
    lastProjectRef.current = null;
    
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [activeProject, persistProject]);

  if (!activeProject) {
    return (
      <HomeScreen
        projects={projects}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        onOpenProjectFile={handleOpenProjectFile}
        onDeleteProject={handleDeleteProject}
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
      currentTheme={globalTheme}
    />
  );
}

export default App;
