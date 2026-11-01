// src/utils/aligner.ts
import { LyricLine } from '../types/types';

export interface AlignUpdate {
  clipId: string;
  startTime: number;
  endTime: number;
}

export function startAlignmentWorker(
  file: File,
  clips: LyricLine[],
  onProgress: (msg: string, percent: number) => void,
  onClipUpdate: (update: AlignUpdate) => void,
  onComplete: () => void,
  onError: (err: string) => void
): { cancel: () => void } {
  const worker = new Worker(new URL('./aligner.worker.ts', import.meta.url), {
    type: 'module',
  });

  const id = Date.now();
  let isCancelled = false;

  worker.onerror = (event) => {
    console.error('[Aligner] Worker hard crash:', event);
    if (!isCancelled) {
      worker.terminate();
      onError('The AI Worker crashed. This is likely a WASM memory limit.');
    }
  };

  worker.onmessage = (event) => {
    const data = event.data;
    if (data.id !== id) return;

    if (data.type === 'progress') {
      onProgress(data.msg, data.percent);
    } else if (data.type === 'clip_updated') {
      onClipUpdate({
        clipId: data.clipId,
        startTime: data.startTime,
        endTime: data.endTime,
      });
    } else if (data.type === 'done') {
      worker.terminate();
      onComplete();
    } else if (data.type === 'error') {
      worker.terminate();
      onError(data.error);
    }
  };

  file.arrayBuffer().then(async (buffer) => {
    if (isCancelled) return;
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const audioBuffer = await audioCtx.decodeAudioData(buffer);
      const audioData = audioBuffer.getChannelData(0); 

      if (isCancelled) return;

      worker.postMessage({ type: 'start', id, audioData, duration: audioBuffer.duration, clips }, [audioData.buffer]);
    } catch (err: any) {
      if (!isCancelled) {
        worker.terminate();
        onError('Failed to decode audio: ' + err.message);
      }
    }
  }).catch(err => {
    if (!isCancelled) {
      worker.terminate();
      onError('Failed to read file: ' + err.message);
    }
  });

  return {
    cancel: () => {
      isCancelled = true;
      worker.postMessage({ type: 'cancel', id });
      setTimeout(() => {
        worker.terminate();
        onComplete();
      }, 100);
    },
  };
}