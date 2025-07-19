import React from 'react';

export interface AvatarProps {
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Type of avatar content */
  variant?: 'initial' | 'icon';
  /** Color theme for the avatar */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  /** Status-based coloring (overrides color prop) */
  status?: 'active' | 'inactive' | 'pending' | 'warning' | 'error';
  /** Avatar content (icon, text, etc.) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
}

/**
 * Reusable Avatar component with consistent alignment and theming
 * Supports medical color scheme and mobile responsiveness
 */
export const Avatar: React.FC<AvatarProps> = ({
  size = 'md',
  variant = 'icon',
  color = 'primary',
  status,
  children,
  className = '',
  'aria-label': ariaLabel,
}) => {
  // Size mappings for responsive design
  const sizeClasses = {
    sm: 'w-8 h-8', // 32px - Mobile friendly
    md: 'w-10 h-10', // 40px - Default
    lg: 'w-12 h-12', // 48px - Larger screens
    xl: 'w-16 h-16', // 64px - Profile pages
  };

  // Color mappings using medical theme
  const getColorClass = () => {
    if (status) {
      switch (status) {
        case 'active':
          return 'bg-success text-success-content';
        case 'inactive':
          return 'bg-base-300 text-base-content';
        case 'pending':
          return 'bg-warning text-warning-content';
        case 'warning':
          return 'bg-warning text-warning-content';
        case 'error':
          return 'bg-error text-error-content';
        default:
          return 'bg-primary text-primary-content';
      }
    }

    switch (color) {
      case 'primary':
        return 'bg-primary text-primary-content';
      case 'secondary':
        return 'bg-secondary text-secondary-content';
      case 'success':
        return 'bg-success text-success-content';
      case 'warning':
        return 'bg-warning text-warning-content';
      case 'error':
        return 'bg-error text-error-content';
      case 'info':
        return 'bg-info text-info-content';
      case 'neutral':
        return 'bg-neutral text-neutral-content';
      default:
        return 'bg-primary text-primary-content';
    }
  };

  // Text size for initials based on avatar size
  const getTextSize = () => {
    if (variant === 'initial') {
      switch (size) {
        case 'sm':
          return 'text-xs font-semibold';
        case 'md':
          return 'text-sm font-semibold';
        case 'lg':
          return 'text-base font-semibold';
        case 'xl':
          return 'text-lg font-semibold';
        default:
          return 'text-sm font-semibold';
      }
    }
    return '';
  };

  // Icon size for icons based on avatar size
  const getIconSize = () => {
    if (variant === 'icon') {
      switch (size) {
        case 'sm':
          return 'h-4 w-4';
        case 'md':
          return 'h-5 w-5';
        case 'lg':
          return 'h-6 w-6';
        case 'xl':
          return 'h-8 w-8';
        default:
          return 'h-5 w-5';
      }
    }
    return '';
  };

  return (
    <div 
      className={`avatar ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div 
        className={`
          ${sizeClasses[size]} 
          ${getColorClass()} 
          ${getTextSize()}
          rounded-full 
          shrink-0
          transition-colors 
          duration-200
          select-none
        `}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: '1'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '100%',
          height: '100%'
        }}>
          {variant === 'icon' && React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement, {
                className: `${getIconSize()} ${(children as React.ReactElement).props.className || ''}`,
              })
            : children}
        </div>
      </div>
    </div>
  );
};

export default Avatar;