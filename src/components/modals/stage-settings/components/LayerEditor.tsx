// LayerEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  GripVertical, Eye, EyeOff, Copy, Trash2, 
  ChevronDown, ChevronRight, Lock, Unlock, Upload, Move
} from 'lucide-react';
import { LayerEditorProps } from '../types';
import { CustomSlider } from './CustomSlider';
import { ColorInput } from './ColorInput';
import { GradientEditor } from './GradientEditor';
import { Dropdown } from '../../../ui/Dropdown';
import { LAYER_TYPE_OPTIONS, BLEND_MODE_OPTIONS, FIT_MODE_OPTIONS } from '../constants';

export const LayerEditor: React.FC<LayerEditorProps> = ({ 
  layer, index, totalLayers, updateLayer, removeLayer, duplicateLayer, moveLayer,
  onDragStart, onDragOver, onDragEnd, onDrop, isDragging, dragOverIndex
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateLayer(layer.id, { 
          content: event.target?.result as string,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const isBaseLayer = index === 0;

  return (
    <div 
      draggable={!isBaseLayer && !isExpanded}
      onDragStart={(e) => !isBaseLayer && !isExpanded && onDragStart(e, index)}
      onDragOver={(e) => !isBaseLayer && onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => !isBaseLayer && onDrop(e, index)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        bg-app-gray-dark/40 rounded-xl border
        transition-all duration-200 ease-out
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${isHovered && !isDragging ? 'bg-app-gray-dark/50 shadow-lg' : ''}
        ${dragOverIndex === index ? 'border-primary border-2 shadow-xl scale-[1.02]' : 'border-app-border'}
        overflow-hidden
      `}
    >
      {/* Layer Header */}
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-app-gray hover:text-app-text transition-all duration-200 hover:bg-app-gray-light/50 rounded"
        >
          <ChevronDown 
            size={16} 
            className={`transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
          />
        </button>
        
        {!isBaseLayer && !isExpanded && (
          <div 
            className="cursor-grab active:cursor-grabbing text-app-gray hover:text-app-text transition-colors p-1 hover:bg-app-gray-light/30 rounded"
          >
            <GripVertical size={16} />
          </div>
        )}
        
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={layer.name || `Layer ${index + 1}`}
              onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
              className="w-full bg-transparent text-sm font-medium text-app-text focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1.5 py-0.5 -ml-1.5 transition-all"
              placeholder={`Layer ${index + 1}`}
            />
          </div>
          
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => updateLayer(layer.id, { visible: !(layer.visible ?? true) })}
              className={`
                p-1.5 rounded-lg transition-all duration-200
                ${layer.visible ?? true 
                  ? 'hover:bg-app-gray-light text-app-icon-color' 
                  : 'bg-app-gray-dark/50 text-app-gray'
                }
              `}
              title={layer.visible ?? true ? 'Hide Layer' : 'Show Layer'}
            >
              {(layer.visible ?? true) ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            
            <button
              onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
              className={`
                p-1.5 rounded-lg transition-all duration-200
                ${layer.locked 
                  ? 'bg-primary/20 text-primary' 
                  : 'hover:bg-app-gray-light text-app-icon-color'
                }
              `}
              title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
            >
              {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            
            <button
              onClick={() => duplicateLayer(layer)}
              className="p-1.5 rounded-lg hover:bg-app-gray-light text-app-icon-color transition-all duration-200 hover:scale-105"
              title="Duplicate Layer"
            >
              <Copy size={14} />
            </button>
            
            {!isBaseLayer && (
              <button
                onClick={() => removeLayer(layer.id)}
                className="p-1.5 rounded-lg hover:bg-danger/20 text-app-icon-color hover:text-danger transition-all duration-200"
                title="Delete Layer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Layer Content */}
      <div
        ref={contentRef}
        className={`
          transition-all duration-300 ease-out
          ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}
          overflow-hidden
        `}
      >
        <div className="p-4 space-y-4 border-t border-app-border bg-app-gray-dark/20">
          {/* Layer Type */}
          <Dropdown
            id={`layer-type-${layer.id}`}
            name="layerType"
            label="Type"
            value={layer.type}
            options={LAYER_TYPE_OPTIONS}
            onChange={(_, val) => updateLayer(layer.id, { 
              type: val as 'color' | 'gradient' | 'image' | 'video'
            })}
            disabled={isBaseLayer}
          />
          
          {/* Type-specific content */}
          <div className="transition-all duration-200">
            {layer.type === 'color' && (
              <ColorInput
                value={layer.content || '#000000'}
                onChange={(val) => updateLayer(layer.id, { content: val })}
                label="Color"
              />
            )}
            
            {layer.type === 'gradient' && (
              <GradientEditor layer={layer} updateLayer={updateLayer} />
            )}
            
            {(layer.type === 'image' || layer.type === 'video') && (
              <div className="space-y-3">
                {layer.content ? (
                  <div className="relative group rounded-lg overflow-hidden">
                    {layer.type === 'image' ? (
                      <img 
                        src={layer.content} 
                        alt="Preview" 
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <video 
                        src={layer.content} 
                        className="w-full h-28 object-cover"
                        controls
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <button
                        onClick={() => updateLayer(layer.id, { content: '' })}
                        className="p-2 bg-danger/90 rounded-lg hover:bg-danger transition-colors"
                      >
                        <Trash2 size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-app-border rounded-xl text-app-gray hover:border-primary hover:text-primary transition-all duration-200 hover:bg-primary/5"
                  >
                    <Upload className="mx-auto mb-2" size={20} />
                    <span className="text-sm">Upload {layer.type}</span>
                  </button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={layer.type === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Dropdown
                  id={`fit-mode-${layer.id}`}
                  name="fitMode"
                  label="Fit Mode"
                  value={layer.fit || 'cover'}
                  options={FIT_MODE_OPTIONS}
                  onChange={(_, val) => updateLayer(layer.id, { fit: val as 'cover' | 'contain' | 'fill' | 'none' })}
                />
              </div>
            )}
          </div>
          
          {/* Blend Mode & Opacity */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Dropdown
              id={`blend-mode-${layer.id}`}
              name="blendMode"
              label="Blend Mode"
              value={layer.blendMode || 'normal'}
              options={BLEND_MODE_OPTIONS}
              onChange={(_, val) => updateLayer(layer.id, { blendMode: val })}
            />
            <CustomSlider
              label="Opacity"
              value={(layer.opacity ?? 1) * 100}
              min={0}
              max={100}
              suffix="%"
              onChange={(val) => updateLayer(layer.id, { opacity: val / 100 })}
            />
          </div>
          
          {/* Transform Controls */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-2 pb-1">
              <Move size={14} className="text-app-gray" />
              <span className="text-xs font-medium text-app-gray uppercase tracking-wide">Transform</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CustomSlider
                label="X"
                value={layer.x || 0}
                min={-100}
                max={100}
                suffix="%"
                onChange={(val) => updateLayer(layer.id, { x: val })}
              />
              <CustomSlider
                label="Y"
                value={layer.y || 0}
                min={-100}
                max={100}
                suffix="%"
                onChange={(val) => updateLayer(layer.id, { y: val })}
              />
              <CustomSlider
                label="Scale"
                value={(layer.scale || 1) * 100}
                min={10}
                max={300}
                suffix="%"
                onChange={(val) => updateLayer(layer.id, { scale: val / 100 })}
              />
              <CustomSlider
                label="Rotate"
                value={layer.rotation || 0}
                min={-180}
                max={180}
                suffix="°"
                onChange={(val) => updateLayer(layer.id, { rotation: val })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

