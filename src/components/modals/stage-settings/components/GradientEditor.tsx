// GradientEditor.tsx
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { GradientEditorProps } from '../types';
import { CustomSlider } from './CustomSlider';
import { Dropdown } from '../../../ui/Dropdown';
import { GRADIENT_TYPE_OPTIONS } from '../constants';

export const GradientEditor: React.FC<GradientEditorProps> = ({ layer, updateLayer }) => {
  const gradient = layer.gradient || {
    type: 'linear' as const,
    angle: 90,
    stops: [
      { color: '#000000', position: 0 },
      { color: '#ffffff', position: 100 }
    ]
  };

  const addStop = () => {
    const stops = [...gradient.stops];
    let position = 50;
    for (let i = 0; i < stops.length - 1; i++) {
      if (stops[i + 1].position - stops[i].position > 20) {
        position = (stops[i].position + stops[i + 1].position) / 2;
        break;
      }
    }
    stops.push({ color: '#808080', position });
    stops.sort((a, b) => a.position - b.position);
    updateLayer(layer.id, { gradient: { ...gradient, stops } });
  };

  const updateStop = (index: number, updates: Partial<{ color: string; position: number }>) => {
    const stops = gradient.stops.map((stop, i) => 
      i === index ? { ...stop, ...updates } : stop
    );
    updateLayer(layer.id, { gradient: { ...gradient, stops } });
  };

  const removeStop = (index: number) => {
    if (gradient.stops.length <= 2) return;
    const stops = gradient.stops.filter((_, i) => i !== index);
    updateLayer(layer.id, { gradient: { ...gradient, stops } });
  };

  const gradientPreview = () => {
    const stopString = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');
    if (gradient.type === 'linear') {
      return `linear-gradient(${gradient.angle}deg, ${stopString})`;
    } else if (gradient.type === 'radial') {
      return `radial-gradient(circle, ${stopString})`;
    }
    return `conic-gradient(from ${gradient.angle}deg, ${stopString})`;
  };

  return (
    <div className="space-y-4">
      {/* Gradient Preview */}
      <div 
        className="w-full h-14 rounded-xl border border-app-border shadow-inner overflow-hidden transition-all duration-200 hover:shadow-md"
        style={{ background: gradientPreview() }}
      />
      
      <div className="grid grid-cols-2 gap-3">
        <Dropdown
          id={`gradient-type-${layer.id}`}
          name="gradientType"
          label="Type"
          value={gradient.type}
          options={GRADIENT_TYPE_OPTIONS}
          onChange={(_, val) => updateLayer(layer.id, { 
            gradient: { ...gradient, type: val as 'linear' | 'radial' | 'conic' }
          })}
        />
        {gradient.type === 'linear' && (
          <CustomSlider
            label="Angle"
            value={gradient.angle || 90}
            min={0}
            max={360}
            suffix="°"
            onChange={(val) => updateLayer(layer.id, { 
              gradient: { ...gradient, angle: val }
            })}
          />
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-app-gray uppercase tracking-wide">Color Stops</span>
          <button
            onClick={addStop}
            className="p-1.5 rounded-lg hover:bg-primary/20 text-app-icon-color hover:text-primary transition-all duration-200 hover:scale-105"
          >
            <Plus size={14} />
          </button>
        </div>
        
        <div className="space-y-2">
          {gradient.stops.map((stop: { color: string; position: number }, index: number) => (
            <div 
              key={index} 
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-app-gray-dark/30 transition-all duration-200"
            >
              <div className="relative group">
                <div 
                  className="w-7 h-7 rounded-lg border-2 border-app-border shadow-sm transition-transform duration-200 group-hover:scale-105"
                  style={{ backgroundColor: stop.color }}
                />
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => updateStop(index, { color: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <CustomSlider
                value={stop.position}
                min={0}
                max={100}
                suffix="%"
                onChange={(val) => updateStop(index, { position: val })}
                compact
              />
              {gradient.stops.length > 2 && (
                <button
                  onClick={() => removeStop(index)}
                  className="p-1.5 rounded-lg hover:bg-danger/20 text-app-icon-color hover:text-danger transition-all duration-200"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};