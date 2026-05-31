// src/components/modals/stage-settings/hooks/useLayers.ts
import { useState, useCallback } from 'react';
import { StageLayer } from '../../../../types/types';

export const useLayers = (initialLayers: StageLayer[]) => {
  const [layers, setLayers] = useState<StageLayer[]>(initialLayers);

  const updateLayer = useCallback((id: string, updates: Partial<StageLayer>) => {
    setLayers(prev => prev.map(layer => {
      // Don't allow unlocking the base background layer (index 0)
      if (layer.id === id) {
        const isBaseLayer = prev.findIndex(l => l.id === id) === 0;
        if (isBaseLayer && updates.locked === false) {
          // Prevent unlocking the base layer
          const { locked, ...restUpdates } = updates;
          return { ...layer, ...restUpdates };
        }
        return { ...layer, ...updates };
      }
      return layer;
    }));
  }, []);

  const addLayer = useCallback((type: StageLayer['type'] = 'color') => {
    const newLayer: StageLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      content: type === 'color' ? '#333333' : '',
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      name: `New ${type} layer`,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      locked: false,  // New layers are not locked
    };
    
    if (type === 'gradient') {
      newLayer.gradient = {
        type: 'linear',
        angle: 90,
        stops: [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 100 }
        ]
      };
    }
    
    setLayers(prev => [...prev, newLayer]);
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const layerIndex = prev.findIndex(l => l.id === id);
      // Don't allow removing the base background layer (index 0)
      if (layerIndex === 0) return prev;
      return prev.filter(l => l.id !== id);
    });
  }, []);

  const duplicateLayer = useCallback((layer: StageLayer) => {
    const newLayer: StageLayer = {
      ...layer,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: `${layer.name || 'Layer'} (copy)`,
      locked: false,  // Duplicated layers are not locked
    };
    setLayers(prev => [...prev, newLayer]);
  }, []);

  const moveLayer = useCallback((fromIndex: number, toIndex: number) => {
    // Don't allow moving the base background layer (index 0)
    if (fromIndex === 0) return;
    // Don't allow moving a layer to position 0 (before background)
    if (toIndex === 0) return;
    
    if (toIndex < 0 || toIndex >= layers.length) return;
    setLayers(prev => {
      const newLayers = [...prev];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      return newLayers;
    });
  }, [layers.length]);

  return {
    layers,
    setLayers,
    updateLayer,
    addLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
  };
};
