'use client'

import { ReactNode } from 'react'
import { AuthContext, AuthContextValue, AuthUser } from './AuthContext'
import { Role, Permission } from './roles'

/**
 * Auth Provider
 *
 * Provides authentication context to the application.
 * Currently uses a hardcoded mock user - no real authentication yet.
 *
 * Mock User:
 * - Role: MANAGER
 * - Permissions: ISSUE_INVOICE, SETTLE_INVOICE, VIEW_LEDGER
 * - Store ID: hardcoded (will be replaced with real store ID later)
 *
 * This is a scaffold only - no async logic, no API calls, no localStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Hardcoded mock user - no real authentication yet
  const mockUser: AuthUser = {
    id: 'mock-user-id',
    name: 'مدير النظام',
    role: Role.MANAGER,
    permissions: [
      Permission.ISSUE_INVOICE,
      Permission.SETTLE_INVOICE,
      Permission.VIEW_LEDGER,
    ],
    storeId: 'mock-store-id',
  }

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: Permission): boolean => {
    return mockUser.permissions.includes(permission)
  }

  const value: AuthContextValue = {
    user: mockUser,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

