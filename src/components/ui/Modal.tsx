// src/components/ui/Modal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'stage';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isSidePanelContent?: boolean;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'w-[95vw] max-w-[400px]',
  md: 'w-[95vw] max-w-[640px]',
  lg: 'w-[95vw] max-w-[960px]',
  xl: 'w-[95vw] max-w-[1200px]',
  '2xl': 'w-[98vw] max-w-[1400px]',
  full: 'w-[98vw] max-w-[1600px]',
  stage: 'w-[98vw] h-[96vh] max-w-none max-h-none',
};

const ENTER_DURATION = 300;
const EXIT_DURATION = 250;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  isSidePanelContent = false,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animState, setAnimState] = useState<'enter' | 'exit' | null>(isOpen ? 'enter' : null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isOpen) {
      setShouldRender(true);
      setAnimState('enter');
      timeout = setTimeout(() => setAnimState(null), ENTER_DURATION);
    } else {
      if (shouldRender) {
        setAnimState('exit');
        timeout = setTimeout(() => {
          setShouldRender(false);
          setAnimState(null);
        }, EXIT_DURATION);
      }
    }
    return () => clearTimeout(timeout);
  }, [isOpen, shouldRender]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const modalSizeClass = isSidePanelContent
    ? 'w-[80vw] max-w-[1200px]'
    : sizeClasses[size];

  const heightClass = size === 'stage' ? '' : 'max-h-[90vh]';

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[9999] p-4
        ${animState === 'enter' ? 'animate-modal-overlay-in' : ''}
        ${animState === 'exit' ? 'animate-modal-overlay-out' : ''}
        ${animState === null && isOpen ? 'bg-black/50' : ''}
        ${animState === null && !isOpen ? 'bg-transparent' : ''}
      `}
      style={{ backgroundColor: isOpen ? 'rgba(0,0,0,0.5)' : 'transparent' }}
    >
      <div
        ref={modalRef}
        className={`bg-app-surface rounded-lg shadow-xl overflow-hidden flex flex-col
          ${modalSizeClass}
          ${heightClass}
          ${animState === 'enter' ? 'animate-modal-content-in' : ''}
          ${animState === 'exit' ? 'animate-modal-content-out' : ''}
        `}
      >
        <div className="flex justify-between items-center p-4 border-b border-app-border flex-shrink-0">
          <h2 className="text-xl font-semibold text-app-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-app-gray-light text-app-icon-color transition-none"
            style={{ transition: 'none' }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  // Use React Portal to break out of the video preview's stacking context
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};