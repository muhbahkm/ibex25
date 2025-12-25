# Authentication & Authorization Skeleton

## Overview

This directory contains the authentication and authorization scaffolding for IBEX.
**This is NOT a working authentication system yet.** It is a skeleton designed to prevent architectural drift and enable clean integration of real authentication in the future.

## Current State

### What Exists

- **OperatorContext**: Explicitly passed in every financial operation
- **Store Ownership Guard**: Validates operator belongs to invoice's store
- **No Real Auth**: No JWT, no sessions, no login system

### What This Skeleton Provides

- **Role Definitions**: OWNER, MANAGER, CASHIER, AUDITOR
- **Permission Definitions**: Granular permissions for operations
- **AuthContext Interface**: Core contract for authenticated users
- **Auth Guard Stub**: Placeholder guard (not enforced yet)

## Architecture Principles

### Auth Wraps, Doesn't Invade

Authentication must wrap the system, not invade it. The invoice lifecycle, ledger, and business logic remain sovereign.

### Parallel, Not Invasive

This skeleton exists **parallel** to OperatorContext, not as a replacement. Migration will happen gradually.

### Explicit Over Implicit

OperatorContext is passed explicitly, which is excellent. Future AuthContext will be extracted from JWT but will maintain the same explicit contract.

## Files

### `roles.enum.ts`

Defines organizational roles:
- **OWNER**: Full system control
- **MANAGER**: Store operations management
- **CASHIER**: Point-of-sale operations
- **AUDITOR**: Read-only access

### `permissions.enum.ts`

Defines granular permissions:
- **ISSUE_INVOICE**: Create and issue invoices
- **SETTLE_INVOICE**: Settle unpaid invoices
- **CANCEL_INVOICE**: Cancel invoices
- **VIEW_LEDGER**: View ledger entries
- **VIEW_REPORTS**: View financial reports

### `auth-context.interface.ts`

Core contract for authenticated users:
```typescript
interface AuthContext {
  userId: string;
  storeId: string;
  role: Role;
  permissions: Permission[];
}
```

### `auth.guard.ts`

Placeholder guard that:
- Currently: Always allows (no enforcement)
- Future: Will extract AuthContext from JWT
- Future: Will enforce permissions
- Future: Will attach AuthContext to request

## Why Auth Is Not Enforced Yet

1. **Frontend Not Ready**: No login UI, no session management
2. **Backend Not Ready**: No JWT generation, no user management
3. **OperatorContext Works**: Explicit passing is clear and safe
4. **No Pressure**: System works correctly without auth enforcement

## Migration Path

### Phase 1: Current (Explicit OperatorContext)
```typescript
async issue(invoiceId: string, operatorContext: OperatorContextDto) {
  // OperatorContext passed explicitly
}
```

### Phase 2: Future (AuthContext from JWT)
```typescript
@UseGuards(AuthGuard)
async issue(@Request() req, invoiceId: string) {
  const authContext: AuthContext = req.authContext;
  // AuthContext extracted from JWT
}
```

### Phase 3: Future (OperatorContext Derived)
```typescript
const operatorContext = {
  operatorId: authContext.userId,
  storeId: authContext.storeId,
};
```

## Integration Points

### With User Model

Future integration with Prisma User model:
- User.role field will map to AuthContext.role
- User.storeId will map to AuthContext.storeId
- User.id will map to AuthContext.userId

### With Permissions

Future permission enforcement:
- Role-based: OWNER can do everything
- Permission-based: Check permissions array
- Store-based: Already enforced by StoreOwnershipGuard

### With Frontend

Future frontend integration:
- Login endpoint will generate JWT
- JWT will contain AuthContext
- Frontend will send JWT in Authorization header
- Backend will extract and validate JWT

## Why This Matters

1. **Prevents Auth Chaos**: Clear structure prevents ad-hoc auth implementation
2. **Avoids Refactors**: Future auth can integrate cleanly
3. **Convergence Path**: Frontend and backend auth can converge cleanly
4. **Sovereign Logic**: Accounting logic remains independent of auth

## Future Work

1. **JWT Implementation**: Generate and validate JWTs
2. **User Management**: Create, update, delete users
3. **Role Assignment**: Assign roles to users
4. **Permission Mapping**: Map roles to permissions
5. **Guard Enforcement**: Enable AuthGuard enforcement
6. **Frontend Integration**: Login UI, session management

## Important Notes

- **DO NOT** enforce permissions yet
- **DO NOT** block endpoints yet
- **DO NOT** parse headers yet
- **DO** maintain explicit OperatorContext passing
- **DO** document future integration points
- **DO** keep business logic sovereign

---

**This skeleton exists to prevent architectural drift, not to enforce security yet.**

