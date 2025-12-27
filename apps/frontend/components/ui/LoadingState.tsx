import React from 'react'

export interface LoadingStateProps {
  message?: string
  className?: string
}

/**
 * LoadingState Component
 *
 * Simple reusable loading state UI pattern.
 * Visual only - no spinner library.
 */
export function LoadingState({
  message = 'جاري التحميل...',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex items-center justify-center py-8 text-muted ${className}`}
    >
      <div className="flex flex-col items-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  )
}

