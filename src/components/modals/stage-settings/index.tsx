// src/components/modals/stage-settings/index.tsx
import React, { useState, useCallback } from 'react';
import { StageStyle } from '../../../types/types';
import { Layers, Save, Settings, Monitor, X } from 'lucide-react';
import { Dropdown } from '../../ui/Dropdown';
import { ASPECT_RATIO_OPTIONS } from './constants';
import { LayerEditor } from './components/LayerEditor';
import { AddLayerButton } from './components/AddLayerButton';
import { LayerPreview } from './components/LayerPreview';
import { ColorInput } from './components/ColorInput';
import { useLayers } from './hooks/useLayers';
import { useDragAndDrop } from './hooks/useDragAndDrop';

interface StageSettingsContentProps {
  stageStyle: StageStyle;
  setStageStyle: (style: StageStyle) => void;
  onClose?: () => void;
}

export const StageSettingsContent: React.FC<StageSettingsContentProps> = ({
  stageStyle,
  setStageStyle,
  onClose
}) => {
  const {
    layers,
    updateLayer,
    addLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
  } = useLayers(stageStyle.layers || [
    { 
      id: 'base', 
      type: 'color', 
      content: '#1a1a1a', 
      opacity: 1, 
      blendMode: 'normal',
      visible: true,
      name: 'Background',
      locked: true
    }
  ]);
  
  const {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  } = useDragAndDrop(moveLayer);
  
  const [aspectRatio, setAspectRatio] = useState(stageStyle.aspectRatio || '16:9');
  const [customWidth, setCustomWidth] = useState(stageStyle.customWidth || 1920);
  const [customHeight, setCustomHeight] = useState(stageStyle.customHeight || 1080);
  const [showSafeArea, setShowSafeArea] = useState(stageStyle.showSafeArea || false);
  const [backgroundColor, setBackgroundColor] = useState(stageStyle.backgroundColor || '#000000');

  // Drawer state for display settings
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSave = useCallback(() => {
    setStageStyle({
      ...stageStyle,
      layers,
      aspectRatio,
      customWidth,
      customHeight,
      showSafeArea,
      backgroundColor,
    });
    
    onClose?.();
  }, [layers, aspectRatio, customWidth, customHeight, showSafeArea, backgroundColor, stageStyle, setStageStyle, onClose]);

  const getAspectRatioValue = (ratio: string): number => {
    const ratios: Record<string, number> = {
      '16:9': 16 / 9,
      '4:3': 4 / 3,
      '1:1': 1,
      '9:16': 9 / 16,
      '21:9': 21 / 9,
      '2.35:1': 2.35,
    };
    return ratios[ratio] || 16 / 9;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel - Layer List */}
        <div className="w-80 flex-shrink-0 border-r border-app-border bg-app-gray-dark/20 flex flex-col overflow-hidden">
          {/* Fixed Header */}
          <div className="flex-shrink-0 p-4 border-b border-app-border bg-app-surface z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-primary" />
                <h3 className="text-sm font-semibold text-app-text">Layers</h3>
                <span className="text-xs text-app-gray bg-app-gray-dark px-1.5 py-0.5 rounded">
                  {layers.length}
                </span>
              </div>
              <AddLayerButton onAddLayer={addLayer} />
            </div>
          </div>
          
          {/* Scrollable Layers Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {layers.map((layer, index) => (
                <LayerEditor
                  key={layer.id}
                  layer={layer}
                  index={index}
                  totalLayers={layers.length}
                  updateLayer={updateLayer}
                  removeLayer={removeLayer}
                  duplicateLayer={duplicateLayer}
                  moveLayer={moveLayer}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  isDragging={draggedIndex === index}
                  dragOverIndex={dragOverIndex}
                />
              ))}
            </div>
            
            {layers.length === 0 && (
              <div className="text-center py-12 text-app-gray">
                <Layers size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No layers</p>
                <p className="text-xs mt-1">Click + to add a layer</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Preview area with settings drawer toggle */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Top bar with stage title and drawer toggle button */}
          <div className="flex-shrink-0 p-4 border-b border-app-border bg-app-gray-dark/10 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-primary" />
              <h3 className="text-sm font-semibold text-app-text">Stage Preview</h3>
            </div>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-lg hover:bg-app-gray-light text-app-gray hover:text-app-text transition-all duration-200 flex items-center gap-1.5"
              title="Open display settings"
            >
              <Settings size={16} />
              <span className="text-xs font-medium hidden sm:inline">Settings</span>
            </button>
          </div>
          
          {/* Full‑size preview (big by default) */}
          <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-app-gray-dark/5">
            <LayerPreview
              layers={layers}
              backgroundColor={backgroundColor}
              aspectRatio={getAspectRatioValue(aspectRatio)}
              showSafeArea={showSafeArea}
            />
          </div>

          {/* Drawer sidebar (slides in from the right) */}
          <div
            className={`
              absolute top-0 right-0 h-full z-20 bg-app-surface border-l border-app-border
              transform transition-transform duration-300 ease-out
              w-80 shadow-2xl
              ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-app-border">
              <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
                <Settings size={16} className="text-primary" />
                Display Settings
              </h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-app-gray-light text-app-gray hover:text-app-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Aspect Ratio Section */}
              <div className="space-y-3">
                <Dropdown
                  id="aspect-ratio"
                  name="aspectRatio"
                  label="Aspect Ratio"
                  value={aspectRatio}
                  options={ASPECT_RATIO_OPTIONS}
                  onChange={(_, val) => setAspectRatio(val)}
                />
                
                {aspectRatio === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-medium text-app-gray mb-1 block">Width (px)</label>
                      <input
                        type="number"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-app-input-bg border border-app-border rounded-md text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary"
                        min={100}
                        max={3840}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-app-gray mb-1 block">Height (px)</label>
                      <input
                        type="number"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-app-input-bg border border-app-border rounded-md text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary"
                        min={100}
                        max={2160}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Background Color Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-app-text">Background</h4>
                <ColorInput
                  value={backgroundColor}
                  onChange={setBackgroundColor}
                  label="Background Color"
                />
                <p className="text-xs text-app-gray/70">Fallback color when no layers are visible</p>
              </div>

              {/* Safe Area Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-app-text">Safe Area Guide</h4>
                    <p className="text-xs text-app-gray/70 mt-0.5">Title & action safe zones</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={showSafeArea}
                      onChange={(e) => setShowSafeArea(e.target.checked)}
                    />
                    <div className="w-10 h-5 bg-app-gray-light rounded-full peer peer-checked:bg-primary transition-colors">
                      <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform ${showSafeArea ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {isDrawerOpen && (
            <div
              className="absolute inset-0 z-10 bg-black/10 "
              onClick={() => setIsDrawerOpen(false)}
            />
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex-shrink-0 border-t border-app-border p-4 flex items-center justify-end gap-3 bg-app-surface z-30">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-app-gray-light text-app-text hover:bg-app-gray transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-hover flex items-center gap-2 transition-colors text-sm font-medium"
        >
          <Save size={15} />
          Apply Changes
        </button>
      </div>
    </div>
  );
};

export default StageSettingsContent;

