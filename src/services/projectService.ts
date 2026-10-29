// src/services/projectService.ts
import { VoxMatchProject } from '../types/types';

const STORAGE_PREFIX = 'voxmatch-project-';
const RECENT_PROJECTS_KEY = 'voxmatch-recent-projects';
const MAX_RECENT_PROJECTS = 10;

/* Service for managing project persistence and loading */
class ProjectService {
  /* Save project to localStorage */
  saveToStorage(project: VoxMatchProject): void {
    try {
      // Create a clean copy for storage (remove non-serializable data)
      const storageProject = this.prepareForStorage(project);
      localStorage.setItem(
        `${STORAGE_PREFIX}${project.id}`,
        JSON.stringify(storageProject)
      );
      this.addToRecentProjects(project);
    } catch (error) {
      console.error('Failed to save project to storage:', error);
    }
  }

  /* Load project from localStorage */
  loadFromStorage(projectId: string): VoxMatchProject | null {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
      if (!stored) return null;
      
      const project = JSON.parse(stored);
      return this.restoreFromStorage(project);
    } catch (error) {
      console.error('Failed to load project from storage:', error);
      return null;
    }
  }

  /* Load all projects from localStorage */
  loadAllFromStorage(): VoxMatchProject[] {
    const projects: VoxMatchProject[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        try {
          const project = JSON.parse(localStorage.getItem(key)!);
          projects.push(this.restoreFromStorage(project));
        } catch (e) {
          console.error('Failed to load project:', key, e);
        }
      }
    }
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /* Save project to file (via Electron) */
  async saveToFile(project: VoxMatchProject, filePath?: string): Promise<string | null> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    let savePath: string | null = filePath || null;
    
    if (!savePath) {
      // Call selectSaveLocation - it returns string | null
      const result = await window.electronAPI.selectSaveLocation();
      savePath = result; // result is already string | null
    }

    if (!savePath) return null;

    const cleanProject = this.prepareForStorage(project);
    await window.electronAPI.saveProject(cleanProject, savePath);
    
    return savePath;
  }

  /* Load project from file (via Electron) */
  async loadFromFile(): Promise<VoxMatchProject | null> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.openFile({
      properties: ['openFile'],
      filters: [{ name: 'VoxMatch Project', extensions: ['voxmatch'] }]
    });

    if (result.canceled || !result.filePaths?.[0]) {
      return null;
    }

    const filePath = result.filePaths[0];
    const fileContent = await window.electronAPI.loadProjectFile(filePath);
    
    if (!fileContent) return null;

    const project = JSON.parse(fileContent);
    project.projectFilePath = filePath;
    return this.restoreFromStorage(project);
  }

  /* Delete project from storage */
  deleteProject(projectId: string): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${projectId}`);
    this.removeFromRecentProjects(projectId);
  }

  /* Get recent projects */
  getRecentProjects(): VoxMatchProject[] {
    try {
      const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
      if (!stored) return [];
      
      const recentIds = JSON.parse(stored) as string[];
      return recentIds
        .map(id => this.loadFromStorage(id))
        .filter((p): p is VoxMatchProject => p !== null);
    } catch {
      return [];
    }
  }

  /* Prepare project for storage (remove non-serializable data) */
  private prepareForStorage(project: VoxMatchProject): VoxMatchProject {
    return {
      ...project,
      mediaFiles: project.mediaFiles.map(file => ({
        ...file,
        url: null, // URLs are ephemeral, will be recreated on load
        file: undefined, // File objects can't be serialized
        loaded: false // Will be reloaded from path
      }))
    };
  }

  /* Restore project from storage (reinitialize ephemeral fields) */
  private restoreFromStorage(project: VoxMatchProject): VoxMatchProject {
    return {
      ...project,
      mediaFiles: project.mediaFiles.map(file => ({
        ...file,
        url: null,
        file: undefined,
        loaded: false
      })),
      isSaved: true // Projects from storage are considered saved
    };
  }

  /* Add project to recent list */
  private addToRecentProjects(project: VoxMatchProject): void {
    try {
      const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
      const recentIds: string[] = stored ? JSON.parse(stored) : [];
      
      const updatedIds = [
        project.id,
        ...recentIds.filter(id => id !== project.id)
      ].slice(0, MAX_RECENT_PROJECTS);
      
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updatedIds));
    } catch (error) {
      console.error('Failed to update recent projects:', error);
    }
  }

  /* Remove project from recent list */
  private removeFromRecentProjects(projectId: string): void {
    try {
      const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
      if (!stored) return;
      
      const recentIds: string[] = JSON.parse(stored);
      const updatedIds = recentIds.filter(id => id !== projectId);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updatedIds));
    } catch (error) {
      console.error('Failed to remove from recent projects:', error);
    }
  }
}

export const projectService = new ProjectService();

