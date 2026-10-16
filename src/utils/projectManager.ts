// src/utils/projectManager.ts
import { VoxMatchProject } from '../types/project';
import { createDefaultProject } from '../constants/defaults';
import { generateId } from './utils';

// Session state types
export type AppSessionState = 'home' | 'editor';

export interface AppSession {
  id: string;
  projectId: string;
  startTime: number;
  lastActive: number;
  autoSaveInterval: number;
}

export interface ProjectManagerState {
  currentSession: AppSession | null;
  activeProject: VoxMatchProject | null;
  recentProjects: VoxMatchProject[];
  appState: AppSessionState;
}

// Auto-save configuration
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_RECENT_PROJECTS = 10;

class ProjectManager {
  private state: ProjectManagerState = {
    currentSession: null,
    activeProject: null,
    recentProjects: [],
    appState: 'home',
  };

  private autoSaveTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: ProjectManagerState) => void> = new Set();

  constructor() {
    this.loadRecentProjects();
    this.setupAutoSave();
  }

  // Subscribe to state changes
  subscribe(listener: (state: ProjectManagerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Load recent projects from localStorage
  private loadRecentProjects(): void {
    try {
      const stored = localStorage.getItem('voxmatch-recent-projects');
      if (stored) {
        this.state.recentProjects = JSON.parse(stored).slice(0, MAX_RECENT_PROJECTS);
      }
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  }

  // Save recent projects to localStorage
  private saveRecentProjects(): void {
    try {
      localStorage.setItem('voxmatch-recent-projects', JSON.stringify(this.state.recentProjects));
    } catch (error) {
      console.error('Failed to save recent projects:', error);
    }
  }

  // Add project to recent list
  private addToRecentProjects(project: VoxMatchProject): void {
    this.state.recentProjects = [
      project,
      ...this.state.recentProjects.filter(p => p.id !== project.id)
    ].slice(0, MAX_RECENT_PROJECTS);
    this.saveRecentProjects();
  }

  // Create a new project
  createProject(name?: string): VoxMatchProject {
    return {
      id: generateId(),
      ...createDefaultProject(name),
      isSaved: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // Start a new session with a project
  startSession(project: VoxMatchProject): void {
    // End any existing session
    this.endSession();

    // Create new session
    const session: AppSession = {
      id: generateId(),
      projectId: project.id,
      startTime: Date.now(),
      lastActive: Date.now(),
      autoSaveInterval: AUTO_SAVE_INTERVAL,
    };

    this.state.currentSession = session;
    this.state.activeProject = { ...project };
    this.state.appState = 'editor';

    // Save project to localStorage for recovery
    this.saveProjectToStorage(project);

    // Add to recent projects
    this.addToRecentProjects(project);

    // Start auto-save
    this.startAutoSave();

    this.notifyListeners();
  }

  // Create and start a new project session
  createAndStartSession(name?: string): VoxMatchProject {
    const project = this.createProject(name);
    this.startSession(project);
    return project;
  }

  // Open an existing project
  openProject(projectId: string): boolean {
    const project = this.state.recentProjects.find(p => p.id === projectId);
    if (project) {
      this.startSession(project);
      return true;
    }

    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(`voxmatch-project-${projectId}`);
      if (stored) {
        const project = JSON.parse(stored);
        this.startSession(project);
        return true;
      }
    } catch (error) {
      console.error('Failed to open project:', error);
    }

    return false;
  }

  // Open project from file
  async openProjectFromFile(): Promise<boolean> {
    if (!window.electronAPI) return false;

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
          this.startSession(project);
          return true;
        }
      }
    } catch (error) {
      console.error('Error opening project file:', error);
    }

    return false;
  }

  // Update the active project
  updateProject(updates: Partial<VoxMatchProject>): void {
    if (!this.state.activeProject) return;

    this.state.activeProject = {
      ...this.state.activeProject,
      ...updates,
      updatedAt: Date.now(),
    };

    this.state.currentSession!.lastActive = Date.now();
    this.notifyListeners();
  }

  // Save current project
  async saveProject(): Promise<boolean> {
    if (!this.state.activeProject) return false;

    const project = {
      ...this.state.activeProject,
      isSaved: true,
      updatedAt: Date.now(),
    };

    // Save to localStorage
    this.saveProjectToStorage(project);

    // Update state
    this.state.activeProject = project;
    this.addToRecentProjects(project);
    this.notifyListeners();

    return true;
  }

  // Save project as new file
  async saveProjectAs(): Promise<boolean> {
    if (!this.state.activeProject || !window.electronAPI) return false;

    try {
      const filePath = await window.electronAPI.selectSaveLocation();
      if (!filePath) return false;

      const project = {
        ...this.state.activeProject,
        isSaved: true,
        updatedAt: Date.now(),
      };

      await window.electronAPI.saveProject(project, filePath);

      this.state.activeProject = project;
      this.saveProjectToStorage(project);
      this.addToRecentProjects(project);
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Error saving project as:', error);
      return false;
    }
  }

  // Save project to localStorage
  private saveProjectToStorage(project: VoxMatchProject): void {
    try {
      localStorage.setItem(`voxmatch-project-${project.id}`, JSON.stringify(project));
    } catch (error) {
      console.error('Failed to save project to storage:', error);
    }
  }

  // Auto-save functionality
  private setupAutoSave(): void {
    // Nothing to initialize here
  }

  private startAutoSave(): void {
    this.stopAutoSave();
    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave();
    }, AUTO_SAVE_INTERVAL);
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private performAutoSave(): void {
    if (this.state.activeProject && this.state.currentSession) {
      const project = {
        ...this.state.activeProject,
        updatedAt: Date.now(),
      };
      this.saveProjectToStorage(project);
      console.log('Auto-saved project:', project.name);
    }
  }

  // End current session and return to home
  endSession(): void {
    this.stopAutoSave();

    if (this.state.activeProject) {
      // Final save before closing
      this.saveProjectToStorage({
        ...this.state.activeProject,
        updatedAt: Date.now(),
      });
    }

    this.state.currentSession = null;
    this.state.activeProject = null;
    this.state.appState = 'home';

    this.notifyListeners();
  }

  // Delete a project
  deleteProject(projectId: string): boolean {
    try {
      localStorage.removeItem(`voxmatch-project-${projectId}`);

      this.state.recentProjects = this.state.recentProjects.filter(p => p.id !== projectId);
      this.saveRecentProjects();

      // If the deleted project is currently active, end the session
      if (this.state.activeProject?.id === projectId) {
        this.endSession();
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }

  // Get all recent projects
  getRecentProjects(): VoxMatchProject[] {
    return this.state.recentProjects;
  }

  // Get current state
  getState(): ProjectManagerState {
    return this.state;
  }

  // Check if there are unsaved changes
  hasUnsavedChanges(): boolean {
    return this.state.activeProject?.isSaved === false;
  }

  // Export project
  async exportProject(format: 'video' | 'subtitles', options?: any): Promise<boolean> {
    if (!this.state.activeProject || !window.electronAPI) return false;

    try {
      if (format === 'video') {
        await window.electronAPI.exportVideo({
          project: this.state.activeProject,
          ...options
        });
      } else {
        await window.electronAPI.exportSubtitles({
          project: this.state.activeProject,
          ...options
        });
      }
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const projectManager = new ProjectManager();

// React hook for using project manager
import { useEffect, useState } from 'react';

export function useProjectManager(): ProjectManagerState {
  const [state, setState] = useState<ProjectManagerState>(projectManager.getState());

  useEffect(() => {
    const unsubscribe = projectManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

export default projectManager;