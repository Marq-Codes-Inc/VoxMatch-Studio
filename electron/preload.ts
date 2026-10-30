// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  openFile: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
  selectSaveLocation: (options?: any) =>
    ipcRenderer.invoke('dialog:selectSaveLocation', options || {}),

  getFileMetadata: (filePath: string) =>
    ipcRenderer.invoke('file:getMetadata', filePath),
  getMediaUrl: (filePath: string) => ipcRenderer.invoke('file:getMediaUrl', filePath),
  loadAudioFileContent: (filePath: string) =>
    ipcRenderer.invoke('file:loadAudioContent', filePath),
  readTextFile: (filePath: string) => ipcRenderer.invoke('file:readText', filePath),

  loadProjectFile: (filePath: string) =>
    ipcRenderer.invoke('file:loadProject', filePath),
  saveProject: (projectData: any, filePath: string) =>
    ipcRenderer.invoke('project:save', projectData, filePath),

  exportVideo: (options: any) => ipcRenderer.invoke('export:video', options),
  exportSubtitles: (options: any) => ipcRenderer.invoke('export:subtitles', options),
  writeTextFile: (options: {
    content: string;
    filePath?: string;
    title?: string;
    defaultPath?: string;
    filters?: any[];
    jobId?: string;
  }) => ipcRenderer.invoke('export:writeText', options),

  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  notifyAppReady: () => ipcRenderer.invoke('app:notifyReady'),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  
  onWindowClose: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('window:attempt-close', subscription);
    return () => ipcRenderer.removeListener('window:attempt-close', subscription);
  },
  forceCloseWindow: () => ipcRenderer.send('window:force-close'),

  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

window.dispatchEvent(new Event('electron-api-ready'));
console.log('✅ Preload script loaded');