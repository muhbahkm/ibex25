import React from 'react'

export interface ErrorMessageProps {
  message: string
  className?: string
}

/**
 * ErrorMessage Component
 *
 * Simple reusable error message UI pattern.
 * Used for displaying error states.
 */
export function ErrorMessage({
  message,
  className = '',
}: ErrorMessageProps) {
  return (
    <div
      className={`bg-danger-50 border border-danger-200 rounded-lg p-4 ${className}`}
    >
      <p className="text-sm text-danger-800">{message}</p>
    </div>
  )
}

