import React from 'react'

export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

/**
 * Skeleton Component
 *
 * Loading placeholder component for better perceived performance.
 * Shows animated placeholders while content is loading.
 */
export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'

  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full'
      case 'text':
        return 'rounded h-4'
      case 'rectangular':
        return 'rounded'
      default:
        return 'rounded'
    }
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  if (lines && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()} mb-2`}
            style={index === lines - 1 ? { width: '75%' } : style}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={style}
    />
  )
}

/**
 * Table Skeleton Component
 *
 * Skeleton loader for table structures
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-200">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="text" width="25%" height={20} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width="25%" height={16} />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Card Skeleton Component
 *
 * Skeleton loader for card structures
 */
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <Skeleton variant="text" width="40%" height={24} />
      <Skeleton variant="text" width="100%" height={16} />
      <Skeleton variant="text" width="80%" height={16} />
      <div className="pt-4 border-t border-gray-200">
        <Skeleton variant="text" width="60%" height={20} />
      </div>
    </div>
  )
}

