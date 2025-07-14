import React from 'react'

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: 'primary' | 'white' | 'gray'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'medium', color = 'primary', className = '' }) => {
  const sizeStyles = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  }

  const colorStyles = {
    primary: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600',
  }

  return (
    <svg
      className={`animate-spin ${sizeStyles[size]} ${colorStyles[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className = '',
}) => {
  const baseStyles = 'bg-gray-200'

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]',
    none: '',
  }

  const defaultDimensions = {
    text: { width: '100%', height: '1em' },
    circular: { width: '40px', height: '40px' },
    rectangular: { width: '100%', height: '20px' },
  }

  const finalWidth = width || defaultDimensions[variant].width
  const finalHeight = height || defaultDimensions[variant].height

  const style: React.CSSProperties = {
    width: typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth,
    height: typeof finalHeight === 'number' ? `${finalHeight}px` : finalHeight,
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export interface LoadingOverlayProps {
  isLoading: boolean
  spinnerSize?: 'small' | 'medium' | 'large'
  message?: string
  children: React.ReactNode
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  spinnerSize = 'medium',
  message,
  children,
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center z-10">
          <Spinner size={spinnerSize} />
          {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        </div>
      )}
    </div>
  )
}

export interface SkeletonCardProps {
  showAvatar?: boolean
  lines?: number
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ showAvatar = true, lines = 3 }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-start space-x-4">
        {showAvatar && <Skeleton variant="circular" width={48} height={48} />}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={20} />
          <div className="space-y-2">
            {Array.from({ length: lines }, (_, i) => (
              <Skeleton key={i} variant="text" width={i === lines - 1 ? '80%' : '100%'} height={16} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
