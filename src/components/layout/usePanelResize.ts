// src/components/layout/usePanelResize.ts
import { useCallback, useEffect, useRef } from 'react';

export interface PanelResizeContext<Sizes> {
  type: string;
  deltaX: number;
  deltaY: number;
  initialSizes: Sizes;
  rootWidth: number;
  rootHeight: number;
}

interface UsePanelResizeArgs<Type extends string, Sizes> {
  rootRef: React.RefObject<HTMLElement | null>;
  sizes: Sizes;
  onResize: (updates: Partial<Sizes>) => void;
  cursorFor: (type: Type) => string;
  computeUpdates: (
    ctx: PanelResizeContext<Sizes> & { type: Type },
  ) => Partial<Sizes>;
}

export function usePanelResize<Type extends string, Sizes>(
  args: UsePanelResizeArgs<Type, Sizes>,
) {
  const { rootRef } = args;

  const argsRef = useRef(args);
  argsRef.current = args;

  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const startResize = useCallback(
    (type: Type, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      cleanupRef.current?.();

      const root = rootRef.current;
      if (!root) {
        console.warn('[resize] no rootRef');
        return;
      }

      const rect = root.getBoundingClientRect();
      const initialSizes = { ...(argsRef.current.sizes as object) } as Sizes;
      const startX = e.clientX;
      const startY = e.clientY;
      const rootWidth = rect.width;
      const rootHeight = rect.height;

      console.log('[resize] start', type, { startX, startY, rootWidth, rootHeight });

      document.body.style.cursor = argsRef.current.cursorFor(type);
      document.body.style.userSelect = 'none';

      let rafId: number | null = null;
      let lastX = startX;
      let lastY = startY;
      let ended = false;

      const flush = () => {
        rafId = null;
        if (ended) return;
        const updates = argsRef.current.computeUpdates({
          type,
          deltaX: lastX - startX,
          deltaY: lastY - startY,
          initialSizes,
          rootWidth,
          rootHeight,
        });
        if (updates && Object.keys(updates).length > 0) {
          argsRef.current.onResize(updates);
        }
      };

      const onMove = (ev: MouseEvent) => {
        lastX = ev.clientX;
        lastY = ev.clientY;
        if (rafId === null) rafId = requestAnimationFrame(flush);
      };

      const cleanup = () => {
        if (ended) return;
        ended = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove, true);
        window.removeEventListener('mouseup', cleanup, true);
        window.removeEventListener('blur', cleanup);
        cleanupRef.current = null;
        console.log('[resize] end', type);
      };

      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('mouseup', cleanup, true);
      window.addEventListener('blur', cleanup);
      cleanupRef.current = cleanup;
    },
    [rootRef],
  );

  return { startResize };
}
