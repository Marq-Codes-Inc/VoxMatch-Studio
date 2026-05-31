import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  id: string;
  name: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string; icon?: string }>;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  id,
  name,
  label,
  value,
  options,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.dropdown-portal-list')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-app-gray">
        {label}
      </label>
      <div className="relative w-full">
        <button
          ref={buttonRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between px-3 py-2 bg-app-input-bg border border-app-border rounded-lg text-app-text text-sm
            focus:outline-none
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-app-border-light'}
            transition-colors`}
        >
          <span className="truncate">
            {selectedOption?.label || (options.length > 0 ? options[0].label : 'Select')}
          </span>
          <ChevronDown
            size={16}
            className={`text-app-gray ml-2 flex-shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen &&
          createPortal(
            <div
              className="dropdown-portal-list fixed z-[9999] bg-app-surface border border-app-border rounded-lg shadow-xl overflow-hidden"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
            >
              <div className="max-h-60 overflow-y-auto">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(name, option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-app-gray-light ${
                      value === option.value ? 'bg-primary text-white' : 'text-app-text'
                    }`}
                  >
                    {option.icon && <span className="mr-2">{option.icon}</span>}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
};