// src/components/panels/timeline/useTimelineScrub.ts
import { useCallback, useEffect, useState } from 'react';
import { clamp } from './constants';

export function useTimelineScrub(
  scrollRef: React.RefObject<HTMLDivElement>,
  innerRef: React.RefObject<HTMLDivElement>,
  mediaDuration: number,
  isMediaLoaded: boolean,
  handleSeek: (t: number) => void,
) {
  const [isScrubbing, setIsScrubbing] = useState(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !isMediaLoaded) return;
      const target = e.target as HTMLElement;
      if (target.closest('.absolute.top-1\\/2')) return;
      if (!scrollRef.current || !innerRef.current || mediaDuration === 0) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const x = clamp(
        e.clientX - rect.left + scrollRef.current.scrollLeft,
        0,
        innerRef.current.scrollWidth,
      );
      handleSeek((x / innerRef.current.scrollWidth) * mediaDuration);
      setIsScrubbing(true);
    },
    [scrollRef, innerRef, mediaDuration, handleSeek, isMediaLoaded],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isScrubbing || !scrollRef.current || !innerRef.current || mediaDuration === 0 || !isMediaLoaded) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left + scrollRef.current.scrollLeft, 0, innerRef.current.scrollWidth);
      handleSeek((x / innerRef.current.scrollWidth) * mediaDuration);
    };
    const stop = () => setIsScrubbing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
    };
  }, [isScrubbing, mediaDuration, handleSeek, isMediaLoaded, scrollRef, innerRef]);

  return { isScrubbing, onMouseDown };
}
