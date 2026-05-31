// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  openFile: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
  selectSaveLocation: (options?: any) => ipcRenderer.invoke('dialog:selectSaveLocation', options || {}),
  getFileMetadata: (filePath: string) => ipcRenderer.invoke('file:getMetadata', filePath),
  getMediaUrl: (filePath: string) => ipcRenderer.invoke('file:getMediaUrl', filePath),
  loadAudioFileContent: (filePath: string) => ipcRenderer.invoke('file:loadAudioContent', filePath),
  loadProjectFile: (filePath: string) => ipcRenderer.invoke('file:loadProject', filePath),
  saveProject: (projectData: any, filePath: string) => ipcRenderer.invoke('project:save', projectData, filePath),
  exportVideo: (options: any) => ipcRenderer.invoke('export:video', options),
  exportSubtitles: (options: any) => ipcRenderer.invoke('export:subtitles', options),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  notifyAppReady: () => ipcRenderer.invoke('app:notifyReady'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

window.dispatchEvent(new Event('electron-api-ready'));

console.log('✅ Preload script loaded');
