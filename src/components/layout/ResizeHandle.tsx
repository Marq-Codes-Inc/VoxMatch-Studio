// src/components/layout/ResizeHandle.tsx
import React from 'react';

interface ResizeHandleProps {
  orientation: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  orientation,
  onMouseDown,
  className = '',
}) => {
  const baseClasses = 'bg-app-border hover:bg-primary flex-shrink-0 transition-colors duration-150';
  const cursorClass = orientation === 'horizontal' ? 'cursor-row-resize' : 'cursor-col-resize';
  const sizeClass = orientation === 'horizontal' ? 'h-1.5 w-full' : 'w-1.5 h-full';

  return (
    <div
      className={`${baseClasses} ${cursorClass} ${sizeClass} ${className}`}
      onMouseDown={onMouseDown}
    />
  );
};