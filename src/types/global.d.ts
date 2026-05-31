// src/types/global.d.ts
export {};

declare global {
  interface Window {
    electronAPI?: {
      openFile: (options: any) => Promise<any>;
      selectSaveLocation: (options?: any) => Promise<string | null>;
      getFileMetadata: (filePath: string) => Promise<any>;
      loadAudioFileContent: (filePath: string) => Promise<any>;
      loadProjectFile: (filePath: string) => Promise<string>;
      saveProject: (projectData: any, filePath: string) => Promise<any>;
      exportVideo: (options: any) => Promise<any>;
      exportSubtitles: (options: any) => Promise<any>;
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      notifyAppReady: () => Promise<boolean>;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
    };
    __REACT_APP_READY__?: boolean;
  }
}