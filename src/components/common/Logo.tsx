// src/components/common/Logo.tsx
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = true 
}) => {
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-lg' },
    md: { container: 'w-10 h-10', text: 'text-xl' },
    lg: { container: 'w-12 h-12', text: 'text-2xl' }
  };

  const [imageError, setImageError] = React.useState(false);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {!imageError ? (
        <img
          src="/assets/VoxMatch-logo.png"
          alt="VoxMatch Studio"
          className={`${sizes[size].container} object-contain`}
          onError={(e) => {
            console.warn('Logo image failed to load:', e);
            setImageError(true);
          }}
        />
      ) : (
        <div className={`${sizes[size].container} bg-primary rounded-lg flex items-center justify-center`}>
          <span className="text-white font-bold">V</span>
        </div>
      )}
      {showText && (
        <span className={`${sizes[size].text} font-semibold text-app-text`}>
          VoxMatch Studio
        </span>
      )}
    </div>
  );
};
