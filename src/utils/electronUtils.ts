// src/utils/electronUtils.ts

/* Check if Electron API is available */
export const isElectronAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

/* Get the Electron API safely */
export const getElectronAPI = () => {
  if (!isElectronAvailable()) {
    console.warn('Electron API is not available. Running in web mode.');
    return null;
  }
  return window.electronAPI!;
};

/* Safely execute an Electron API method with fallback */
export const safeElectronCall = async <T>(
  method: keyof NonNullable<typeof window.electronAPI>,
  ...args: any[]
): Promise<T | null> => {
  const api = getElectronAPI();
  if (!api) return null;

  try {
    const fn = api[method] as (...args: any[]) => Promise<T>;
    return await fn(...args);
  } catch (error) {
    console.error(`Error calling electronAPI.${String(method)}:`, error);
    return null;
  }
};

/* Open a file dialog */
export const openFileDialog = async (options?: any) => {
  return safeElectronCall('openFile', options);
};

/* Open a save dialog */
export const saveFileDialog = async (options?: any) => {
  return safeElectronCall('selectSaveLocation', options);
};

/* Get file metadata */
export const getFileMetadata = async (filePath: string) => {
  return safeElectronCall('getFileMetadata', filePath);
};

/* Load audio file content */
export const loadAudioFileContent = async (filePath: string) => {
  return safeElectronCall('loadAudioFileContent', filePath);
};

/* Read the contents of a text file (used for subtitle/lyrics imports). */
export const readTextFile = async (
  filePath: string,
): Promise<string | null> => {
  return safeElectronCall<string>('readTextFile', filePath);
};

/* Load project file */
export const loadProjectFile = async (filePath: string) => {
  return safeElectronCall('loadProjectFile', filePath);
};

/* Save project to file */
export const saveProjectToFile = async (projectData: any, filePath: string) => {
  return safeElectronCall('saveProject', projectData, filePath);
};

/* Get app version */
export const getAppVersion = async (): Promise<string> => {
  const version = await safeElectronCall<string>('getAppVersion');
  return version || '1.0.0';
};

/* Get platform */
export const getPlatform = async (): Promise<string> => {
  const platform = await safeElectronCall<string>('getPlatform');
  return platform || 'web';
};

/* Minimize window */
export const minimizeWindow = () => {
  const api = getElectronAPI();
  if (api) api.minimizeWindow();
};

/* Maximize window */
export const maximizeWindow = () => {
  const api = getElectronAPI();
  if (api) api.maximizeWindow();
};

/* Close window */
export const closeWindow = () => {
  const api = getElectronAPI();
  if (api) api.closeWindow();
};

/* Notify Electron that app is ready */
export const notifyAppReady = async (): Promise<boolean> => {
  const result = await safeElectronCall<boolean>('notifyAppReady');
  return result || false;
};

/* Subscribe to Electron events */
export const subscribeToElectronEvent = (
  channel: string,
  callback: (...args: any[]) => void,
): (() => void) | undefined => {
  const api = getElectronAPI();
  return api?.on(channel, callback);
};
