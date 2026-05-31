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
  const rafRef = useRef<number | null>(null);
  const tempMediaElementRef = useRef<HTMLMediaElement | null>(null);

  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(1);
  const isCleaningUpRef = useRef(false);

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

  // Animation loop – only source of truth for currentTime while playing
  const startPlayheadAnimation = useCallback(() => {
    if (rafRef.current) return;
    const animate = () => {
      const mediaElement = getActiveMediaElement();
      if (mediaElement && !mediaElement.paused && isPlayingRef.current) {
        const newTime = mediaElement.currentTime;
        if (Math.abs(newTime - currentTimeRef.current) > 0.001) {
          currentTimeRef.current = newTime;
          setCurrentTime(newTime);
        }
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        if (mediaElement?.paused && isPlayingRef.current) {
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [getActiveMediaElement]);

  const stopPlayheadAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying && isMediaLoaded) startPlayheadAnimation();
    else stopPlayheadAnimation();
    return stopPlayheadAnimation;
  }, [isPlaying, isMediaLoaded, startPlayheadAnimation, stopPlayheadAnimation]);

  // Audio API
  const setupAudioApi = useCallback(() => {
    const mediaElement = getActiveMediaElement();
    if (!mediaElement) return;

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (err) {
        console.error('Failed to create AudioContext:', err);
        return;
      }
    }
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect(); } catch {} }
    if (analyserRef.current)   { try { analyserRef.current.disconnect();   } catch {} }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    try {
      sourceNodeRef.current = audioCtx.createMediaElementSource(mediaElement);
      sourceNodeRef.current.connect(analyser);
      analyser.connect(audioCtx.destination);
      analyserRef.current = analyser;
    } catch (err: any) {
      if (err.message?.includes('already connected')) {
        if (!analyserRef.current) analyserRef.current = analyser;
      } else {
        console.warn('Audio source connection issue:', err.message);
      }
    }
  }, [getActiveMediaElement]);

  // Event handlers
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
      if (isFinite(duration) && duration > 0) {
        setMediaDuration(duration);
      }
      setIsMediaLoaded(true);
    }
  }, [getActiveMediaElement]);

  // ════ MODIFIED: reset to beginning on media end ════
  const handleMediaEnded = useCallback(() => {
    if (isCleaningUpRef.current) return;
    setIsPlaying(false);
    isPlayingRef.current = false;
    stopPlayheadAnimation();

    // Reset the playhead to the beginning
    setCurrentTime(0);
    currentTimeRef.current = 0;

    // Also seek the media element back to 0 so it's ready for replay
    const mediaElement = getActiveMediaElement();
    if (mediaElement) {
      mediaElement.currentTime = 0;
    }
  }, [stopPlayheadAnimation, getActiveMediaElement]);

  // Cleanup
  const cleanupMedia = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;
    setIsPlaying(false);
    isPlayingRef.current = false;
    stopPlayheadAnimation();

    const mediaElement = getActiveMediaElement();
    if (mediaElement) {
      mediaElement.pause();
      mediaElement.removeAttribute('src');
      mediaElement.load();
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.removeEventListener('ended', handleMediaEnded);
    }

    if (analyserRef.current)   { try { analyserRef.current.disconnect();   } catch {} }
    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect(); } catch {} }

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
  }, [getActiveMediaElement, stopPlayheadAnimation, handleTimeUpdate, handleLoadedMetadata, handleMediaEnded]);

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
        console.log('Using temporary media element for playback setup');
      }
      if (mediaElement) {
        mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
        mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        mediaElement.removeEventListener('ended', handleMediaEnded);
        mediaElement.addEventListener('timeupdate', handleTimeUpdate);
        mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        mediaElement.addEventListener('ended', handleMediaEnded);
        mediaElement.volume = volumeRef.current;
        setTimeout(() => {
          if (!isCleaningUpRef.current) setupAudioApi();
        }, 200);
      }
    };

    setTimeout(trySetup, 100);
  }, [setupAudioApi, handleTimeUpdate, handleLoadedMetadata, handleMediaEnded]);

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

    if (isPlayingRef.current) {
      mediaElement.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
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

  useEffect(() => {
    const mediaElement = getActiveMediaElement();
    if (mediaElement) mediaElement.volume = volume;
  }, [volume, getActiveMediaElement]);

  useEffect(() => {
    return () => {
      stopPlayheadAnimation();
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