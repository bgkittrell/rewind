import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
  padding?: 'none' | 'small' | 'medium' | 'large'
  children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'medium',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'bg-white rounded-lg'

  const variantStyles = {
    default: 'border border-gray-200',
    outlined: 'border-2 border-gray-300',
    elevated: 'shadow-lg',
  }

  const paddingStyles = {
    none: '',
    small: 'p-3',
    medium: 'p-6',
    large: 'p-8',
  }

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  )
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className = '', ...props }) => {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`} {...props}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardBody: React.FC<CardBodyProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`text-gray-700 ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  divider?: boolean
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, divider = true, className = '', ...props }) => {
  const dividerStyles = divider ? 'border-t border-gray-200 pt-4 mt-4' : ''

  return (
    <div className={`${dividerStyles} ${className}`} {...props}>
      {children}
    </div>
  )
}
