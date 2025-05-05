/**
 * LoadingIndicator - Component for showing loading states
 * 
 * This component provides a visual indication of loading state with
 * configurable size and optional descriptive text. It uses a network
 * graph-themed animation to align with the application's purpose.
 */
import React from 'react';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
  type?: 'pulse' | 'network' | 'dots';
  variant?: 'default' | 'compact';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  text,
  className = '',
  type = 'network',
  variant = 'default',
}) => {
  // Compact variant - simple spinner for header
  if (variant === 'compact') {
    return (
      <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent">
      </div>
    );
  }
  
  // Size mappings
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-10 w-10',
    large: 'h-16 w-16',
  };

  const sizeTextClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  // Render loading animation based on type
  const renderLoadingAnimation = () => {
    switch (type) {
      case 'pulse':
        return (
          <div className="relative">
            <div className={`${sizeClasses[size]} rounded-full bg-primary-200`}>
              <div className="loading-pulse bg-primary-400"></div>
            </div>
            <div
              className={`${sizeClasses[size]} rounded-full bg-primary-600 animate-pulse absolute top-0 left-0 opacity-75`}
              style={{ animationDuration: '1.5s' }}
            ></div>
          </div>
        );
      
      case 'dots':
        return (
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`bg-primary-600 rounded-full animate-bounce ${
                  size === 'small' ? 'h-2 w-2' : size === 'medium' ? 'h-3 w-3' : 'h-4 w-4'
                }`}
                style={{ 
                  animationDuration: '0.6s',
                  animationDelay: `${i * 0.1}s`,
                  animationFillMode: 'both'
                }}
              ></div>
            ))}
          </div>
        );
      
      case 'network':
      default:
        return (
          <div className={`${sizeClasses[size]} relative`}>
            {/* Central node */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary-600 rounded-full animate-pulse" 
                style={{ 
                  width: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
                  height: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
                  animationDuration: '1.5s' 
                }}>
            </div>
            
            {/* Satellite nodes */}
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (i * 72) * Math.PI / 180;
              const radius = size === 'small' ? 10 : size === 'medium' ? 16 : 24;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const nodeSize = size === 'small' ? 4 : size === 'medium' ? 6 : 8;
              
              return (
                <div 
                  key={i}
                  className="absolute bg-primary-400 rounded-full"
                  style={{
                    width: `${nodeSize}px`,
                    height: `${nodeSize}px`,
                    top: `calc(50% + ${y}px)`,
                    left: `calc(50% + ${x}px)`,
                    transform: 'translate(-50%, -50%)',
                    animation: `satellite${i} 3s infinite`
                  }}
                ></div>
              );
            })}
            
            {/* Connecting lines as SVG */}
            <svg className="absolute top-0 left-0 w-full h-full">
              {[0, 1, 2, 3, 4].map((i) => {
                const angle = (i * 72) * Math.PI / 180;
                const radius = size === 'small' ? 10 : size === 'medium' ? 16 : 24;
                const x = Math.cos(angle) * radius + (size === 'small' ? 12 : size === 'medium' ? 20 : 32) / 2;
                const y = Math.sin(angle) * radius + (size === 'small' ? 12 : size === 'medium' ? 20 : 32) / 2;
                
                return (
                  <line 
                    key={i}
                    x1="50%" 
                    y1="50%" 
                    x2={`${x / (size === 'small' ? 12 : size === 'medium' ? 20 : 32) * 100}%`} 
                    y2={`${y / (size === 'small' ? 12 : size === 'medium' ? 20 : 32) * 100}%`} 
                    stroke="#a5b4fc"
                    strokeWidth="1"
                    strokeDasharray="2"
                    strokeOpacity="0.8"
                    className="animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                );
              })}
            </svg>
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderLoadingAnimation()}
      
      {text && (
        <div className="mt-4">
          <p className={`font-medium text-secondary-700 ${sizeTextClasses[size]}`}>
            {text}
          </p>
          <div className="mt-1 flex space-x-1 justify-center">
            <span className="animate-bounce delay-75 text-primary-600 text-2xl leading-none">.</span>
            <span className="animate-bounce delay-150 text-primary-600 text-2xl leading-none">.</span>
            <span className="animate-bounce delay-300 text-primary-600 text-2xl leading-none">.</span>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes satellite0 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        }
        @keyframes satellite1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; }
        }
        @keyframes satellite2 {
          0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.9; }
        }
        @keyframes satellite3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.9; }
          50% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
        }
        @keyframes satellite4 {
          0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        }
      ` }} />
    </div>
  );
};
