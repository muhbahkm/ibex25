'use client'

import { ReactNode } from 'react'
import { Permission } from './roles'
import { useAuth } from './useAuth'

/**
 * RequirePermission Component
 *
 * A declarative component for permission-based UI rendering.
 * This standardizes permission enforcement across the application.
 *
 * Usage:
 * ```tsx
 * <RequirePermission permission="SETTLE_INVOICE">
 *   <button>Settle Invoice</button>
 * </RequirePermission>
 * ```
 *
 * With fallback:
 * ```tsx
 * <RequirePermission 
 *   permission="VIEW_REPORTS"
 *   fallback={<p>You don't have permission to view reports</p>}
 * >
 *   <ReportsSection />
 * </RequirePermission>
 * ```
 *
 * This component centralizes permission logic and prevents
 * scattered hasPermission() calls throughout JSX.
 */
interface RequirePermissionProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export function RequirePermission({
  permission,
  children,
  fallback,
}: RequirePermissionProps) {
  const { hasPermission } = useAuth()

  if (hasPermission(permission)) {
    return <>{children}</>
  }

  return fallback ? <>{fallback}</> : null
}

