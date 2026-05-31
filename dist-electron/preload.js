"use strict";

// electron/preload.ts
var import_electron = require("electron");
var electronAPI = {
  openFile: (options) => import_electron.ipcRenderer.invoke("dialog:openFile", options),
  selectSaveLocation: (options) => import_electron.ipcRenderer.invoke("dialog:selectSaveLocation", options || {}),
  getFileMetadata: (filePath) => import_electron.ipcRenderer.invoke("file:getMetadata", filePath),
  getMediaUrl: (filePath) => import_electron.ipcRenderer.invoke("file:getMediaUrl", filePath),
  loadAudioFileContent: (filePath) => import_electron.ipcRenderer.invoke("file:loadAudioContent", filePath),
  loadProjectFile: (filePath) => import_electron.ipcRenderer.invoke("file:loadProject", filePath),
  saveProject: (projectData, filePath) => import_electron.ipcRenderer.invoke("project:save", projectData, filePath),
  exportVideo: (options) => import_electron.ipcRenderer.invoke("export:video", options),
  exportSubtitles: (options) => import_electron.ipcRenderer.invoke("export:subtitles", options),
  getAppVersion: () => import_electron.ipcRenderer.invoke("app:getVersion"),
  getPlatform: () => import_electron.ipcRenderer.invoke("app:getPlatform"),
  minimizeWindow: () => import_electron.ipcRenderer.send("window:minimize"),
  maximizeWindow: () => import_electron.ipcRenderer.send("window:maximize"),
  closeWindow: () => import_electron.ipcRenderer.send("window:close"),
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    import_electron.ipcRenderer.on(channel, subscription);
    return () => import_electron.ipcRenderer.removeListener(channel, subscription);
  },
  notifyAppReady: () => import_electron.ipcRenderer.invoke("app:notifyReady")
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
window.dispatchEvent(new Event("electron-api-ready"));
console.log("\u2705 Preload script loaded");
