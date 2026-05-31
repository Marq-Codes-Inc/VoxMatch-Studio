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
var mainWindow = null;
var splashWindow = null;
var isDev = process.env.NODE_ENV === "development";
var APP_NAME = "VoxMatch Studio";
var APP_ID = "com.voxmatch.studio";
var ICON_PATH = path.join(process.cwd(), "public", "assets", "icon.ico");
import_electron.app.commandLine.appendSwitch("disable-gpu");
import_electron.app.commandLine.appendSwitch("disable-gpu-compositing");
import_electron.app.commandLine.appendSwitch("disable-accelerated-video-decode");
import_electron.app.commandLine.appendSwitch("disable-accelerated-video-encode");
import_electron.app.disableHardwareAcceleration();
import_electron.app.commandLine.appendSwitch("enable-smooth-scrolling");
function createSplashScreen() {
  console.log("\u{1F3AC} Creating splash screen...");
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
  const splashPath = isDev ? path.join(process.cwd(), "public", "splash.html") : path.join(process.resourcesPath, "public", "splash.html");
  console.log("\u{1F4C1} Splash path:", splashPath);
  if (fs.existsSync(splashPath)) {
    splashWindow.loadFile(splashPath).catch((err) => {
      console.error("\u274C Failed to load splash screen:", err);
    });
  } else {
    console.error("\u274C Splash screen file not found:", splashPath);
    import_electron.app.quit();
    return;
  }
  splashWindow.once("ready-to-show", () => {
    console.log("\u2705 Splash screen ready");
    splashWindow?.show();
  });
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}
function validateIconPath() {
  console.log("\u{1F50D} Checking icon path:", ICON_PATH);
  if (!fs.existsSync(ICON_PATH)) {
    console.error("\u274C Icon file not found at:", ICON_PATH);
    return null;
  }
  try {
    const icon = import_electron.nativeImage.createFromPath(ICON_PATH);
    if (icon.isEmpty()) {
      console.error("\u274C Icon file is invalid or corrupted");
      return null;
    }
    console.log("\u2705 Icon validated successfully");
    return ICON_PATH;
  } catch (error) {
    console.error("\u274C Failed to load icon:", error);
    return null;
  }
}
function createWindow() {
  console.log("\u{1F680} Creating main window...");
  const preloadPath = path.join(__dirname, "preload.js");
  const iconPath = validateIconPath();
  console.log("\u{1F4C1} Preload path:", preloadPath);
  console.log("\u{1F4C1} __dirname:", __dirname);
  console.log("\u{1F4C1} Icon path:", iconPath);
  const windowOptions = {
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
      // Enable DevTools in development
    },
    frame: true,
    titleBarStyle: "default",
    show: false,
    title: APP_NAME,
    backgroundColor: "#1a1a1a",
    icon: iconPath || void 0
  };
  mainWindow = new import_electron.BrowserWindow(windowOptions);
  mainWindow.setMenu(null);
  import_electron.Menu.setApplicationMenu(null);
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (isDev && input.shift && input.key === "F5") {
      event.preventDefault();
      mainWindow?.webContents.openDevTools({ mode: "detach" });
      console.log("\u{1F527} DevTools opened via Shift+F5");
      return;
    }
    if (!isDev) {
      const isDevToolsShortcut = input.key === "F12" || input.control && input.shift && input.key === "I" || input.meta && input.alt && input.key === "I" || input.control && input.shift && input.key === "J" || input.meta && input.alt && input.key === "J" || input.control && input.key === "F12";
      if (isDevToolsShortcut) {
        event.preventDefault();
      }
    }
    if (isDev && !input.shift && input.key === "F5") {
      event.preventDefault();
      mainWindow?.webContents.reload();
      console.log("\u{1F504} Window reloaded via F5");
      return;
    }
    if (isDev && input.control && input.shift && input.key === "R") {
      event.preventDefault();
      mainWindow?.webContents.reloadIgnoringCache();
      console.log("\u{1F504} Hard reload via Ctrl+Shift+R");
      return;
    }
  });
  if (process.platform === "win32") {
    import_electron.app.setAppUserModelId(APP_ID);
  }
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173").catch((error) => {
      console.error("\u274C Failed to load from dev server:", error);
      import_electron.dialog.showErrorBox(
        "Development Server Error",
        "Failed to connect to Vite dev server at http://localhost:5173\n\nPlease ensure the dev server is running."
      );
    });
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    console.log("\u{1F4C1} Loading index from:", indexPath);
    if (!fs.existsSync(indexPath)) {
      console.error("\u274C Index file not found:", indexPath);
      import_electron.dialog.showErrorBox(
        "Application Error",
        "Failed to locate the application files. Please reinstall the application."
      );
      import_electron.app.quit();
      return;
    }
    mainWindow.loadFile(indexPath).catch((error) => {
      console.error("\u274C Failed to load application:", error);
      import_electron.dialog.showErrorBox(
        "Application Error",
        `Failed to load the application.

${error.message}`
      );
    });
  }
  mainWindow.once("ready-to-show", () => {
    console.log("\u2705 Main window ready");
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow?.show();
      mainWindow?.focus();
    }, 800);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.on("unresponsive", () => {
    console.error("\u26A0\uFE0F Main window became unresponsive");
  });
}
var gotTheLock = import_electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron.app.quit();
} else {
  import_electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  import_electron.app.whenReady().then(() => {
    console.log("\u2705 App ready");
    console.log("\u{1F4C1} App path:", import_electron.app.getAppPath());
    console.log("\u{1F4C1} Resources path:", process.resourcesPath);
    console.log("\u{1F4C1} Current working directory:", process.cwd());
    import_electron.Menu.setApplicationMenu(null);
    const iconPath = validateIconPath();
    if (iconPath) {
      try {
        const icon = import_electron.nativeImage.createFromPath(iconPath);
        if (process.platform === "darwin" && import_electron.app.dock) {
          import_electron.app.dock.setIcon(icon);
          console.log("\u2705 Dock icon set");
        }
        if (process.platform === "win32") {
          console.log("\u2705 Windows taskbar icon configured");
        }
      } catch (error) {
        console.error("\u274C Failed to set application icon:", error);
      }
    }
    createSplashScreen();
    setTimeout(() => {
      createWindow();
    }, 200);
  });
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  import_electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      import_electron.app.quit();
    }
  });
  import_electron.app.on("will-quit", () => {
    console.log("\u{1F4E4} Application shutting down...");
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
    ".vxm": "application/json"
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
import_electron.ipcMain.handle("dialog:openFile", async (_event, options = {}) => {
  if (!mainWindow) {
    throw new Error("No active window");
  }
  const defaultFilters = [
    { name: "All Supported Media", extensions: ["mp3", "wav", "m4a", "ogg", "flac", "aac", "mp4", "mov", "webm", "mkv", "avi"] },
    { name: "Audio Files", extensions: ["mp3", "wav", "m4a", "ogg", "flac", "aac"] },
    { name: "Video Files", extensions: ["mp4", "mov", "webm", "mkv", "avi"] },
    { name: "VoxMatch Project", extensions: ["vxm"] },
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
  if (!mainWindow) {
    throw new Error("No active window");
  }
  const saveOptions = {
    title: options.title || "Save File",
    defaultPath: options.defaultPath || "Untitled",
    filters: options.filters || [
      { name: "VoxMatch Project", extensions: ["vxm"] },
      { name: "All Files", extensions: ["*"] }
    ]
  };
  const result = await import_electron.dialog.showSaveDialog(mainWindow, saveOptions);
  return result.canceled ? null : result.filePath;
});
import_electron.ipcMain.handle("file:getMetadata", async (_event, filePath) => {
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
});
import_electron.ipcMain.handle("file:loadAudioContent", async (_event, filePath) => {
  if (!validateFilePath(filePath)) {
    throw new Error(`File not found or inaccessible: ${filePath}`);
  }
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return {
    data: arrayBuffer,
    mimeType: getMimeTypeFromExtension(ext)
  };
});
import_electron.ipcMain.handle("file:loadProject", async (_event, filePath) => {
  if (!validateFilePath(filePath)) {
    throw new Error(`Project file not found: ${filePath}`);
  }
  const data = fs.readFileSync(filePath, "utf-8");
  try {
    JSON.parse(data);
  } catch (error) {
    throw new Error(`Invalid project file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
  return data;
});
import_electron.ipcMain.handle("project:save", async (_event, projectData, filePath) => {
  const finalPath = filePath.endsWith(".vxm") ? filePath : `${filePath}.vxm`;
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const jsonData = JSON.stringify(projectData, null, 2);
  fs.writeFileSync(finalPath, jsonData, "utf-8");
  return { success: true, path: finalPath };
});
import_electron.ipcMain.handle("export:video", async (_event, options = {}) => {
  if (!mainWindow) {
    throw new Error("No active window");
  }
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
  if (!mainWindow) {
    throw new Error("No active window");
  }
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
  console.log("\u2705 React app notified ready via IPC");
  return true;
});
import_electron.ipcMain.on("window:minimize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});
import_electron.ipcMain.on("window:maximize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
import_electron.ipcMain.on("window:close", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});
import_electron.ipcMain.on("window:toggleFullscreen", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});
process.on("uncaughtException", (error) => {
  console.error("\u274C Uncaught Exception:", error);
  import_electron.dialog.showErrorBox(
    "Unexpected Error",
    `An unexpected error occurred:

${error.message}

Please restart the application.`
  );
});
process.on("unhandledRejection", (reason) => {
  console.error("\u274C Unhandled Rejection:", reason);
});
process.on("SIGTERM", () => {
  console.log("\u{1F4E4} Received SIGTERM signal");
  import_electron.app.quit();
});
process.on("SIGINT", () => {
  console.log("\u{1F4E4} Received SIGINT signal");
  import_electron.app.quit();
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mainWindow
});
