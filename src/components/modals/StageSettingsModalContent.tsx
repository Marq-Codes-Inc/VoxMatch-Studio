// src/components/modals/StageSettingsModalContent.tsx
import React, { useState, useCallback } from 'react';
import { StageStyle } from '../../types/types';
import { Layers, Save, Check, Settings, Monitor } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import { ASPECT_RATIO_OPTIONS } from './stage-settings/constants';
import { LayerEditor } from './stage-settings/components/LayerEditor';
import { AddLayerButton } from './stage-settings/components/AddLayerButton';
import { LayerPreview } from './stage-settings/components/LayerPreview';
import { ColorInput } from './stage-settings/components/ColorInput';
import { useLayers } from './stage-settings/hooks/useLayers';
import { useDragAndDrop } from './stage-settings/hooks/useDragAndDrop';

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
      locked: true  // Background layer is locked by default
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
  const [showSuccess, setShowSuccess] = useState(false);

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
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  }, [layers, aspectRatio, customWidth, customHeight, showSafeArea, backgroundColor, stageStyle, setStageStyle]);

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
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel - Layer List */}
        <div className="w-80 flex-shrink-0 border-r border-app-border bg-app-gray-dark/20 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b border-app-border">
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
        
        {/* Right Panel - Stage Settings */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b border-app-border bg-app-gray-dark/10">
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-primary" />
              <h3 className="text-sm font-semibold text-app-text">Stage Configuration</h3>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Stage Preview */}
              <LayerPreview
                layers={layers}
                backgroundColor={backgroundColor}
                aspectRatio={getAspectRatioValue(aspectRatio)}
                showSafeArea={showSafeArea}
              />
              
              {/* Settings Sections */}
              <div className="space-y-4">
                {/* Aspect Ratio Section */}
                <div className="bg-app-gray-dark/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-1">
                    <Settings size={14} className="text-app-gray" />
                    <h4 className="text-sm font-medium text-app-text">Display Settings</h4>
                  </div>
                  
                  <Dropdown
                    id="aspect-ratio"
                    name="aspectRatio"
                    label="Aspect Ratio"
                    value={aspectRatio}
                    options={ASPECT_RATIO_OPTIONS}
                    onChange={(_, val) => setAspectRatio(val)}
                  />
                  
                  {aspectRatio === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
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
                <div className="bg-app-gray-dark/30 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-app-text">Background</h4>
                  <ColorInput
                    value={backgroundColor}
                    onChange={setBackgroundColor}
                    label="Background Color"
                  />
                  <p className="text-xs text-app-gray/70">Fallback color when no layers are visible</p>
                </div>

                {/* Safe Area Section */}
                <div className="bg-app-gray-dark/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-app-text">Safe Area Guide</h4>
                      <p className="text-xs text-app-gray/70 mt-0.5">Display title and action safe zones</p>
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
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex-shrink-0 border-t border-app-border p-4 flex items-center justify-end gap-3 bg-app-gray-dark/5">
        {showSuccess && (
          <div className="flex items-center gap-2 text-green-500 text-sm animate-pulse">
            <Check size={16} />
            Settings applied successfully!
          </div>
        )}
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