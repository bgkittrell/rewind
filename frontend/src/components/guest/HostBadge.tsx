import React from 'react'
import { IconMicrophone, IconStar } from '@tabler/icons-react'

interface HostBadgeProps {
  name: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  isMainHost?: boolean
}

export const HostBadge: React.FC<HostBadgeProps> = ({
  name,
  variant = 'primary',
  size = 'md',
  showIcon = true,
  isMainHost = false,
}) => {
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors'

  const variantClasses = {
    primary: 'bg-blue-100 text-blue-800 border border-blue-200',
    secondary: 'bg-gray-100 text-gray-800 border border-gray-200',
    outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {showIcon && (
        <>
          {isMainHost ? (
            <IconStar className={`${iconSizes[size]} ${variant === 'primary' ? 'text-blue-600' : 'text-gray-600'}`} />
          ) : (
            <IconMicrophone
              className={`${iconSizes[size]} ${variant === 'primary' ? 'text-blue-600' : 'text-gray-600'}`}
            />
          )}
        </>
      )}
      <span className="truncate">{name}</span>
      {isMainHost && <span className="text-xs font-normal opacity-75">Host</span>}
    </span>
  )
}
