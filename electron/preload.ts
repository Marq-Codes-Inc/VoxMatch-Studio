// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Dialogs
  openFile: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
  selectSaveLocation: (options?: any) =>
    ipcRenderer.invoke('dialog:selectSaveLocation', options || {}),

  // File
  getFileMetadata: (filePath: string) =>
    ipcRenderer.invoke('file:getMetadata', filePath),
  getMediaUrl: (filePath: string) =>
    ipcRenderer.invoke('file:getMediaUrl', filePath),
  loadAudioFileContent: (filePath: string) =>
    ipcRenderer.invoke('file:loadAudioContent', filePath),

  // Project (.vxm)
  loadProjectFile: (filePath: string) =>
    ipcRenderer.invoke('file:loadProject', filePath),
  saveProject: (projectData: any, filePath: string) =>
    ipcRenderer.invoke('project:save', projectData, filePath),

  // Export
  exportVideo: (options: any) => ipcRenderer.invoke('export:video', options),
  exportSubtitles: (options: any) =>
    ipcRenderer.invoke('export:subtitles', options),

  /**
   * Write text to a file with progress events.
   * If no filePath is passed, a save dialog is shown.
   *
   * Emits `export:progress` events that the renderer can subscribe to via
   * `on('export:progress', handler)`.
   */
  writeTextFile: (options: {
    content: string;
    filePath?: string;
    title?: string;
    defaultPath?: string;
    filters?: any[];
    jobId?: string;
  }) => ipcRenderer.invoke('export:writeText', options),

  // App
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  notifyAppReady: () => ipcRenderer.invoke('app:notifyReady'),

  // Window
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

window.dispatchEvent(new Event('electron-api-ready'));
console.log('✅ Preload script loaded');