// src/hooks/useMediaPlayback.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { ImportedMediaFile } from '../types/types';

export interface UseMediaPlaybackReturn {
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  mediaDuration: number;
  isMediaLoaded: boolean;
  mediaUrl: string | null;
  activeMediaType: 'video' | 'audio' | null;
  mediaElementRef: React.RefObject<HTMLVideoElement>;
  audioElementRef: React.RefObject<HTMLAudioElement>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  setIsPlaying: (value: boolean) => void;
  setVolume: (value: number) => void;
  handleSeek: (time: number) => void;
  togglePlayPause: () => void;
  loadMediaIntoTimeline: (file: ImportedMediaFile) => Promise<ImportedMediaFile>;
  setupMediaPlayback: (file: ImportedMediaFile) => void;
  handleTimeUpdate: () => void;
  handleLoadedMetadata: () => void;
  handleMediaEnded: () => void;
  setupAudioApi: () => void;
  getActiveMediaElement: () => HTMLMediaElement | null;
  cleanupMedia: () => void;
}

export function useMediaPlayback(): UseMediaPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [activeMediaType, setActiveMediaType] = useState<'video' | 'audio' | null>(null);

  const mediaElementRef = useRef<HTMLVideoElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const tempMediaElementRef = useRef<HTMLMediaElement | null>(null);

  // Playhead tracking
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(1);
  const isCleaningUpRef = useRef(false);
  const graphWiredElementRef = useRef<HTMLMediaElement | null>(null);
  const retryChainCancelledRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const getActiveMediaElement = useCallback((): HTMLMediaElement | null => {
    if (isCleaningUpRef.current) return null;
    if (activeMediaType === 'video') {
      return mediaElementRef.current || tempMediaElementRef.current;
    }
    if (activeMediaType === 'audio') {
      return audioElementRef.current || tempMediaElementRef.current;
    }
    return null;
  }, [activeMediaType]);

  /* True if the audio graph is currently wired up. */
  const isGraphWired = useCallback((): boolean => {
    return (
      graphWiredElementRef.current !== null && sourceNodeRef.current !== null
    );
  }, []);

  // Playhead tracking

  const startPlayheadTracking = useCallback(() => {
    if (rafRef.current !== null) return;

    const tick = () => {
      const el = getActiveMediaElement();
      if (el && !el.paused) {
        currentTimeRef.current = el.currentTime;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(() => {
      if (!isPlayingRef.current) return;
      const now = currentTimeRef.current;
      setCurrentTime(prev => (Math.abs(prev - now) > 0.005 ? now : prev));
    }, 33);
  }, [getActiveMediaElement]);

  const stopPlayheadTracking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying && isMediaLoaded) {
      startPlayheadTracking();
    } else {
      stopPlayheadTracking();
    }
    return stopPlayheadTracking;
  }, [isPlaying, isMediaLoaded, startPlayheadTracking, stopPlayheadTracking]);

  // Audio graph

  const cancelRetryChain = useCallback(() => {
    retryChainCancelledRef.current = true;
    if (retryTimeoutRef.current !== null) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const setupAudioApi = useCallback(() => {
    const mediaElement = getActiveMediaElement();
    if (!mediaElement) {
      // Retries will find it later
      return;
    }

    // Already wired to this element → cancel any pending retries
    if (graphWiredElementRef.current === mediaElement && sourceNodeRef.current) {
      cancelRetryChain();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      return;
    }

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      try {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new Ctor();
        console.log('[Audio] Created new AudioContext');
      } catch (err) {
        console.error('[Audio] Failed to create AudioContext:', err);
        return;
      }
    }
    const audioCtx = audioContextRef.current;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
        .then(() => console.log('[Audio] Context resumed, state =', audioCtx.state))
        .catch(err => console.warn('[Audio] Resume failed:', err));
    }

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
      sourceNodeRef.current = null;
    }

    let analyser = analyserRef.current;
    if (!analyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      console.log('[Audio] Created new AnalyserNode');
    }

    try {
      sourceNodeRef.current = audioCtx.createMediaElementSource(mediaElement);
      sourceNodeRef.current.connect(analyser);
      analyser.connect(audioCtx.destination);
      graphWiredElementRef.current = mediaElement;
      console.log('[Audio] Graph connected. ctx.state =', audioCtx.state);

      // SUCCESS: cancel any pending retries
      cancelRetryChain();
    } catch (err: any) {
      if (err?.name === 'InvalidStateError') {
        try { analyser.connect(audioCtx.destination); } catch {}
        graphWiredElementRef.current = mediaElement;
        console.log('[Audio] Reusing existing source node');
        cancelRetryChain();
      } else {
        console.warn('[Audio] Graph setup failed:', err);
      }
    }
  }, [getActiveMediaElement, cancelRetryChain]);

  /* Schedule retries. Stops immediately once the graph is wired. */
  const scheduleAudioRetries = useCallback(() => {
    // Cancel any previous chain
    if (retryTimeoutRef.current !== null) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    retryChainCancelledRef.current = false;

    const delays = [100, 200, 400, 800, 1500, 2500];
    let index = 0;

    const tryNext = () => {
      retryTimeoutRef.current = null;

      if (retryChainCancelledRef.current) return;
      if (isCleaningUpRef.current) return;
      if (isGraphWired()) return;   // ← definitive check

      setupAudioApi();

      index++;
      if (index < delays.length && !retryChainCancelledRef.current) {
        retryTimeoutRef.current = window.setTimeout(tryNext, delays[index]);
      }
    };

    retryTimeoutRef.current = window.setTimeout(tryNext, delays[0]);
  }, [setupAudioApi, isGraphWired]);

  // Media element events

  const handleTimeUpdate = useCallback(() => {
    const mediaElement = getActiveMediaElement();
    if (mediaElement && !isCleaningUpRef.current && !isPlayingRef.current) {
      currentTimeRef.current = mediaElement.currentTime;
      setCurrentTime(mediaElement.currentTime);
    }
  }, [getActiveMediaElement]);

  const handleLoadedMetadata = useCallback(() => {
    if (isCleaningUpRef.current) return;
    const mediaElement = getActiveMediaElement();
    if (mediaElement) {
      const duration = mediaElement.duration;
      if (isFinite(duration) && duration > 0) setMediaDuration(duration);
      setIsMediaLoaded(true);
    }
  }, [getActiveMediaElement]);

  const handleMediaEnded = useCallback(() => {
    if (isCleaningUpRef.current) return;
    setIsPlaying(false);
    isPlayingRef.current = false;
    stopPlayheadTracking();
    setCurrentTime(0);
    currentTimeRef.current = 0;
    const mediaElement = getActiveMediaElement();
    if (mediaElement) mediaElement.currentTime = 0;
  }, [stopPlayheadTracking, getActiveMediaElement]);

  // Cleanup

  const cleanupMedia = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;
    setIsPlaying(false);
    isPlayingRef.current = false;
    stopPlayheadTracking();

    cancelRetryChain();

    const mediaElement = getActiveMediaElement();
    if (mediaElement) {
      mediaElement.pause();
      mediaElement.removeAttribute('src');
      mediaElement.load();
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.removeEventListener('ended', handleMediaEnded);
    }

    if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch {} }
    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect(); } catch {} }

    graphWiredElementRef.current = null;

    if (tempMediaElementRef.current) {
      tempMediaElementRef.current.pause();
      tempMediaElementRef.current.removeAttribute('src');
      tempMediaElementRef.current.load();
      tempMediaElementRef.current.remove();
      tempMediaElementRef.current = null;
    }

    setMediaUrl(null);
    setIsMediaLoaded(false);
    setMediaDuration(0);
    setCurrentTime(0);
    setActiveMediaType(null);
    isCleaningUpRef.current = false;
  }, [
    getActiveMediaElement,
    stopPlayheadTracking,
    cancelRetryChain,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleMediaEnded,
  ]);

  // Attach listeners + start audio retry chain

  const setupMediaPlayback = useCallback((file: ImportedMediaFile) => {
    if (isCleaningUpRef.current) return;
    const isVideo = file.type?.startsWith('video') || false;
    setActiveMediaType(isVideo ? 'video' : 'audio');

    const trySetup = () => {
      let mediaElement: HTMLMediaElement | null = isVideo
        ? mediaElementRef.current
        : audioElementRef.current;

      if (!mediaElement && tempMediaElementRef.current) {
        mediaElement = tempMediaElementRef.current;
      }
      if (mediaElement) {
        mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
        mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        mediaElement.removeEventListener('ended', handleMediaEnded);
        mediaElement.addEventListener('timeupdate', handleTimeUpdate);
        mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        mediaElement.addEventListener('ended', handleMediaEnded);
        mediaElement.volume = volumeRef.current;
      }
      scheduleAudioRetries();
    };

    setTimeout(trySetup, 100);
  }, [
    scheduleAudioRetries,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleMediaEnded,
  ]);

  // Load media into the timeline

  const loadMediaIntoTimeline = useCallback(async (file: ImportedMediaFile): Promise<ImportedMediaFile> => {
    cleanupMedia();
    isCleaningUpRef.current = false;

    let fileToLoad = { ...file };
    if (!fileToLoad.url && fileToLoad.path) {
      const safePath = fileToLoad.path.replace(/\\/g, '/');
      fileToLoad.url = safePath.startsWith('file://') ? safePath : `file://${safePath}`;
    }
    if (!fileToLoad.url && fileToLoad.file) {
      fileToLoad.url = URL.createObjectURL(fileToLoad.file);
    }
    if (!fileToLoad.url) throw new Error('No URL available for file');

    const isVideo = fileToLoad.type?.startsWith('video') || false;
    setActiveMediaType(isVideo ? 'video' : 'audio');
    setMediaUrl(fileToLoad.url);

    let attempts = 0;
    let mediaElement: HTMLMediaElement | null = null;
    const MAX_ATTEMPTS = 100;

    while (attempts < MAX_ATTEMPTS && !mediaElement) {
      mediaElement = isVideo ? mediaElementRef.current : audioElementRef.current;

      if (!mediaElement && attempts === 50) {
        console.warn('Media element ref not ready after 1s, creating temporary element');
        tempMediaElementRef.current = isVideo
          ? document.createElement('video')
          : document.createElement('audio');
        tempMediaElementRef.current.style.display = 'none';
        document.body.appendChild(tempMediaElementRef.current);
        mediaElement = tempMediaElementRef.current;
        break;
      }

      if (!mediaElement) {
        await new Promise(r => setTimeout(r, 20));
        attempts++;
      }
    }

    if (!mediaElement) throw new Error('Media element not mounted');

    console.log(`📍 Found media element after ${attempts} attempts`);

    return new Promise<ImportedMediaFile>((resolve, reject) => {
      const onLoad = () => {
        mediaElement!.removeEventListener('loadedmetadata', onLoad);
        mediaElement!.removeEventListener('error', onError);
        const duration = mediaElement!.duration;
        if (isFinite(duration) && duration > 0) {
          fileToLoad.duration = duration;
          setMediaDuration(duration);
          setIsMediaLoaded(true);
        }
        setupMediaPlayback(fileToLoad);
        resolve(fileToLoad);
      };
      const onError = (e: Event) => {
        mediaElement!.removeEventListener('loadedmetadata', onLoad);
        mediaElement!.removeEventListener('error', onError);
        reject(new Error(`Media load error: ${e.type}`));
      };
      mediaElement.addEventListener('loadedmetadata', onLoad, { once: true });
      mediaElement.addEventListener('error', onError, { once: true });
      mediaElement.src = fileToLoad.url!;
      mediaElement.load();
    });
  }, [cleanupMedia, setupMediaPlayback]);

  const handleSeek = useCallback((time: number) => {
    const mediaElement = getActiveMediaElement();
    if (mediaElement && isFinite(mediaElement.duration)) {
      const safeTime = Math.max(0, Math.min(time, mediaElement.duration));
      mediaElement.currentTime = safeTime;
      currentTimeRef.current = safeTime;
      setCurrentTime(safeTime);
    }
  }, [getActiveMediaElement]);

  const togglePlayPause = useCallback(() => {
    const mediaElement = getActiveMediaElement();
    if (!mediaElement) return;

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    if (isPlayingRef.current) {
      mediaElement.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      mediaElement.play()
        .then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
        })
        .catch(err => {
          console.warn('Play failed:', err);
          setIsPlaying(false);
          isPlayingRef.current = false;
        });
    }
  }, [getActiveMediaElement]);

  // Resume playback if element loads after user pressed play
  useEffect(() => {
    if (isPlaying && isMediaLoaded) {
      const el = getActiveMediaElement();
      if (el && el.paused) {
        el.play().catch(() => {});
      }
    }
  }, [isMediaLoaded, isPlaying, getActiveMediaElement]);

  // Re-run graph setup when the media element ref changes (layout switch)
  useEffect(() => {
    if (!isMediaLoaded) return;
    const t1 = window.setTimeout(() => setupAudioApi(), 0);
    const t2 = window.setTimeout(() => setupAudioApi(), 300);
    const t3 = window.setTimeout(() => setupAudioApi(), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isMediaLoaded, activeMediaType, setupAudioApi]);

  useEffect(() => {
    const mediaElement = getActiveMediaElement();
    if (mediaElement) mediaElement.volume = volume;
  }, [volume, getActiveMediaElement]);

  useEffect(() => {
    return () => {
      stopPlayheadTracking();
      cleanupMedia();
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close().catch(console.warn);
      }
    };
  }, []);

  return {
    isPlaying, currentTime, volume, mediaDuration, isMediaLoaded, mediaUrl, activeMediaType,
    mediaElementRef, audioElementRef, analyserRef,
    setIsPlaying, setVolume, handleSeek, togglePlayPause,
    loadMediaIntoTimeline, setupMediaPlayback,
    handleTimeUpdate, handleLoadedMetadata, handleMediaEnded, setupAudioApi,
    getActiveMediaElement, cleanupMedia,
  };
}
