'use client'

import { ReactNode } from 'react'
import { AuthContext, AuthContextValue, AuthUser } from './AuthContext'
import { Role, Permission } from './roles'
import { getPermissionsForRole } from './role-permissions'

/**
 * Auth Provider
 *
 * Provides authentication context to the application.
 * Currently uses a hardcoded mock user - no real authentication yet.
 *
 * Mock User:
 * - Role: MANAGER
 * - Permissions: Derived from role using getPermissionsForRole()
 * - Store ID: hardcoded (will be replaced with real store ID later)
 *
 * Permissions are always derived from role - never hardcoded per user.
 * This is a scaffold only - no async logic, no API calls, no localStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Hardcoded mock user - no real authentication yet
  // Permissions are derived from role using centralized mapping
  const mockRole = Role.MANAGER
  const mockUser: AuthUser = {
    id: 'mock-user-id',
    name: 'مدير النظام',
    role: mockRole,
    permissions: getPermissionsForRole(mockRole),
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

