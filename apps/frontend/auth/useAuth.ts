'use client'

import { useContext } from 'react'
import { AuthContext, AuthContextValue } from './AuthContext'

/**
 * useAuth Hook
 *
 * Hook to access authentication context.
 * Throws an error if used outside AuthProvider.
 *
 * Usage:
 * ```tsx
 * const { user, hasPermission } = useAuth()
 * if (hasPermission('SETTLE_INVOICE')) {
 *   // Show settle button
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

