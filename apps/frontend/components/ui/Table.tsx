import React from 'react'

/**
 * Table Component
 *
 * Standardized table container with consistent styling.
 * Supports RTL layout.
 */
export function Table({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`w-full ${className}`}>{children}</table>
      </div>
    </div>
  )
}

/**
 * TableHeader Component
 *
 * Standardized table header row with consistent styling.
 */
export function TableHeader({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <thead className={`bg-gray-50 ${className}`}>
      <tr>{children}</tr>
    </thead>
  )
}

/**
 * TableHeaderCell Component
 *
 * Standardized table header cell with consistent styling.
 */
export function TableHeaderCell({
  children,
  align = 'right',
  className = '',
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const alignStyles = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
  }

  return (
    <th
      className={`px-6 py-3.5 ${alignStyles[align]} text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  )
}

/**
 * TableBody Component
 *
 * Standardized table body with consistent styling.
 */
export function TableBody({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <tbody className={`bg-white divide-y divide-gray-200 ${className}`}>
      {children}
    </tbody>
  )
}

/**
 * TableRow Component
 *
 * Standardized table row with hover state.
 */
export function TableRow({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const hoverStyles = onClick
    ? 'hover:bg-gray-50 cursor-pointer'
    : 'hover:bg-gray-50'

  return (
    <tr className={`${hoverStyles} ${className}`} onClick={onClick}>
      {children}
    </tr>
  )
}

/**
 * TableCell Component
 *
 * Standardized table cell with consistent styling.
 */
export function TableCell({
  children,
  align = 'right',
  className = '',
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const alignStyles = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
  }

  return (
    <td
      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${alignStyles[align]} ${className}`}
    >
      {children}
    </td>
  )
}

