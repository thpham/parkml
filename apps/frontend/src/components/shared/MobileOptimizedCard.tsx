import React from 'react';

export interface MobileOptimizedCardProps {
  /** Card title */
  title?: string;
  /** Card subtitle or description */
  subtitle?: string;
  /** Card actions (buttons, etc.) */
  actions?: React.ReactNode;
  /** Card content */
  children: React.ReactNode;
  /** Card variant */
  variant?: 'default' | 'compact' | 'list';
  /** Additional CSS classes */
  className?: string;
  /** Loading state */
  loading?: boolean;
}

/**
 * Mobile-optimized card component for medical applications
 * Automatically adjusts spacing, text sizes, and layout for mobile devices
 */
export const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  title,
  subtitle,
  actions,
  children,
  variant = 'default',
  className = '',
  loading = false,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'p-3 sm:p-4';
      case 'list':
        return 'p-2 sm:p-3';
      default:
        return 'p-4 sm:p-6';
    }
  };

  if (loading) {
    return (
      <div className={`card bg-base-100 shadow-xl ${className}`}>
        <div className={`card-body ${getVariantClasses()}`}>
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-200 ${className}`}
    >
      <div className={`card-body ${getVariantClasses()}`}>
        {/* Header with title and actions */}
        {(title || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
            <div className="flex-1 min-w-0">
              {title && (
                <h2
                  className={`card-title ${
                    variant === 'compact' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                  } truncate`}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm sm:text-base text-base-content/70 mt-1 line-clamp-2">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex flex-wrap gap-2 sm:gap-3 sm:ml-4">{actions}</div>}
          </div>
        )}

        {/* Card content */}
        <div className="space-y-3 sm:space-y-4">{children}</div>
      </div>
    </div>
  );
};

export default MobileOptimizedCard;
