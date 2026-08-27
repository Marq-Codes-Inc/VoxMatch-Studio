// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu } from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Type definitions
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

// Application state
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

// Constants

const APP_NAME = 'VoxMatch Studio';
const APP_ID = 'com.voxmatch.studio';
const ICON_PATH = path.join(process.cwd(), 'public', 'assets', 'icon.ico');

// GPU/Performance Settings

// Disable GPU acceleration to prevent black flicker issues
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-accelerated-video-encode');
app.disableHardwareAcceleration();

// Enable smooth scrolling
app.commandLine.appendSwitch('enable-smooth-scrolling');

// Splash Screen

function createSplashScreen(): void {
  console.log('🎬 Creating splash screen...');
  
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

  console.log('📁 Splash path:', splashPath);

  if (fs.existsSync(splashPath)) {
    splashWindow.loadFile(splashPath).catch((err) => {
      console.error('❌ Failed to load splash screen:', err);
    });
  } else {
    console.error('❌ Splash screen file not found:', splashPath);
    app.quit();
    return;
  }

  splashWindow.once('ready-to-show', () => {
    console.log('✅ Splash screen ready');
    splashWindow?.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

// Window Management

function validateIconPath(): string | null {
  console.log('🔍 Checking icon path:', ICON_PATH);
  
  if (!fs.existsSync(ICON_PATH)) {
    console.error('❌ Icon file not found at:', ICON_PATH);
    return null;
  }
  
  try {
    const icon = nativeImage.createFromPath(ICON_PATH);
    if (icon.isEmpty()) {
      console.error('❌ Icon file is invalid or corrupted');
      return null;
    }
    
    console.log('✅ Icon validated successfully');
    return ICON_PATH;
  } catch (error) {
    console.error('❌ Failed to load icon:', error);
    return null;
  }
}

function createWindow(): void {
  console.log('🚀 Creating main window...');
  
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = validateIconPath();
  
  console.log('📁 Preload path:', preloadPath);
  console.log('📁 __dirname:', __dirname);
  console.log('📁 Icon path:', iconPath);

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
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
      devTools: isDev, // Enable DevTools in development
    },
    frame: true,
    titleBarStyle: 'default',
    show: false,
    title: APP_NAME,
    backgroundColor: '#1a1a1a',
    icon: iconPath || undefined,
  };

  mainWindow = new BrowserWindow(windowOptions);

  // Remove menu bar completely
  mainWindow.setMenu(null);
  Menu.setApplicationMenu(null);

  // Handle keyboard shortcuts - Shift+F5 for DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Shift+F5 to open DevTools (only in development)
    if (isDev && input.shift && input.key === 'F5') {
      event.preventDefault();
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
      console.log('🔧 DevTools opened via Shift+F5');
      return;
    }
    
    // Block other DevTools shortcuts in production
    if (!isDev) {
      const isDevToolsShortcut = 
        input.key === 'F12' ||
        (input.control && input.shift && input.key === 'I') ||
        (input.meta && input.alt && input.key === 'I') ||
        (input.control && input.shift && input.key === 'J') ||
        (input.meta && input.alt && input.key === 'J') ||
        (input.control && input.key === 'F12');
      
      if (isDevToolsShortcut) {
        event.preventDefault();
      }
    }
    
    // F5 for reload (only in development)
    if (isDev && !input.shift && input.key === 'F5') {
      event.preventDefault();
      mainWindow?.webContents.reload();
      console.log('🔄 Window reloaded via F5');
      return;
    }
    
    // Ctrl+Shift+R for hard reload (only in development)
    if (isDev && input.control && input.shift && input.key === 'R') {
      event.preventDefault();
      mainWindow?.webContents.reloadIgnoringCache();
      console.log('🔄 Hard reload via Ctrl+Shift+R');
      return;
    }
  });

  // Set app user model ID for Windows taskbar
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_ID);
  }

  // Load the application
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((error) => {
      console.error('❌ Failed to load from dev server:', error);
      dialog.showErrorBox(
        'Development Server Error',
        'Failed to connect to Vite dev server at http://localhost:5173\n\nPlease ensure the dev server is running.'
      );
    });
    
    // Open DevTools automatically in development (optional)
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('📁 Loading index from:', indexPath);
    
    if (!fs.existsSync(indexPath)) {
      console.error('❌ Index file not found:', indexPath);
      dialog.showErrorBox(
        'Application Error',
        'Failed to locate the application files. Please reinstall the application.'
      );
      app.quit();
      return;
    }
    
    mainWindow.loadFile(indexPath).catch((error) => {
      console.error('❌ Failed to load application:', error);
      dialog.showErrorBox(
        'Application Error',
        `Failed to load the application.\n\n${error.message}`
      );
    });
  }

  mainWindow.once('ready-to-show', () => {
    console.log('✅ Main window ready');
    
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow?.show();
      mainWindow?.focus();
    }, 800);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  mainWindow.on('unresponsive', () => {
    console.error('⚠️ Main window became unresponsive');
  });
}

// Application Lifecycle

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    console.log('✅ App ready');
    console.log('📁 App path:', app.getAppPath());
    console.log('📁 Resources path:', process.resourcesPath);
    console.log('📁 Current working directory:', process.cwd());
    
    Menu.setApplicationMenu(null);
    
    const iconPath = validateIconPath();
    if (iconPath) {
      try {
        const icon = nativeImage.createFromPath(iconPath);
        
        if (process.platform === 'darwin' && app.dock) {
          app.dock.setIcon(icon);
          console.log('✅ Dock icon set');
        }
        
        if (process.platform === 'win32') {
          console.log('✅ Windows taskbar icon configured');
        }
      } catch (error) {
        console.error('❌ Failed to set application icon:', error);
      }
    }
    
    createSplashScreen();
    
    setTimeout(() => {
      createWindow();
    }, 200);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  
  app.on('will-quit', () => {
    console.log('📤 Application shutting down...');
  });
}

// Utility Functions

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
    '.vxm': 'application/json',
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

// Dialog IPC Handlers

ipcMain.handle('dialog:openFile', async (_event, options: any = {}) => {
  if (!mainWindow) {
    throw new Error('No active window');
  }
  
  const defaultFilters = [
    { name: 'All Supported Media', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'mp4', 'mov', 'webm', 'mkv', 'avi'] },
    { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'] },
    { name: 'Video Files', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi'] },
    { name: 'VoxMatch Project', extensions: ['vxm'] },
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
  if (!mainWindow) {
    throw new Error('No active window');
  }
  
  const saveOptions: SaveDialogOptions = {
    title: options.title || 'Save File',
    defaultPath: options.defaultPath || 'Untitled',
    filters: options.filters || [
      { name: 'VoxMatch Project', extensions: ['vxm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };
  
  const result = await dialog.showSaveDialog(mainWindow, saveOptions);
  return result.canceled ? null : result.filePath;
});

// File Handlers

ipcMain.handle('file:getMetadata', async (_event, filePath: string): Promise<FileMetadata> => {
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
});

ipcMain.handle('file:loadAudioContent', async (_event, filePath: string): Promise<MediaContentResult> => {
  if (!validateFilePath(filePath)) {
    throw new Error(`File not found or inaccessible: ${filePath}`);
  }
  
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  
  return {
    data: arrayBuffer as ArrayBuffer,
    mimeType: getMimeTypeFromExtension(ext),
  };
});

ipcMain.handle('file:loadProject', async (_event, filePath: string): Promise<string> => {
  if (!validateFilePath(filePath)) {
    throw new Error(`Project file not found: ${filePath}`);
  }
  
  const data = fs.readFileSync(filePath, 'utf-8');
  
  try {
    JSON.parse(data);
  } catch (error) {
    throw new Error(`Invalid project file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return data;
});

ipcMain.handle('project:save', async (_event, projectData: any, filePath: string): Promise<SaveResult> => {
  const finalPath = filePath.endsWith('.vxm') ? filePath : `${filePath}.vxm`;
  const dir = path.dirname(finalPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const jsonData = JSON.stringify(projectData, null, 2);
  fs.writeFileSync(finalPath, jsonData, 'utf-8');
  
  return { success: true, path: finalPath };
});

// Export Handlers

ipcMain.handle('export:video', async (_event, options: any = {}): Promise<SaveResult> => {
  if (!mainWindow) {
    throw new Error('No active window');
  }
  
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
  if (!mainWindow) {
    throw new Error('No active window');
  }
  
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

// DevTools IPC Handler

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

// App Info Handlers

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPlatform', () => process.platform);
ipcMain.handle('app:getPath', (_event, name: string) => app.getPath(name as any));
ipcMain.handle('app:notifyReady', () => {
  console.log('✅ React app notified ready via IPC');
  return true;
});

// Window Control Handlers

ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.on('window:toggleFullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// Error Handling

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  dialog.showErrorBox(
    'Unexpected Error',
    `An unexpected error occurred:\n\n${error.message}\n\nPlease restart the application.`
  );
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('SIGTERM', () => {
  console.log('📤 Received SIGTERM signal');
  app.quit();
});

process.on('SIGINT', () => {
  console.log('📤 Received SIGINT signal');
  app.quit();
});

export { mainWindow };
