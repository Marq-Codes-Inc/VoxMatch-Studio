// src/utils/aligner.worker.ts
import { pipeline, env } from '@huggingface/transformers';

// Determine if we are running in production (Electron file://) or development (Vite http://)
const isProduction = self.location.protocol === 'file:';

env.allowLocalModels = true;
// In production, the public folder is bundled at the root level, so we use './models/'
// In dev, Vite serves from the root, so '/models/' works
env.localModelPath = isProduction ? './models/' : '/models/';

let transcriber: any = null;
let isCancelled = false;

self.onmessage = async (event) => {
  const { type, id, audioData, duration, clips } = event.data;

  if (type === 'cancel') {
    isCancelled = true;
    return;
  }

  if (type === 'start') {
    isCancelled = false;
    try {
      console.log('[Worker] Starting alignment...');
      self.postMessage({ type: 'progress', msg: 'Loading local AI model...', percent: 0, id });

      if (!transcriber) {
        transcriber = await pipeline(
          'automatic-speech-recognition',
          'wav2vec2-base-960h',
          { 
            dtype: 'q4',
            progress_callback: (data: any) => {
              if (data.status === 'progress' && !isCancelled) {
                self.postMessage({ type: 'progress', msg: 'Loading AI Model...', percent: Math.round(data.progress), id });
              }
            }
          } as any
        );
      }

      if (isCancelled) return;
      console.log('[Worker] Model loaded. Processing clips...');

      const SAMPLE_RATE = 16000;
      const PROCESS_WINDOW = 4; 
      
      const updatedClips = [...clips].sort((a: any, b: any) => a.startTime - b.startTime);

      for (let i = 0; i < updatedClips.length; i++) {
        if (isCancelled) return;

        const clip = updatedClips[i];
        const startSec = Math.max(0, clip.startTime - 1);
        const endSec = Math.min(duration, startSec + PROCESS_WINDOW);
        
        const startSample = Math.floor(startSec * SAMPLE_RATE);
        const endSample = Math.floor(endSec * SAMPLE_RATE);
        
        const chunkData = audioData.slice(startSample, endSample);
        
        self.postMessage({ 
          type: 'progress', 
          msg: `Aligning clip ${i + 1} of ${updatedClips.length}...`, 
          percent: 10 + Math.round((i / updatedClips.length) * 90),
          id 
        });

        let matchedStart = null;
        let matchedEnd = null;

        try {
          const output = await transcriber(chunkData, {
            return_timestamps: 'word',
            chunk_length_s: 4,
            stride_length_s: 1,
          });

          console.log(`[Worker] Chunk ${i} result:`, output);

          const words: any[] = [];
          if (output?.chunks) {
            for (const chunk of output.chunks) {
              words.push({
                word: chunk.text.trim().toLowerCase(),
                start: chunk.timestamp[0],
                end: chunk.timestamp[1] || (chunk.timestamp[0] + 0.5),
              });
            }
          }

          const clipWords = clip.text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
          
          if (words.length > 0 && clipWords.length > 0) {
            const firstWordStr = clipWords[0];
            const lastWordStr = clipWords[clipWords.length - 1];
            
            for (const w of words) {
              if (w.word.includes(firstWordStr) || firstWordStr.includes(w.word) || w.word.replace(/[^\w]/g, '') === firstWordStr) {
                matchedStart = w.start;
                break;
              }
            }
            
            if (matchedStart !== null) {
              for (const w of words) {
                 if (w.start < matchedStart) continue;
                 if (w.word.includes(lastWordStr) || lastWordStr.includes(w.word) || w.word.replace(/[^\w]/g, '') === lastWordStr) {
                   matchedEnd = w.end;
                 }
              }
            }
          }
        } catch (err) {
          console.warn(`[Worker] Error on chunk ${i}:`, err);
        }

        const absoluteStart = matchedStart !== null 
          ? startSec + matchedStart 
          : clip.startTime; 
          
        const estimatedDuration = Math.max(1.5, clip.text.length * 0.08);
        const absoluteEnd = matchedEnd !== null 
          ? startSec + matchedEnd 
          : absoluteStart + estimatedDuration;

        self.postMessage({ 
          type: 'clip_updated', 
          clipId: clip.id, 
          startTime: Math.max(0, absoluteStart),
          endTime: Math.max(absoluteStart + 0.1, absoluteEnd),
          id 
        });
        
        await new Promise(r => setTimeout(r, 50));
      }

      if (!isCancelled) {
        console.log('[Worker] All clips processed.');
        self.postMessage({ type: 'done', id });
      }
    } catch (error: any) {
      console.error('[Worker] Fatal crash:', error);
      if (!isCancelled) {
        self.postMessage({ type: 'error', error: error.message || 'Unknown worker error', id });
      }
    }
  }
};
