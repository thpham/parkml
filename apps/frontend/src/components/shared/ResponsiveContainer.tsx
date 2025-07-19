import React from 'react';

export interface ResponsiveContainerProps {
  /** Container size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Padding variant */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Children content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Responsive container component that provides consistent spacing
 * and sizing across different screen sizes for medical applications
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  size = 'lg',
  padding = 'md',
  children,
  className = '',
}) => {
  // Container size mappings - mobile first approach
  const sizeClasses = {
    sm: 'max-w-sm mx-auto',
    md: 'max-w-2xl mx-auto',
    lg: 'max-w-4xl mx-auto',
    xl: 'max-w-6xl mx-auto',
    full: 'max-w-full',
  };

  // Responsive padding - smaller on mobile, larger on desktop
  const paddingClasses = {
    none: '',
    sm: 'p-2 sm:p-3',
    md: 'p-3 sm:p-4 lg:p-6',
    lg: 'p-4 sm:p-6 lg:p-8',
  };

  return (
    <div className={`${sizeClasses[size]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;