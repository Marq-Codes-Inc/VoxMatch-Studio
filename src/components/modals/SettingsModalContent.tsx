// src/components/modals/SettingsModalContent.tsx
import React, { useEffect, useState } from 'react';
import { AppSettings } from '../../types/types';
import { FolderOpen } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import { Slider } from '../ui/Slider';
import { Checkbox } from '../ui/Checkbox';

interface SettingsModalContentProps {
  settings: AppSettings;
  handleSettingChange: (name: string, value: string | boolean | number | any) => void;
  activeSection: string;
}

const THEME_OPTIONS = [
  { label: 'System', value: 'system' },
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
];

const ACCENT_COLORS = [
  '#046466',
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
];

const LANGUAGE_OPTIONS = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'English (UK)', value: 'en-GB' },
  { label: 'Spanish (Spain)', value: 'es-ES' },
  { label: 'Spanish (Mexico)', value: 'es-MX' },
  { label: 'French', value: 'fr-FR' },
  { label: 'German', value: 'de-DE' },
  { label: 'Japanese', value: 'ja-JP' },
  { label: 'Korean', value: 'ko-KR' },
  { label: 'Chinese (Simplified)', value: 'zh-CN' },
];

const READING_SPEED_OPTIONS = [
  { label: 'Slow', value: 'slow' },
  { label: 'Normal', value: 'normal' },
  { label: 'Fast', value: 'fast' },
];

const SHORTCUTS: { action: string; keys: string[] }[] = [
  { action: 'Play / Pause', keys: ['Space'] },
  { action: 'Save Project', keys: ['Ctrl', 'S'] },
  { action: 'Save As', keys: ['Ctrl', 'Shift', 'S'] },
  { action: 'Undo', keys: ['Ctrl', 'Z'] },
  { action: 'Redo', keys: ['Ctrl', 'Shift', 'Z'] },
  { action: 'Redo (alt)', keys: ['Ctrl', 'Y'] },
  { action: 'Copy Clip', keys: ['Ctrl', 'C'] },
  { action: 'Paste Clip', keys: ['Ctrl', 'V'] },
  { action: 'New Clip', keys: ['Ctrl', 'N'] },
  { action: 'Delete Selected', keys: ['Delete'] },
  { action: 'Focus Clip Text', keys: ['T'] },
];

export const SettingsModalContent: React.FC<SettingsModalContentProps> = ({
  settings,
  handleSettingChange,
  activeSection,
}) => {
  const [saveLocation, setSaveLocation] = useState('');
  const [autoSaveFrequency, setAutoSaveFrequency] = useState(
    settings.autoSaveFrequency ?? 2,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const docs = await window.electronAPI?.getPath?.('documents');
        if (!cancelled && typeof docs === 'string') {
          setSaveLocation(docs);
        }
      } catch {
        /* no-op */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof settings.autoSaveFrequency === 'number') {
      setAutoSaveFrequency(settings.autoSaveFrequency);
    }
  }, [settings.autoSaveFrequency]);

  const updateTiming = (key: keyof AppSettings['timing'], value: number) => {
    handleSettingChange('timing', {
      ...settings.timing,
      [key]: value,
    });
  };

  const handleBrowseFolder = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFile({
      properties: ['openDirectory'],
      title: 'Select Save Location',
    });
    if (!result.canceled && result.filePaths?.[0]) {
      setSaveLocation(result.filePaths[0]);
    }
  };

  switch (activeSection) {
    case 'general':
      return (
        <div className="space-y-6 p-4">
          <Dropdown
            id="settings-theme"
            name="theme"
            label="Application Theme"
            value={settings.theme || 'dark'}
            options={THEME_OPTIONS}
            onChange={(_, value) => handleSettingChange('theme', value)}
          />

          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Primary Accent Color
            </label>
            <div className="flex items-center gap-4">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleSettingChange('primaryColor', color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    settings.primaryColor === color
                      ? 'border-white'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Set accent to ${color}`}
                />
              ))}
            </div>
          </div>

          <Dropdown
            id="settings-language"
            name="language"
            label="Language"
            value="en-US"
            options={LANGUAGE_OPTIONS}
            onChange={() => {
              /* not yet wired */
            }}
          />

          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Default Save Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveLocation}
                onChange={(e) => setSaveLocation(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-app-input-bg border border-app-border rounded-md text-app-text text-sm focus:border-primary outline-none"
                placeholder="Choose a folder…"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="px-4 py-2.5 bg-app-gray-light text-app-text rounded-md hover:bg-app-gray flex items-center gap-2"
              >
                <FolderOpen size={18} />
                Browse
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-app-border">
            <h3 className="text-sm font-medium text-app-text mb-4">
              Auto-Save Project
            </h3>

            <div className="space-y-4">
              <Checkbox
                label="Enable Auto-Save"
                checked={settings.autoSave || false}
                onChange={(val) => handleSettingChange('autoSave', val)}
              />

              <Slider
                label="Frequency (min)"
                value={autoSaveFrequency}
                min={1}
                max={30}
                step={1}
                suffix=" min"
                onChange={(val) => {
                  setAutoSaveFrequency(val);
                  handleSettingChange('autoSaveFrequency', val);
                }}
              />
            </div>
          </div>
        </div>
      );

    case 'audio-video':
      return (
        <div className="space-y-6 p-4">
          <Dropdown
            id="audio-output-device"
            name="audioOutputDevice"
            label="Audio Output Device"
            value="default"
            options={[
              { label: 'System Default', value: 'default' },
              { label: 'Speakers', value: 'speakers' },
              { label: 'Headphones', value: 'headphones' },
            ]}
            onChange={() => {
              /* not yet wired */
            }}
          />

          <Dropdown
            id="video-quality"
            name="videoQuality"
            label="Video Quality"
            value="high"
            options={[
              { label: 'Low (480p)', value: 'low' },
              { label: 'Medium (720p)', value: 'medium' },
              { label: 'High (1080p)', value: 'high' },
              { label: 'Ultra (4K)', value: 'ultra' },
            ]}
            onChange={() => {
              /* not yet wired */
            }}
          />

          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Waveform Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={settings.waveformColor || '#046466'}
                onChange={(e) =>
                  handleSettingChange('waveformColor', e.target.value)
                }
                className="w-12 h-12 rounded-md border-2 border-app-border bg-transparent cursor-pointer p-1"
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
          <Dropdown
            id="default-subtitle-language"
            name="defaultSubtitleLanguage"
            label="Default Subtitle Language"
            value={settings.defaultSubtitleLanguage || 'en-US'}
            options={LANGUAGE_OPTIONS}
            onChange={(_, value) =>
              handleSettingChange('defaultSubtitleLanguage', value)
            }
          />

          <Dropdown
            id="reading-speed"
            name="defaultReadingSpeed"
            label="Reading Speed"
            value={settings.defaultReadingSpeed || 'normal'}
            options={READING_SPEED_OPTIONS}
            onChange={(_, value) =>
              handleSettingChange('defaultReadingSpeed', value)
            }
          />

          <div className="pt-4 border-t border-app-border">
            <h3 className="text-sm font-medium text-app-text mb-4">
              Timing Settings
            </h3>

            <div className="space-y-4">
              <Slider
                label="Base Duration Per Character"
                value={settings.timing?.baseDurationPerChar ?? 0.08}
                min={0.02}
                max={0.2}
                step={0.01}
                suffix="s"
                onChange={(val) => updateTiming('baseDurationPerChar', val)}
              />

              <Slider
                label="Minimum Clip Duration"
                value={settings.timing?.minClipDuration ?? 1.0}
                min={0.5}
                max={3.0}
                step={0.1}
                suffix="s"
                onChange={(val) => updateTiming('minClipDuration', val)}
              />

              <Slider
                label="Maximum Clip Duration"
                value={settings.timing?.maxClipDuration ?? 5.0}
                min={2.0}
                max={10.0}
                step={0.5}
                suffix="s"
                onChange={(val) => updateTiming('maxClipDuration', val)}
              />

              <Slider
                label="Pause Between Clips"
                value={settings.timing?.pauseBetweenClips ?? 0.2}
                min={0}
                max={1.0}
                step={0.05}
                suffix="s"
                onChange={(val) => updateTiming('pauseBetweenClips', val)}
              />
            </div>
          </div>
        </div>
      );

    case 'shortcuts':
      return (
        <div className="p-4">
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.action}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-app-gray-light rounded-md"
              >
                <span className="text-sm text-app-text">{shortcut.action}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <React.Fragment key={i}>
                      <kbd className="px-2 py-1 bg-app-gray-dark border border-app-border rounded text-xs font-mono text-primary">
                        {key}
                      </kbd>
                      {i < shortcut.keys.length - 1 && (
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
