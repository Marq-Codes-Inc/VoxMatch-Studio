// electron/main.ts
import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  nativeImage,
  Menu,
  protocol,
  net,
} from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

// Types

interface FileMetadata {
  name: string;
  path: string;
  type: string;
  size: number;
  duration: number;
}

interface MediaContentResult {
  data: ArrayBuffer;
  mimeType: string;
}

interface SaveResult {
  success: boolean;
  path?: string;
}

// State

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

const APP_NAME = 'VoxMatch Studio';
const APP_ID = 'com.voxmatch.studio';
const ICON_PATH = path.join(process.cwd(), 'public', 'assets', 'icon.ico');
const VXM_EXTENSION = 'vxm';

// A .vxm path queued for the renderer (from cold-start arg or OS event)
let pendingProjectFile: string | null = null;

// File-open helpers

/* Extract a .vxm path from a command-line args array. */

function extractVxmPathFromArgs(args: string[]): string | null {
  for (const arg of args) {
    if (arg.startsWith('-')) continue;
    if (arg.toLowerCase().endsWith(`.${VXM_EXTENSION}`)) return arg;
  }
  return null;
}

/* Queue a .vxm file to open and try to deliver it immediately if the renderer is already loaded. */

function queueProjectFileOpen(filePath: string): void {
  console.log(`📂 Queueing .vxm open: ${filePath}`);
  pendingProjectFile = filePath;
  deliverPendingProjectFile();
}

function deliverPendingProjectFile(): void {
  if (!pendingProjectFile) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.webContents.isLoading()) return;

  console.log(`📂 Delivering .vxm to renderer: ${pendingProjectFile}`);
  mainWindow.webContents.send('app:openProjectFile', pendingProjectFile);
  pendingProjectFile = null;
}

// Custom protocol for streaming local media into <video>/<audio>

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

// GPU / Performance

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-accelerated-video-encode');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('enable-smooth-scrolling');

// Splash

function createSplashScreen(): void {
  const iconPath = validateIconPath();

  splashWindow = new BrowserWindow({
    width: 900,
    height: 450,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    center: true,
    icon: iconPath || undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  splashWindow.setMenu(null);

  const splashPath = isDev
    ? path.join(process.cwd(), 'public', 'splash.html')
    : path.join(process.resourcesPath, 'public', 'splash.html');

  if (fs.existsSync(splashPath)) {
    splashWindow.loadFile(splashPath).catch(err => {
      console.error('❌ Failed to load splash screen:', err);
    });
  } else {
    console.error('❌ Splash screen file not found:', splashPath);
    app.quit();
    return;
  }

  splashWindow.once('ready-to-show', () => splashWindow?.show());
  splashWindow.on('closed', () => (splashWindow = null));
}

// Icon

function validateIconPath(): string | null {
  if (!fs.existsSync(ICON_PATH)) return null;
  try {
    const icon = nativeImage.createFromPath(ICON_PATH);
    return icon.isEmpty() ? null : ICON_PATH;
  } catch {
    return null;
  }
}

// Main window

function createWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = validateIconPath();

  mainWindow = new BrowserWindow({
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
      devTools: isDev,
    },
    frame: true,
    titleBarStyle: 'default',
    show: false,
    title: APP_NAME,
    backgroundColor: '#1a1a1a',
    icon: iconPath || undefined,
  });

  mainWindow.setMenu(null);
  Menu.setApplicationMenu(null);

  // Deliver any pending .vxm once the renderer finishes its first load
  mainWindow.webContents.on('did-finish-load', () => {
    deliverPendingProjectFile();
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isDev && input.shift && input.key === 'F5') {
      event.preventDefault();
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
      return;
    }
    if (isDev && !input.shift && input.key === 'F5') {
      event.preventDefault();
      mainWindow?.webContents.reload();
      return;
    }
    if (isDev && input.control && input.shift && input.key === 'R') {
      event.preventDefault();
      mainWindow?.webContents.reloadIgnoringCache();
      return;
    }
    if (!isDev) {
      const isDevToolsShortcut =
        input.key === 'F12' ||
        (input.control && input.shift && input.key === 'I') ||
        (input.meta && input.alt && input.key === 'I') ||
        (input.control && input.shift && input.key === 'J') ||
        (input.meta && input.alt && input.key === 'J') ||
        (input.control && input.key === 'F12');
      if (isDevToolsShortcut) event.preventDefault();
    }
  });

  if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(error => {
      console.error('❌ Failed to load dev server:', error);
      dialog.showErrorBox(
        'Development Server Error',
        'Failed to connect to Vite dev server at http://localhost:5173.',
      );
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (!fs.existsSync(indexPath)) {
      dialog.showErrorBox(
        'Application Error',
        'Failed to locate the application files.',
      );
      app.quit();
      return;
    }
    mainWindow.loadFile(indexPath).catch(error => {
      dialog.showErrorBox(
        'Application Error',
        `Failed to load the application.\n\n${error.message}`,
      );
    });
  }

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      mainWindow?.show();
      mainWindow?.focus();
    }, 800);
  });

  mainWindow.on('closed', () => (mainWindow = null));
  mainWindow.on('unresponsive', () =>
    console.error('⚠️ Main window became unresponsive'),
  );
}

// Lifecycle

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const vxmPath = extractVxmPathFromArgs(argv);
    if (vxmPath) queueProjectFileOpen(vxmPath);
  });

  // macOS: user double-clicked a .vxm in Finder
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (filePath.toLowerCase().endsWith(`.${VXM_EXTENSION}`)) {
      queueProjectFileOpen(filePath);
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    // Detect a .vxm path passed on cold start (app was closed)
    const coldStartVxm = extractVxmPathFromArgs(process.argv);
    if (coldStartVxm) {
      console.log(`📂 Cold-start .vxm: ${coldStartVxm}`);
      pendingProjectFile = coldStartVxm;
    }

    // Register media:// protocol
    protocol.handle('media', request => {
      try {
        const url = new URL(request.url);
        // media://local/<encoded absolute path>
        const encoded = url.pathname.replace(/^\/+/, '');
        const filePath = decodeURIComponent(encoded);
        if (!fs.existsSync(filePath)) {
          return new Response('Not found', { status: 404 });
        }
        return net.fetch(pathToFileURL(filePath).toString());
      } catch (err) {
        console.error('media:// handler error:', err);
        return new Response('Bad request', { status: 400 });
      }
    });

    const iconPath = validateIconPath();
    if (iconPath && process.platform === 'darwin' && app.dock) {
      try {
        app.dock.setIcon(nativeImage.createFromPath(iconPath));
      } catch (err) {
        console.error('Failed to set dock icon:', err);
      }
    }

    createSplashScreen();
    setTimeout(createWindow, 200);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// Utilities

function getMimeTypeFromExtension(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    [`.${VXM_EXTENSION}`]: 'application/json',
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

function validateFilePath(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function ensureVxmExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith(`.${VXM_EXTENSION}`)
    ? filePath
    : `${filePath}.${VXM_EXTENSION}`;
}

// Dialog IPC

ipcMain.handle('dialog:openFile', async (_event, options: any = {}) => {
  if (!mainWindow) throw new Error('No active window');

  const defaultFilters = [
    {
      name: 'All Supported Media',
      extensions: [
        'mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac',
        'mp4', 'mov', 'webm', 'mkv', 'avi',
      ],
    },
    { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'] },
    { name: 'Video Files', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi'] },
    { name: 'VoxMatch Project', extensions: [VXM_EXTENSION] },
    { name: 'All Files', extensions: ['*'] },
  ];

  const mergedOptions: OpenDialogOptions = {
    title: options.title || 'Open File',
    defaultPath: options.defaultPath,
    filters: options.filters || defaultFilters,
    properties: options.properties || ['openFile'],
  };

  return await dialog.showOpenDialog(mainWindow, mergedOptions);
});

ipcMain.handle('dialog:selectSaveLocation', async (_event, options: any = {}) => {
  if (!mainWindow) throw new Error('No active window');

  const saveOptions: SaveDialogOptions = {
    title: options.title || 'Save File',
    defaultPath: options.defaultPath || 'Untitled',
    filters: options.filters || [
      { name: 'VoxMatch Project', extensions: [VXM_EXTENSION] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };

  const result = await dialog.showSaveDialog(mainWindow, saveOptions);
  return result.canceled ? null : result.filePath;
});

// File IPC

ipcMain.handle(
  'file:getMetadata',
  async (_event, filePath: string): Promise<FileMetadata> => {
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
      duration: 0,
    };
  },
);

ipcMain.handle(
  'file:loadAudioContent',
  async (_event, filePath: string): Promise<MediaContentResult> => {
    if (!validateFilePath(filePath)) {
      throw new Error(`File not found or inaccessible: ${filePath}`);
    }
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    return {
      data: arrayBuffer,
      mimeType: getMimeTypeFromExtension(ext),
    };
  },
);

/* Returns a `media://` URL that the renderer can hand directly */

ipcMain.handle('file:getMediaUrl', async (_event, filePath: string) => {
  if (!validateFilePath(filePath)) {
    throw new Error(`File not found or inaccessible: ${filePath}`);
  }
  const encoded = encodeURIComponent(filePath);
  return `media://local/${encoded}`;
});

// Project .vxm IPC

ipcMain.handle('file:loadProject', async (_event, filePath: string): Promise<string> => {
  if (!validateFilePath(filePath)) {
    throw new Error(`Project file not found: ${filePath}`);
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  try {
    JSON.parse(data);
  } catch (error) {
    throw new Error(
      `Invalid project file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
  return data;
});

ipcMain.handle(
  'project:save',
  async (_event, projectData: any, filePath: string): Promise<SaveResult> => {
    const finalPath = ensureVxmExtension(filePath);
    const dir = path.dirname(finalPath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Atomic write: temp file then rename
    const tmpPath = `${finalPath}.tmp-${Date.now()}`;
    const jsonData = JSON.stringify(projectData, null, 2);
    fs.writeFileSync(tmpPath, jsonData, 'utf-8');
    fs.renameSync(tmpPath, finalPath);

    return { success: true, path: finalPath };
  },
);

// Export IPC

ipcMain.handle('export:video', async (_event, options: any = {}): Promise<SaveResult> => {
  if (!mainWindow) throw new Error('No active window');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || 'Export Video',
    defaultPath: options.defaultPath || 'output.mp4',
    filters: [
      { name: 'MP4 Video', extensions: ['mp4'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return { success: !result.canceled, path: result.filePath };
});

ipcMain.handle('export:subtitles', async (_event, options: any = {}): Promise<SaveResult> => {
  if (!mainWindow) throw new Error('No active window');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || 'Export Subtitles',
    defaultPath: options.defaultPath || 'subtitles.srt',
    filters: [
      { name: 'SubRip Subtitle', extensions: ['srt'] },
      { name: 'WebVTT Subtitle', extensions: ['vtt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return { success: !result.canceled, path: result.filePath };
});

// DevTools IPC

ipcMain.handle('dev:openDevTools', () => {
  if (isDev && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return true;
  }
  return false;
});

ipcMain.handle('dev:toggleDevTools', () => {
  if (isDev && mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    return true;
  }
  return false;
});

// App info IPC

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPlatform', () => process.platform);
ipcMain.handle('app:getPath', (_event, name: string) => app.getPath(name as any));

// Renderer is ready to receive queued .vxm files
ipcMain.handle('app:notifyReady', () => {
  console.log('✅ Renderer ready');
  deliverPendingProjectFile();
  return true;
});

// Window control IPC

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:toggleFullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

// Error handling

process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  dialog.showErrorBox(
    'Unexpected Error',
    `An unexpected error occurred:\n\n${error.message}`,
  );
});

process.on('unhandledRejection', reason =>
  console.error('❌ Unhandled Rejection:', reason),
);
process.on('SIGTERM', () => app.quit());
process.on('SIGINT', () => app.quit());

export { mainWindow };
