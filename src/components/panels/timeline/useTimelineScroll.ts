// src/components/panels/timeline/useTimelineScroll.ts
import { useEffect } from 'react';

export function useAutoScrollPlayhead(
  scrollRef: React.RefObject<HTMLDivElement>,
  innerRef: React.RefObject<HTMLDivElement>,
  currentTime: number,
  mediaDuration: number,
  zoom: number,
  isMediaLoaded: boolean,
) {
  useEffect(() => {
    if (!scrollRef.current || !innerRef.current || mediaDuration === 0 || !isMediaLoaded) return;
    const sc = scrollRef.current, inner = innerRef.current;
    const totalWidth = inner.scrollWidth;
    const viewportWidth = sc.clientWidth;
    if (totalWidth <= viewportWidth) return;

    const playheadX = (currentTime / mediaDuration) * totalWidth;
    const leftVisible = sc.scrollLeft;
    const rightVisible = leftVisible + viewportWidth;
    const margin = Math.max(80, viewportWidth * 0.0015);

    let targetLeft: number | null = null;
    if (playheadX > rightVisible - margin) {
      targetLeft = Math.min(Math.max(0, playheadX - viewportWidth / 4), totalWidth - viewportWidth);
    } else if (playheadX < leftVisible + margin) {
      targetLeft = Math.max(0, playheadX - viewportWidth / 4);
    }
    if (targetLeft !== null) {
      sc.scrollLeft = targetLeft;
    }
  }, [currentTime, mediaDuration, zoom, isMediaLoaded, scrollRef, innerRef]);
}
