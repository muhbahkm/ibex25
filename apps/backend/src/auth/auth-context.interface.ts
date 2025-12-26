import { Role } from './roles.enum';
import { Permission } from './permissions.enum';

/**
 * Auth Context Interface
 *
 * Represents the authenticated user's context in the system.
 * This is the core contract for authentication and authorization.
 *
 * Rules:
 * - userId: The authenticated user's ID
 * - storeId: The store the user belongs to (enforced by store ownership)
 * - role: The user's organizational role
 * - permissions: The user's granular permissions (derived from role or explicit)
 *
 * Important:
 * - This does NOT replace OperatorContext yet
 * - This is parallel, not invasive
 * - No JWT parsing yet
 * - No headers parsing yet
 * - This is scaffolding for future auth implementation
 *
 * Migration Path:
 * - Phase 1 (Current): OperatorContext is passed explicitly
 * - Phase 2 (Future): AuthContext will be extracted from JWT/session
 * - Phase 3 (Future): OperatorContext will be derived from AuthContext
 */
export interface AuthContext {
  userId: string;
  storeId: string;
  role: Role;
  permissions: Permission[];
}
