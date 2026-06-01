// src/components/modals/SettingsModalContent.tsx
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings } from '../../types/types';
import { ChevronDown, FolderOpen } from 'lucide-react';

interface SettingsModalContentProps {
  settings: AppSettings;
  handleSettingChange: (name: string, value: string | boolean | number | any) => void;
  activeSection: string;
}

// Custom Dropdown Component
const CustomDropdown = ({ 
  value, 
  options, 
  onChange,
  placeholder 
}: { 
  value: string; 
  options: { label: string; value: string }[]; 
  onChange: (val: string) => void;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-app-input-bg border border-app-border rounded-md text-app-text text-sm hover:border-app-border-light transition-none"
        style={{ transition: 'none' }}
      >
        <span className="truncate">{selectedOption?.label || placeholder || 'Select'}</span>
        <ChevronDown size={16} className={`text-app-gray ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} style={{ transition: 'none' }} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-app-surface border border-app-border rounded-md shadow-xl overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-sm text-left hover:bg-app-gray-light transition-none ${
                value === option.value ? 'bg-primary text-white' : 'text-app-text'
              }`}
              style={{ transition: 'none' }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Custom Slider Component
const CustomSlider = ({ 
  value, 
  min, 
  max, 
  step = 1, 
  onChange,
  unit = ''
}: { 
  value: number; 
  min: number; 
  max: number; 
  step?: number; 
  onChange: (val: number) => void;
  unit?: string;
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValue(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateValue = (e: React.MouseEvent | MouseEvent) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const newValue = min + percent * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, steppedValue)));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="relative w-full">
      <div 
        ref={sliderRef}
        className="relative w-full h-6 flex items-center cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        {/* Track background */}
        <div className="absolute w-full h-2 bg-app-gray-dark rounded-full">
          {/* Filled track */}
          <div 
            className="absolute h-full bg-primary rounded-full"
            style={{ width: `${percentage}%`, transition: 'none' }}
          />
        </div>
        
        {/* Slider thumb */}
        <div 
          className="absolute w-5 h-5 bg-white rounded-full shadow-lg border-2 border-primary"
          style={{ 
            left: `calc(${percentage}% - 10px)`,
            transition: 'none',
            cursor: 'grab'
          }}
        />
        
        {/* Hidden input for accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ transition: 'none' }}
        />
      </div>
      
      {/* Value display */}
      <div className="flex justify-end mt-1">
        <span className="text-sm text-app-gray">
          {value}{unit}
        </span>
      </div>
    </div>
  );
};

// Custom Toggle Switch
const ToggleSwitch = ({ 
  checked, 
  onChange,
  label
}: { 
  checked: boolean; 
  onChange: (val: boolean) => void;
  label?: string;
}) => {
  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div 
          className={`w-11 h-6 rounded-full transition-none ${
            checked ? 'bg-primary' : 'bg-app-gray-light'
          }`}
          style={{ transition: 'none' }}
        >
          <div 
            className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-none ${
              checked ? 'left-6' : 'left-0.5'
            }`}
            style={{ transition: 'none' }}
          />
        </div>
      </div>
      {label && <span className="ml-3 text-sm text-app-text">{label}</span>}
    </label>
  );
};

export const SettingsModalContent: React.FC<SettingsModalContentProps> = ({
  settings,
  handleSettingChange,
  activeSection
}) => {
  // State for local settings
  const [saveLocation, setSaveLocation] = useState('C:/Users/MARQ/Documents/VoxMatch autosave');
  const [autoSaveFrequency, setAutoSaveFrequency] = useState(2);
  const [checkUpdates, setCheckUpdates] = useState(true);

  const updateTiming = (key: string, value: number) => {
    handleSettingChange('timing', {
      ...settings.timing,
      [key]: value
    });
  };

  const handleBrowseFolder = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile({
        properties: ['openDirectory'],
        title: 'Select Save Location'
      });
      if (!result.canceled && result.filePaths?.[0]) {
        setSaveLocation(result.filePaths[0]);
      }
    }
  };

  switch (activeSection) {
    case 'general':
      return (
        <div className="space-y-6 p-4">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Application Theme
            </label>
            <CustomDropdown
              value={settings.theme || 'dark'}
              options={[
                { label: 'System', value: 'system' },
                { label: 'Dark', value: 'dark' },
                { label: 'Light', value: 'light' }
              ]}
              onChange={(val) => handleSettingChange('theme', val)}
            />
          </div>

          {/* Primary Accent Color */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Primary Accent Color
            </label>
            <div className="flex items-center gap-4">
              {['#046466', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'].map(color => (
                <button
                  key={color}
                  onClick={() => handleSettingChange('primaryColor', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-none ${
                    settings.primaryColor === color ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color, transition: 'none' }}
                />
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Language
            </label>
            <CustomDropdown
              value="en-US"
              options={[
                { label: 'English (US)', value: 'en-US' },
                { label: 'English (UK)', value: 'en-GB' },
                { label: 'Spanish', value: 'es-ES' },
                { label: 'French', value: 'fr-FR' },
                { label: 'German', value: 'de-DE' },
                { label: 'Japanese', value: 'ja-JP' },
                { label: 'Chinese (Simplified)', value: 'zh-CN' }
              ]}
              onChange={(val) => console.log('Language changed:', val)}
            />
          </div>

          {/* Default Save Location */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Default Save Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveLocation}
                onChange={(e) => setSaveLocation(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-app-input-bg border border-app-border rounded-md text-app-text text-sm focus:border-primary outline-none transition-none"
                style={{ transition: 'none' }}
                placeholder="C:/Users/MARQ/Documents/VoxMatch autosave"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="px-4 py-2.5 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center gap-2 transition-none"
                style={{ transition: 'none' }}
              >
                <FolderOpen size={18} />
                Browse
              </button>
            </div>
          </div>

          {/* Auto-Save Settings */}
          <div className="pt-4 border-t border-app-border">
            <h3 className="text-sm font-medium text-app-text mb-4">Auto-Save Project</h3>
            
            <div className="space-y-4">
              <ToggleSwitch
                checked={settings.autoSave || false}
                onChange={(val) => handleSettingChange('autoSave', val)}
                label="Enable Auto-Save"
              />

              <div>
                <label className="block text-sm font-medium text-app-text-secondary mb-2">
                  Frequency (min)
                </label>
                <CustomSlider
                  value={autoSaveFrequency}
                  min={1}
                  max={30}
                  step={1}
                  onChange={setAutoSaveFrequency}
                  unit=" min"
                />
              </div>
            </div>
          </div>

          {/* Update Settings */}
          <div className="pt-4 border-t border-app-border">
            <h3 className="text-sm font-medium text-app-text mb-4">Check for Updates</h3>
            <ToggleSwitch
              checked={checkUpdates}
              onChange={setCheckUpdates}
              label="Auto (with offline-safe toggle)"
            />
          </div>
        </div>
      );

    case 'audio-video':
      return (
        <div className="space-y-6 p-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Audio Output Device
            </label>
            <CustomDropdown
              value="default"
              options={[
                { label: 'System Default', value: 'default' },
                { label: 'Speakers', value: 'speakers' },
                { label: 'Headphones', value: 'headphones' }
              ]}
              onChange={(val) => console.log('Audio device:', val)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Video Quality
            </label>
            <CustomDropdown
              value="high"
              options={[
                { label: 'Low (480p)', value: 'low' },
                { label: 'Medium (720p)', value: 'medium' },
                { label: 'High (1080p)', value: 'high' },
                { label: 'Ultra (4K)', value: 'ultra' }
              ]}
              onChange={(val) => console.log('Video quality:', val)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Waveform Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={settings.waveformColor || '#046466'}
                onChange={(e) => handleSettingChange('waveformColor', e.target.value)}
                className="w-12 h-12 rounded-md border-2 border-app-border bg-transparent cursor-pointer p-1 transition-none"
                style={{ transition: 'none' }}
              />
              <span className="text-sm text-app-gray uppercase">
                {settings.waveformColor || '#046466'}
              </span>
            </div>
          </div>
        </div>
      );

    case 'lyrics-subtitles':
      return (
        <div className="space-y-6 p-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Default Subtitle Language
            </label>
            <CustomDropdown
              value="en-US"
              options={[
                { label: 'English (US)', value: 'en-US' },
                { label: 'English (UK)', value: 'en-GB' },
                { label: 'Spanish', value: 'es-ES' },
                { label: 'French', value: 'fr-FR' },
                { label: 'German', value: 'de-DE' },
                { label: 'Japanese', value: 'ja-JP' }
              ]}
              onChange={(val) => console.log('Subtitle language:', val)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Reading Speed
            </label>
            <CustomDropdown
              value={settings.defaultReadingSpeed || 'normal'}
              options={[
                { label: 'Slow', value: 'slow' },
                { label: 'Normal', value: 'normal' },
                { label: 'Fast', value: 'fast' }
              ]}
              onChange={(val) => handleSettingChange('defaultReadingSpeed', val)}
            />
          </div>

          <div className="pt-4 border-t border-app-border">
            <h3 className="text-sm font-medium text-app-text mb-4">Timing Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text-secondary mb-2">
                  Base Duration Per Character (seconds)
                </label>
                <CustomSlider
                  value={settings.timing?.baseDurationPerChar || 0.08}
                  min={0.02}
                  max={0.2}
                  step={0.01}
                  onChange={(val) => updateTiming('baseDurationPerChar', val)}
                  unit="s"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-secondary mb-2">
                  Minimum Clip Duration (seconds)
                </label>
                <CustomSlider
                  value={settings.timing?.minClipDuration || 1.0}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  onChange={(val) => updateTiming('minClipDuration', val)}
                  unit="s"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-secondary mb-2">
                  Maximum Clip Duration (seconds)
                </label>
                <CustomSlider
                  value={settings.timing?.maxClipDuration || 5.0}
                  min={2.0}
                  max={10.0}
                  step={0.5}
                  onChange={(val) => updateTiming('maxClipDuration', val)}
                  unit="s"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-secondary mb-2">
                  Pause Between Clips (seconds)
                </label>
                <CustomSlider
                  value={settings.timing?.pauseBetweenClips || 0.2}
                  min={0}
                  max={1.0}
                  step={0.05}
                  onChange={(val) => updateTiming('pauseBetweenClips', val)}
                  unit="s"
                />
              </div>
            </div>
          </div>
        </div>
      );

    case 'shortcuts':
      const shortcuts = [
        { action: 'Play / Pause', keys: ['Space'] },
        { action: 'Save Project', keys: ['Ctrl', 'S'] },
        { action: 'Save As', keys: ['Ctrl', 'Shift', 'S'] },
        { action: 'Undo', keys: ['Ctrl', 'Z'] },
        { action: 'Redo', keys: ['Ctrl', 'Y'] },
        { action: 'Cut', keys: ['Ctrl', 'X'] },
        { action: 'Copy', keys: ['Ctrl', 'C'] },
        { action: 'Paste', keys: ['Ctrl', 'V'] },
        { action: 'Select All', keys: ['Ctrl', 'A'] },
        { action: 'Find', keys: ['Ctrl', 'F'] },
        { action: 'New Project', keys: ['Ctrl', 'N'] },
        { action: 'Export', keys: ['Ctrl', 'E'] },
        { action: 'Toggle Fullscreen', keys: ['F11'] },
        { action: 'Zoom In', keys: ['Ctrl', '+'] },
        { action: 'Zoom Out', keys: ['Ctrl', '-'] },
        { action: 'Reset Zoom', keys: ['Ctrl', '0'] },
        { action: 'Seek Forward 5s', keys: ['→'] },
        { action: 'Seek Backward 5s', keys: ['←'] },
        { action: 'Next Clip', keys: ['↓'] },
        { action: 'Previous Clip', keys: ['↑'] },
        { action: 'Delete Selected', keys: ['Delete'] },
        { action: 'Split Clip at Playhead', keys: ['S'] }
      ];

      return (
        <div className="p-4">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search shortcuts..."
              className="w-full px-4 py-2.5 bg-app-input-bg border border-app-border rounded-md text-app-text text-sm focus:border-primary outline-none transition-none"
              style={{ transition: 'none' }}
            />
          </div>
          
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {shortcuts.map((shortcut, index) => (
              <div 
                key={index}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-app-gray-light rounded-md transition-none"
                style={{ transition: 'none' }}
              >
                <span className="text-sm text-app-text">{shortcut.action}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <React.Fragment key={keyIndex}>
                      <kbd className="px-2 py-1 bg-app-gray-dark border border-app-border rounded text-xs font-mono text-primary">
                        {key}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="text-app-gray text-xs">+</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
};

