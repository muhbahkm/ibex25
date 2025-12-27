import React from 'react'
import Icon from '@/components/Icon'
import { ErrorType } from '@/lib/error-handler'

export interface ErrorMessageProps {
  message: string
  className?: string
  type?: ErrorType
  onDismiss?: () => void
  retry?: () => void
}

/**
 * ErrorMessage Component
 *
 * Enhanced error message UI pattern with support for different error types,
 * dismissible errors, and retry actions.
 */
export function ErrorMessage({
  message,
  className = '',
  type = 'unknown',
  onDismiss,
  retry,
}: ErrorMessageProps) {
  // Determine icon and styling based on error type
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: 'wifi_off',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
        }
      case 'permission':
        return {
          icon: 'lock',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
        }
      case 'validation':
        return {
          icon: 'error',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
        }
      case 'not-found':
        return {
          icon: 'search_off',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
        }
      case 'server':
        return {
          icon: 'warning',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
        }
      default:
        return {
          icon: 'error_outline',
          bgColor: 'bg-danger-50',
          borderColor: 'border-danger-200',
          textColor: 'text-danger-800',
        }
    }
  }

  const config = getErrorConfig()

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon
          name={config.icon}
          className={`${config.textColor} text-xl flex-shrink-0 mt-0.5`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${config.textColor} font-medium`}>{message}</p>
          {(retry || onDismiss) && (
            <div className="flex items-center gap-3 mt-3">
              {retry && (
                <button
                  onClick={retry}
                  className={`text-xs ${config.textColor} hover:underline font-medium`}
                >
                  إعادة المحاولة
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`text-xs ${config.textColor} hover:underline`}
                >
                  إخفاء
                </button>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${config.textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
            aria-label="إغلاق"
          >
            <Icon name="close" className="text-base" />
          </button>
        )}
      </div>
    </div>
  )
}

