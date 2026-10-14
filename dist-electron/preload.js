"use strict";

// electron/preload.ts
var import_electron = require("electron");
var electronAPI = {
  // Dialogs
  openFile: (options) => import_electron.ipcRenderer.invoke("dialog:openFile", options),
  selectSaveLocation: (options) => import_electron.ipcRenderer.invoke("dialog:selectSaveLocation", options || {}),
  // File
  getFileMetadata: (filePath) => import_electron.ipcRenderer.invoke("file:getMetadata", filePath),
  getMediaUrl: (filePath) => import_electron.ipcRenderer.invoke("file:getMediaUrl", filePath),
  loadAudioFileContent: (filePath) => import_electron.ipcRenderer.invoke("file:loadAudioContent", filePath),
  // NEW — read any text file (used for .srt/.vtt/.lrc/.ass imports)
  readTextFile: (filePath) => import_electron.ipcRenderer.invoke("file:readText", filePath),
  // Project (.vxm)
  loadProjectFile: (filePath) => import_electron.ipcRenderer.invoke("file:loadProject", filePath),
  saveProject: (projectData, filePath) => import_electron.ipcRenderer.invoke("project:save", projectData, filePath),
  // Export
  exportVideo: (options) => import_electron.ipcRenderer.invoke("export:video", options),
  exportSubtitles: (options) => import_electron.ipcRenderer.invoke("export:subtitles", options),
  writeTextFile: (options) => import_electron.ipcRenderer.invoke("export:writeText", options),
  // App
  getAppVersion: () => import_electron.ipcRenderer.invoke("app:getVersion"),
  getPlatform: () => import_electron.ipcRenderer.invoke("app:getPlatform"),
  notifyAppReady: () => import_electron.ipcRenderer.invoke("app:notifyReady"),
  // Window
  minimizeWindow: () => import_electron.ipcRenderer.send("window:minimize"),
  maximizeWindow: () => import_electron.ipcRenderer.send("window:maximize"),
  closeWindow: () => import_electron.ipcRenderer.send("window:close"),
  // Events
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    import_electron.ipcRenderer.on(channel, subscription);
    return () => import_electron.ipcRenderer.removeListener(channel, subscription);
  }
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
window.dispatchEvent(new Event("electron-api-ready"));
console.log("\u2705 Preload script loaded");
