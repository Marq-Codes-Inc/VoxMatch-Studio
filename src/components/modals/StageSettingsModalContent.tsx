// src/components/modals/StageSettingsModalContent.tsx
import React from 'react';
import { StageStyle } from '../../types/types';
import { StageSettingsContent as CoreStageSettingsContent } from './stage-settings';

interface StageSettingsContentProps {
  stageStyle: StageStyle;
  setStageStyle: (style: StageStyle) => void;
  onClose?: () => void;
}

// Pass-through wrapper directly pointing to the single source of truth file
export const StageSettingsContent: React.FC<StageSettingsContentProps> = (props) => {
  return <CoreStageSettingsContent {...props} />;
};

export default StageSettingsContent;
