// src/types/global.d.ts
export {};

export interface ExportProgressEvent {
  jobId: string;
  stage: 'starting' | 'writing' | 'finalizing' | 'done' | 'error';
  percent: number;
  message?: string;
  timestamp: number;
}

declare global {
  interface Window {
    electronAPI?: {
      openFile: (options: any) => Promise<{
        canceled: boolean;
        filePaths: string[];
      }>;
      selectSaveLocation: (options?: any) => Promise<string | null>;
      getFileMetadata: (filePath: string) => Promise<{
        name: string;
        path: string;
        type: string;
        size: number;
        duration: number;
      }>;
      getMediaUrl: (filePath: string) => Promise<string>;
      loadAudioFileContent: (filePath: string) => Promise<{
        data: ArrayBuffer;
        mimeType: string;
      }>;
      readTextFile: (filePath: string) => Promise<string>;
      loadProjectFile: (filePath: string) => Promise<string>;
      saveProject: (
        projectData: any,
        filePath: string,
      ) => Promise<{ success: boolean; path?: string }>;
      exportVideo: (options: any) => Promise<{
        success: boolean;
        path?: string;
      }>;
      exportSubtitles: (options: any) => Promise<{
        success: boolean;
        path?: string;
      }>;
      writeTextFile: (options: {
        content: string;
        filePath?: string;
        title?: string;
        defaultPath?: string;
        filters?: any[];
        jobId?: string;
      }) => Promise<{ success: boolean; path?: string }>;
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      getPath: (name: string) => Promise<string>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      notifyAppReady: () => Promise<boolean>;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
    };
    __REACT_APP_READY__?: boolean;
  }
}