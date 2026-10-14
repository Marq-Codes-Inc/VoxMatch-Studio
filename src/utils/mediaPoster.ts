// src/utils/mediaPoster.ts

export interface PosterOptions {
  position?: number;
  width?: number;
  quality?: number;
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<PosterOptions> = {
  position: 0.1,
  width: 640,
  quality: 0.75,
  timeoutMs: 8000,
};

export function extractVideoPoster(
  src: string,
  options: PosterOptions = {},
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.style.position = 'absolute';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';

    let settled = false;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        /* ignore */
      }
      if (video.parentNode) video.parentNode.removeChild(video);
    };

    const finish = (result: string | null, error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else if (result) resolve(result);
      else reject(new Error('Failed to capture poster frame'));
    };

    const onLoadedMetadata = () => {
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        finish(null, new Error('Invalid video duration'));
        return;
      }
      const target = Math.max(0, Math.min(opts.position, 0.95)) * duration;
      try {
        video.currentTime = target;
      } catch (err) {
        finish(
          null,
          err instanceof Error ? err : new Error('Seek failed'),
        );
      }
    };

    const onSeeked = () => {
      // Wait one more frame so the decoder flushes
      requestAnimationFrame(() => {
        try {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) {
            finish(null, new Error('Video has no dimensions'));
            return;
          }

          const targetW = Math.min(opts.width, vw);
          const targetH = Math.round((targetW * vh) / vw);

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            finish(null, new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(video, 0, 0, targetW, targetH);

          const dataUrl = canvas.toDataURL('image/jpeg', opts.quality);
          if (!dataUrl || !dataUrl.startsWith('data:image/')) {
            finish(null, new Error('toDataURL failed'));
            return;
          }

          finish(dataUrl);
        } catch (err) {
          finish(
            null,
            err instanceof Error ? err : new Error('Draw failed'),
          );
        }
      });
    };

    const onError = () => {
      finish(null, new Error('Video failed to load'));
    };

    timeoutId = window.setTimeout(() => {
      finish(null, new Error('Poster extraction timed out'));
    }, opts.timeoutMs);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    document.body.appendChild(video);

    try {
      video.src = src;
      video.load();
    } catch (err) {
      finish(
        null,
        err instanceof Error ? err : new Error('Could not set video src'),
      );
    }
  });
}
