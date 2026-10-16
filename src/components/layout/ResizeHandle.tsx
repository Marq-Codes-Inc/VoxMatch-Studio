// src/components/layout/ResizeHandle.tsx
import React from 'react';

interface ResizeHandleProps {
  orientation: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
}

const HIT_SIZE = 8;
const BAR_SIZE = 2;

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  orientation,
  onMouseDown,
  className = '',
}) => {
  const isH = orientation === 'horizontal';

  const wrapperStyle: React.CSSProperties = isH
    ? {
        height: HIT_SIZE,
        width: '100%',
        flexShrink: 0,
        cursor: 'row-resize',
        touchAction: 'none',
        position: 'relative',
        zIndex: 30,
      }
    : {
        width: HIT_SIZE,
        height: '100%',
        flexShrink: 0,
        cursor: 'col-resize',
        touchAction: 'none',
        position: 'relative',
        zIndex: 30,
      };

  const barStyle: React.CSSProperties = isH
    ? {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: BAR_SIZE,
        transform: 'translateY(-50%)',
        background: 'var(--app-border)',
        transition: 'background 120ms ease-out',
      }
    : {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: BAR_SIZE,
        transform: 'translateX(-50%)',
        background: 'var(--app-border)',
        transition: 'background 120ms ease-out',
      };

  const handleEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget.firstElementChild as HTMLElement | null;
    if (bar) bar.style.background = 'var(--primary)';
  };

  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget.firstElementChild as HTMLElement | null;
    if (bar) bar.style.background = 'var(--app-border)';
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      onMouseDown={onMouseDown}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={className}
      style={wrapperStyle}
    >
      <div style={barStyle} />
    </div>
  );
};