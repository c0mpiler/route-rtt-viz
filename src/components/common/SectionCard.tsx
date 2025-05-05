/**
 * SectionCard - A reusable card component for sections
 *
 * This component provides a consistent card layout for different
 * sections of the application with a title and optional icon.
 */
import React from 'react';

interface SectionCardProps {
  /** Card title */
  title: string;
  
  /** Optional icon component */
  icon?: React.ReactNode;
  
  /** Card content */
  children: React.ReactNode;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Optional action button */
  actionButton?: React.ReactNode;
}

/**
 * A card component for sections with a title and optional icon
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  className = '',
  actionButton
}) => {
  return (
    <div className={`card bg-white rounded-lg shadow-md mb-6 transition-all duration-300 hover:shadow-lg ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h2>
          {actionButton && (
            <div>
              {actionButton}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};
