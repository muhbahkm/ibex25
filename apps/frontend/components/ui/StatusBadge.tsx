import React from 'react'

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'UNPAID' | 'PAID' | 'CANCELLED'

export interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

/**
 * Status Badge Component
 *
 * Visual status badge for invoice statuses.
 * Color-coded with semantic colors, readable in Arabic.
 * Pure presentational component - no logic.
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusConfig: Record<
    InvoiceStatus,
    { label: string; bgColor: string; textColor: string }
  > = {
    DRAFT: {
      label: 'مسودة',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
    },
    ISSUED: {
      label: 'مُصدرة',
      bgColor: 'bg-primary-100',
      textColor: 'text-primary-800',
    },
    UNPAID: {
      label: 'غير مسددة',
      bgColor: 'bg-warning-100',
      textColor: 'text-warning-800',
    },
    PAID: {
      label: 'مسددة',
      bgColor: 'bg-success-100',
      textColor: 'text-success-800',
    },
    CANCELLED: {
      label: 'ملغاة',
      bgColor: 'bg-danger-100',
      textColor: 'text-danger-800',
    },
  }

  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  )
}

