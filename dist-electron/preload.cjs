var a = (e, i) => () => (i || e((i = { exports: {} }).exports, i), i.exports);
import { contextBridge as d, ipcRenderer as o } from "electron";
var l = a(() => {
  const r = {
    // File dialogs
    openFile: (e) => o.invoke("dialog:openFile", e),
    // Make selectSaveLocation accept optional options, but also work with no args
    selectSaveLocation: (e) => o.invoke("dialog:selectSaveLocation", e || {}),
    // File operations
    getFileMetadata: (e) => o.invoke("file:getMetadata", e),
    loadAudioFileContent: (e) => o.invoke("file:loadAudioContent", e),
    loadProjectFile: (e) => o.invoke("file:loadProject", e),
    saveProject: (e, i) => o.invoke("project:save", e, i),
    // Export
    exportVideo: (e) => o.invoke("export:video", e),
    exportSubtitles: (e) => o.invoke("export:subtitles", e),
    // App info
    getAppVersion: () => o.invoke("app:getVersion"),
    getPlatform: () => o.invoke("app:getPlatform"),
    // Window controls
    minimizeWindow: () => o.send("window:minimize"),
    maximizeWindow: () => o.send("window:maximize"),
    closeWindow: () => o.send("window:close"),
    // Events
    on: (e, i) => {
      const n = (s, ...t) => i(...t);
      return o.on(e, n), () => {
        o.removeListener(e, n);
      };
    }
  };
  d.exposeInMainWorld("electronAPI", r);
  window.dispatchEvent(new Event("electron-api-ready"));
});
export default l();
