import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconX, IconCheck, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react'

export interface ToastOptions {
  id?: string
  title: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface Toast extends ToastOptions {
  id: string
  createdAt: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (options: ToastOptions) => string
  removeToast: (id: string) => void
  removeAllToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
  maxToasts?: number
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, maxToasts = 5 }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const removeAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const addToast = useCallback(
    (options: ToastOptions): string => {
      const id = options.id || `toast-${Date.now()}-${Math.random()}`
      const newToast: Toast = {
        ...options,
        id,
        createdAt: Date.now(),
      }

      setToasts(prev => {
        const updated = [...prev, newToast]
        // Remove oldest toasts if exceeding maxToasts
        if (updated.length > maxToasts) {
          return updated.slice(updated.length - maxToasts)
        }
        return updated
      })

      return id
    },
    [maxToasts],
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, removeAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>,
    document.body,
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: () => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const { type = 'info', duration = 5000 } = toast

  useEffect(() => {
    if (duration <= 0) return

    const timer = setTimeout(() => {
      onRemove()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onRemove])

  const icons = {
    success: <IconCheck size={20} />,
    error: <IconAlertCircle size={20} />,
    warning: <IconAlertCircle size={20} />,
    info: <IconInfoCircle size={20} />,
  }

  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  }

  const iconStyles = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 w-full p-4 rounded-lg border shadow-lg transition-all duration-300 animate-slide-in-right ${styles[type]}`}
      role="alert"
    >
      <span className={`flex-shrink-0 ${iconStyles[type]}`}>{icons[type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && <p className="mt-1 text-sm opacity-90">{toast.description}</p>}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 ml-2 text-current opacity-50 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
        aria-label="Close"
      >
        <IconX size={16} />
      </button>
    </div>
  )
}

// Convenience hook for common toast types
export const useToastActions = () => {
  const { addToast } = useToast()

  return {
    success: (title: string, description?: string) => addToast({ title, description, type: 'success' }),
    error: (title: string, description?: string) => addToast({ title, description, type: 'error' }),
    warning: (title: string, description?: string) => addToast({ title, description, type: 'warning' }),
    info: (title: string, description?: string) => addToast({ title, description, type: 'info' }),
  }
}
