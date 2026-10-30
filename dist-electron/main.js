"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/main.ts
var main_exports = {};
__export(main_exports, {
  mainWindow: () => mainWindow
});
module.exports = __toCommonJS(main_exports);
var import_electron = require("electron");
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_url = require("url");
var mainWindow = null;
var splashWindow = null;
var isForceClosing = false;
var isDev = process.env.NODE_ENV === "development";
var APP_NAME = "VoxMatch Studio";
var APP_ID = "com.voxmatch.studio";
var ICON_PATH = path.join(process.cwd(), "public", "assets", "icon.ico");
var VXM_EXTENSION = "vxm";
var pendingProjectFile = null;
function extractVxmPathFromArgs(args) {
  for (const arg of args) {
    if (arg.startsWith("-")) continue;
    if (arg.toLowerCase().endsWith(`.${VXM_EXTENSION}`)) return arg;
  }
  return null;
}
function queueProjectFileOpen(filePath) {
  console.log(`\u{1F4C2} Queueing .vxm open: ${filePath}`);
  pendingProjectFile = filePath;
  deliverPendingProjectFile();
}
function deliverPendingProjectFile() {
  if (!pendingProjectFile) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.webContents.isLoading()) return;
  console.log(`\u{1F4C2} Delivering .vxm to renderer: ${pendingProjectFile}`);
  mainWindow.webContents.send("app:openProjectFile", pendingProjectFile);
  pendingProjectFile = null;
}
function emitExportProgress(jobId, stage, percent, message) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("export:progress", {
    jobId,
    stage,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    message,
    timestamp: Date.now()
  });
}
import_electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
]);
import_electron.app.commandLine.appendSwitch("disable-gpu");
import_electron.app.commandLine.appendSwitch("disable-gpu-compositing");
import_electron.app.commandLine.appendSwitch("disable-accelerated-video-decode");
import_electron.app.commandLine.appendSwitch("disable-accelerated-video-encode");
import_electron.app.disableHardwareAcceleration();
import_electron.app.commandLine.appendSwitch("enable-smooth-scrolling");
function createSplashScreen() {
  const iconPath = validateIconPath();
  splashWindow = new import_electron.BrowserWindow({
    width: 900,
    height: 450,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    center: true,
    icon: iconPath || void 0,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });
  splashWindow.setMenu(null);
  const splashPath = isDev ? path.join(process.cwd(), "public", "splash.html") : path.join(__dirname, "public", "splash.html");
  if (fs.existsSync(splashPath)) {
    splashWindow.loadFile(splashPath).catch((err) => {
      console.error("\u274C Failed to load splash screen:", err);
    });
  } else {
    console.error("\u274C Splash screen file not found:", splashPath);
  }
  splashWindow.once("ready-to-show", () => splashWindow?.show());
  splashWindow.on("closed", () => splashWindow = null);
}
function validateIconPath() {
  if (!fs.existsSync(ICON_PATH)) return null;
  try {
    const icon = import_electron.nativeImage.createFromPath(ICON_PATH);
    return icon.isEmpty() ? null : ICON_PATH;
  } catch {
    return null;
  }
}
function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  const iconPath = validateIconPath();
  mainWindow = new import_electron.BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      spellcheck: false,
      webSecurity: !isDev,
      allowRunningInsecureContent: false,
      sandbox: false,
      devTools: isDev
    },
    frame: true,
    titleBarStyle: "default",
    show: false,
    title: APP_NAME,
    backgroundColor: "#1a1a1a",
    icon: iconPath || void 0
  });
  mainWindow.setMenu(null);
  import_electron.Menu.setApplicationMenu(null);
  mainWindow.on("close", (event) => {
    if (!isForceClosing) {
      event.preventDefault();
      mainWindow?.webContents.send("window:attempt-close");
    }
  });
  mainWindow.webContents.on("did-finish-load", () => {
    deliverPendingProjectFile();
  });
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (isDev && input.shift && input.key === "F5") {
      event.preventDefault();
      mainWindow?.webContents.openDevTools({ mode: "detach" });
      return;
    }
    if (isDev && !input.shift && input.key === "F5") {
      event.preventDefault();
      mainWindow?.webContents.reload();
      return;
    }
    if (isDev && input.control && input.shift && input.key === "R") {
      event.preventDefault();
      mainWindow?.webContents.reloadIgnoringCache();
      return;
    }
    if (!isDev) {
      const isDevToolsShortcut = input.key === "F12" || input.control && input.shift && input.key === "I" || input.meta && input.alt && input.key === "I" || input.control && input.shift && input.key === "J" || input.meta && input.alt && input.key === "J" || input.control && input.key === "F12";
      if (isDevToolsShortcut) event.preventDefault();
    }
  });
  if (process.platform === "win32") import_electron.app.setAppUserModelId(APP_ID);
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173").catch((error) => {
      console.error("\u274C Failed to load dev server:", error);
      import_electron.dialog.showErrorBox(
        "Development Server Error",
        "Failed to connect to Vite dev server at http://localhost:5173."
      );
    });
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    if (!fs.existsSync(indexPath)) {
      import_electron.dialog.showErrorBox(
        "Application Error",
        "Failed to locate the application files."
      );
      import_electron.app.quit();
      return;
    }
    mainWindow.loadFile(indexPath).catch((error) => {
      import_electron.dialog.showErrorBox(
        "Application Error",
        `Failed to load the application.

${error.message}`
      );
    });
  }
  mainWindow.once("ready-to-show", () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      mainWindow?.show();
      mainWindow?.focus();
    }, 800);
  });
  mainWindow.on("closed", () => mainWindow = null);
  mainWindow.on(
    "unresponsive",
    () => console.error("\u26A0\uFE0F Main window became unresponsive")
  );
}
var gotTheLock = import_electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron.app.quit();
} else {
  import_electron.app.on("second-instance", (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const vxmPath = extractVxmPathFromArgs(argv);
    if (vxmPath) queueProjectFileOpen(vxmPath);
  });
  import_electron.app.on("open-file", (event, filePath) => {
    event.preventDefault();
    if (filePath.toLowerCase().endsWith(`.${VXM_EXTENSION}`)) {
      queueProjectFileOpen(filePath);
    }
  });
  import_electron.app.whenReady().then(() => {
    import_electron.Menu.setApplicationMenu(null);
    const coldStartVxm = extractVxmPathFromArgs(process.argv);
    if (coldStartVxm) {
      console.log(`\u{1F4C2} Cold-start .vxm: ${coldStartVxm}`);
      pendingProjectFile = coldStartVxm;
    }
    import_electron.protocol.handle("media", (request) => {
      try {
        const url = new URL(request.url);
        const encoded = url.pathname.replace(/^\/+/, "");
        const filePath = decodeURIComponent(encoded);
        if (!fs.existsSync(filePath)) {
          return new Response("Not found", { status: 404 });
        }
        return import_electron.net.fetch((0, import_url.pathToFileURL)(filePath).toString());
      } catch (err) {
        console.error("media:// handler error:", err);
        return new Response("Bad request", { status: 400 });
      }
    });
    const iconPath = validateIconPath();
    if (iconPath && process.platform === "darwin" && import_electron.app.dock) {
      try {
        import_electron.app.dock.setIcon(import_electron.nativeImage.createFromPath(iconPath));
      } catch (err) {
        console.error("Failed to set dock icon:", err);
      }
    }
    createSplashScreen();
    setTimeout(createWindow, 200);
  });
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  import_electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") import_electron.app.quit();
  });
}
function getMimeTypeFromExtension(ext) {
  const mimeTypes = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    [`.${VXM_EXTENSION}`]: "application/json"
  };
  return mimeTypes[ext.toLowerCase()] || "application/octet-stream";
}
function validateFilePath(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}
function ensureVxmExtension(filePath) {
  return filePath.toLowerCase().endsWith(`.${VXM_EXTENSION}`) ? filePath : `${filePath}.${VXM_EXTENSION}`;
}
import_electron.ipcMain.handle("dialog:openFile", async (_event, options = {}) => {
  if (!mainWindow) throw new Error("No active window");
  const defaultFilters = [
    {
      name: "All Supported Media",
      extensions: [
        "mp3",
        "wav",
        "m4a",
        "ogg",
        "flac",
        "aac",
        "mp4",
        "mov",
        "webm",
        "mkv",
        "avi",
        "srt",
        "vtt",
        "lrc",
        "ass",
        "ssa"
      ]
    },
    { name: "Audio Files", extensions: ["mp3", "wav", "m4a", "ogg", "flac", "aac"] },
    { name: "Video Files", extensions: ["mp4", "mov", "webm", "mkv", "avi"] },
    { name: "Subtitles / Lyrics", extensions: ["srt", "vtt", "lrc", "ass", "ssa"] },
    { name: "VoxMatch Project", extensions: [VXM_EXTENSION] },
    { name: "All Files", extensions: ["*"] }
  ];
  const mergedOptions = {
    title: options.title || "Open File",
    defaultPath: options.defaultPath,
    filters: options.filters || defaultFilters,
    properties: options.properties || ["openFile"]
  };
  return await import_electron.dialog.showOpenDialog(mainWindow, mergedOptions);
});
import_electron.ipcMain.handle("dialog:selectSaveLocation", async (_event, options = {}) => {
  if (!mainWindow) throw new Error("No active window");
  const saveOptions = {
    title: options.title || "Save File",
    defaultPath: options.defaultPath || "Untitled",
    filters: options.filters || [
      { name: "VoxMatch Project", extensions: [VXM_EXTENSION] },
      { name: "All Files", extensions: ["*"] }
    ]
  };
  const result = await import_electron.dialog.showSaveDialog(mainWindow, saveOptions);
  return result.canceled ? null : result.filePath;
});
import_electron.ipcMain.handle(
  "file:getMetadata",
  async (_event, filePath) => {
    if (!validateFilePath(filePath)) {
      throw new Error(`File not found or inaccessible: ${filePath}`);
    }
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return {
      name: path.basename(filePath),
      path: filePath,
      type: getMimeTypeFromExtension(ext),
      size: stats.size,
      duration: 0
    };
  }
);
import_electron.ipcMain.handle(
  "file:loadAudioContent",
  async (_event, filePath) => {
    if (!validateFilePath(filePath)) {
      throw new Error(`File not found or inaccessible: ${filePath}`);
    }
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    );
    return {
      data: arrayBuffer,
      mimeType: getMimeTypeFromExtension(ext)
    };
  }
);
import_electron.ipcMain.handle("file:getMediaUrl", async (_event, filePath) => {
  if (!validateFilePath(filePath)) {
    throw new Error(`File not found or inaccessible: ${filePath}`);
  }
  const encoded = encodeURIComponent(filePath);
  return `media://local/${encoded}`;
});
import_electron.ipcMain.handle(
  "file:readText",
  async (_event, filePath) => {
    if (!validateFilePath(filePath)) {
      throw new Error(`File not found or inaccessible: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf-8");
  }
);
import_electron.ipcMain.handle("file:loadProject", async (_event, filePath) => {
  if (!validateFilePath(filePath)) {
    throw new Error(`Project file not found: ${filePath}`);
  }
  const data = fs.readFileSync(filePath, "utf-8");
  try {
    JSON.parse(data);
  } catch (error) {
    throw new Error(
      `Invalid project file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  return data;
});
import_electron.ipcMain.handle(
  "project:save",
  async (_event, projectData, filePath) => {
    const finalPath = ensureVxmExtension(filePath);
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${finalPath}.tmp-${Date.now()}`;
    const jsonData = JSON.stringify(projectData, null, 2);
    fs.writeFileSync(tmpPath, jsonData, "utf-8");
    fs.renameSync(tmpPath, finalPath);
    return { success: true, path: finalPath };
  }
);
import_electron.ipcMain.handle("export:video", async (_event, options = {}) => {
  if (!mainWindow) throw new Error("No active window");
  const result = await import_electron.dialog.showSaveDialog(mainWindow, {
    title: options.title || "Export Video",
    defaultPath: options.defaultPath || "output.mp4",
    filters: [
      { name: "MP4 Video", extensions: ["mp4"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });
  return { success: !result.canceled, path: result.filePath };
});
import_electron.ipcMain.handle("export:subtitles", async (_event, options = {}) => {
  if (!mainWindow) throw new Error("No active window");
  const result = await import_electron.dialog.showSaveDialog(mainWindow, {
    title: options.title || "Export Subtitles",
    defaultPath: options.defaultPath || "subtitles.srt",
    filters: [
      { name: "SubRip Subtitle", extensions: ["srt"] },
      { name: "WebVTT Subtitle", extensions: ["vtt"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });
  return { success: !result.canceled, path: result.filePath };
});
import_electron.ipcMain.handle(
  "export:writeText",
  async (_event, options) => {
    if (!mainWindow) throw new Error("No active window");
    if (typeof options?.content !== "string") {
      throw new Error('export:writeText requires a "content" string.');
    }
    const jobId = options.jobId || `job-${Date.now()}`;
    try {
      emitExportProgress(jobId, "starting", 0, "Preparing export\u2026");
      let targetPath = options.filePath;
      if (!targetPath) {
        const result = await import_electron.dialog.showSaveDialog(mainWindow, {
          title: options.title || "Export File",
          defaultPath: options.defaultPath || "export.txt",
          filters: options.filters || [{ name: "All Files", extensions: ["*"] }]
        });
        if (result.canceled || !result.filePath) {
          emitExportProgress(jobId, "error", 0, "Cancelled");
          return { success: false };
        }
        targetPath = result.filePath;
      }
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      emitExportProgress(jobId, "writing", 10, "Writing file\u2026");
      const tmpPath = `${targetPath}.tmp-${Date.now()}`;
      const fd = fs.openSync(tmpPath, "w");
      try {
        const content = options.content;
        const total = content.length;
        const CHUNK = Math.max(4096, Math.ceil(total / 20));
        let written = 0;
        while (written < total) {
          const chunk = content.slice(written, written + CHUNK);
          fs.writeSync(fd, chunk, null, "utf-8");
          written += chunk.length;
          const ratio = total === 0 ? 1 : written / total;
          const percent = 10 + ratio * 80;
          emitExportProgress(
            jobId,
            "writing",
            percent,
            `Writing\u2026 ${Math.round(ratio * 100)}%`
          );
        }
      } finally {
        fs.closeSync(fd);
      }
      emitExportProgress(jobId, "finalizing", 95, "Finalizing\u2026");
      fs.renameSync(tmpPath, targetPath);
      emitExportProgress(jobId, "done", 100, "Export complete");
      return { success: true, path: targetPath };
    } catch (err) {
      console.error("export:writeText failed:", err);
      emitExportProgress(
        jobId,
        "error",
        0,
        err instanceof Error ? err.message : "Export failed"
      );
      throw err;
    }
  }
);
import_electron.ipcMain.handle("dev:openDevTools", () => {
  if (isDev && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return true;
  }
  return false;
});
import_electron.ipcMain.handle("dev:toggleDevTools", () => {
  if (isDev && mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
    return true;
  }
  return false;
});
import_electron.ipcMain.handle("app:getVersion", () => import_electron.app.getVersion());
import_electron.ipcMain.handle("app:getPlatform", () => process.platform);
import_electron.ipcMain.handle("app:getPath", (_event, name) => import_electron.app.getPath(name));
import_electron.ipcMain.handle("app:notifyReady", () => {
  console.log("\u2705 Renderer ready");
  deliverPendingProjectFile();
  return true;
});
import_electron.ipcMain.on("window:minimize", () => mainWindow?.minimize());
import_electron.ipcMain.on("window:maximize", () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
import_electron.ipcMain.on("window:close", () => mainWindow?.close());
import_electron.ipcMain.on("window:toggleFullscreen", () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
import_electron.ipcMain.on("window:force-close", () => {
  isForceClosing = true;
  if (mainWindow) mainWindow.close();
});
process.on("uncaughtException", (error) => {
  console.error("\u274C Uncaught Exception:", error);
  import_electron.dialog.showErrorBox(
    "Unexpected Error",
    `An unexpected error occurred:

${error.message}`
  );
});
process.on(
  "unhandledRejection",
  (reason) => console.error("\u274C Unhandled Rejection:", reason)
);
process.on("SIGTERM", () => import_electron.app.quit());
process.on("SIGINT", () => import_electron.app.quit());
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mainWindow
});
