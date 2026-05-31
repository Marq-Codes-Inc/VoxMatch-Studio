// AddLayerButton.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Palette, Image, Video } from 'lucide-react';
import { LAYER_TYPE_OPTIONS } from '../constants';

interface AddLayerButtonProps {
  onAddLayer: (type: 'color' | 'gradient' | 'image' | 'video') => void;
}

export const AddLayerButton: React.FC<AddLayerButtonProps> = ({ onAddLayer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (type: 'color' | 'gradient' | 'image' | 'video') => {
    onAddLayer(type);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'color': return <Palette size={16} />;
      case 'gradient': return <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 to-pink-500" />;
      case 'image': return <Image size={16} />;
      case 'video': return <Video size={16} />;
      default: return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center
          bg-primary text-white
          hover:bg-primary-hover hover:scale-105
          active:scale-95
          transition-all duration-200 ease-out
          ${isOpen ? 'rotate-90 bg-primary-hover' : 'rotate-0'}
        `}
      >
        {isOpen ? <X size={16} className="transition-transform duration-200" /> : <Plus size={16} className="transition-transform duration-200" />}
      </button>
      
      <div
        className={`
          absolute right-0 top-full mt-2
          bg-app-surface border border-app-border rounded-lg shadow-xl
          min-w-[180px] z-50
          transform origin-top-right
          transition-all duration-200 ease-out
          ${isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }
        `}
      >
        <div className="py-1">
          {LAYER_TYPE_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value as any)}
              className={`
                w-full px-4 py-2.5 text-sm text-left
                hover:bg-app-gray-light 
                flex items-center gap-3
                transition-all duration-150
                animate-slide-in
              `}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <span className="text-app-gray transition-transform duration-200 group-hover:scale-110">
                {getIcon(option.value)}
              </span>
              <span className="text-app-text font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
