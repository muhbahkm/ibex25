'use client'

import { createContext } from 'react'
import { Role, Permission } from './roles'

/**
 * Auth User Type
 *
 * Represents an authenticated user in the frontend.
 * This mirrors the backend AuthContext but is frontend-only.
 */
export interface AuthUser {
  id: string
  name: string
  role: Role
  permissions: Permission[]
  storeId: string
}

/**
 * Auth Context Value
 *
 * Provides user information and permission checking utilities.
 */
export interface AuthContextValue {
  user: AuthUser
  hasPermission: (permission: Permission) => boolean
}

/**
 * Auth Context
 *
 * React context for authentication state.
 * This is a frontend-only scaffold - no real authentication yet.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

