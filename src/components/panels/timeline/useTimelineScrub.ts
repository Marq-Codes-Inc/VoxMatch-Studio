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
      if (target.closest('[data-clip]')) return;
      const sc = scrollRef.current;
      const inner = innerRef.current;
      if (!sc || !inner || mediaDuration === 0) return;

      const rect = sc.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left + sc.scrollLeft, 0, inner.scrollWidth);
      handleSeek((x / inner.scrollWidth) * mediaDuration);
      setIsScrubbing(true);
    },
    [scrollRef, innerRef, mediaDuration, handleSeek, isMediaLoaded],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const sc = scrollRef.current;
      const inner = innerRef.current;
      if (!isScrubbing || !sc || !inner || mediaDuration === 0 || !isMediaLoaded) return;
      const rect = sc.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left + sc.scrollLeft, 0, inner.scrollWidth);
      handleSeek((x / inner.scrollWidth) * mediaDuration);
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
