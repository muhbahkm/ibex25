import React from 'react'

export interface EmptyStateProps {
  message?: string
  description?: string
  className?: string
  action?: React.ReactNode
}

/**
 * EmptyState Component
 *
 * Simple reusable empty state UI pattern.
 * Used for empty lists and no-data scenarios.
 */
export function EmptyState({
  message = 'لا توجد بيانات',
  description,
  className = '',
  action,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="flex flex-col items-center space-y-2">
        <p className="text-lg font-medium text-gray-900">{message}</p>
        {description && (
          <p className="text-body text-gray-500 max-w-sm mx-auto mb-6">{description}</p>
        )}
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}

