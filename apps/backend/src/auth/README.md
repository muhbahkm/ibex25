# Authentication & Authorization

This module provides authentication and authorization infrastructure for IBEX.

## Current Implementation (Phase J)

### Header-Based Authentication (Temporary)

Authentication is currently implemented using explicit headers. This is a temporary solution before JWT is introduced.

**Required Headers:**
- `x-user-id`: UUID of the authenticated user
- `x-store-id`: UUID of the store the user belongs to
- `x-role`: User's role (OWNER | MANAGER | CASHIER | AUDITOR)

**Validation:**
- All headers are required for protected routes
- Headers are validated strictly (UUID format, valid role enum)
- Missing or invalid headers result in 401 Unauthorized

### AuthGuard

The `AuthGuard` extracts authentication information from headers and builds an `AuthContext`:

1. Reads `x-user-id`, `x-store-id`, and `x-role` headers
2. Validates header format and values
3. Builds `AuthContext` with role-derived permissions
4. Attaches `AuthContext` to `request.auth`
5. Throws 401 Unauthorized if headers are missing or invalid

**Error Codes:**
- `AUTH_HEADERS_MISSING`: Required headers are missing
- `AUTH_INVALID_USER_ID`: User ID is not a valid UUID
- `AUTH_INVALID_STORE_ID`: Store ID is not a valid UUID
- `AUTH_INVALID_ROLE`: Role is not a valid enum value

### PermissionsGuard

The `PermissionsGuard` enforces permission-based access control:

1. Reads required permissions from route metadata (via `@RequirePermissions` decorator)
2. Checks if user's permissions include all required permissions
3. Throws 403 Forbidden if permission is missing
4. Allows access if all permissions are present

**Error Codes:**
- `AUTH_CONTEXT_MISSING`: AuthGuard was not applied or failed
- `PERMISSION_DENIED`: User lacks required permission(s)

### Role → Permission Mapping

Permissions are **always** derived from role using `getPermissionsForRole()`. This mapping is the single source of truth and must match the frontend mapping.

**Role Permissions:**
- **OWNER**: All permissions (ISSUE_INVOICE, SETTLE_INVOICE, CANCEL_INVOICE, VIEW_LEDGER, VIEW_REPORTS)
- **MANAGER**: Invoice operations + view operations (ISSUE_INVOICE, SETTLE_INVOICE, CANCEL_INVOICE, VIEW_LEDGER, VIEW_REPORTS)
- **CASHIER**: Issue invoices + view ledger (ISSUE_INVOICE, VIEW_LEDGER)
- **AUDITOR**: View operations only (VIEW_LEDGER, VIEW_REPORTS)

### Protected Endpoints

The following endpoints require authentication and specific permissions:

**Invoices:**
- `POST /invoices/:id/issue` → Requires `ISSUE_INVOICE`
- `POST /invoices/:id/settle` → Requires `SETTLE_INVOICE`
- `POST /invoices/:id/cancel` → Requires `CANCEL_INVOICE`

**Ledger:**
- `GET /ledger` → Requires `VIEW_LEDGER`

### OperatorContext Bridge

For backward compatibility, `OperatorContextDto` is still accepted in request bodies. However, `AuthContext` (from headers) is the source of truth:

1. Controllers extract `AuthContext` from `request.auth` (set by `AuthGuard`)
2. Controllers validate that `AuthContext` matches `OperatorContextDto` (if provided)
3. Controllers use `AuthContext` as source of truth, overriding DTO values
4. Services receive validated `OperatorContextDto` derived from `AuthContext`

**Validation:**
- If `OperatorContextDto` is provided, it must match `AuthContext`
- Mismatches result in 400 Bad Request with error codes:
  - `OPERATOR_ID_MISMATCH`: Header `x-user-id` does not match body `operatorId`
  - `STORE_ID_MISMATCH`: Header `x-store-id` does not match body `storeId`

## Migration Path to JWT

### Phase 1 (Current): Header-Based Auth
- Explicit headers (`x-user-id`, `x-store-id`, `x-role`)
- Temporary solution for development
- Easy to test and debug

### Phase 2 (Future): JWT-Based Auth
- JWT token in `Authorization: Bearer <token>` header
- Token contains `AuthContext` in payload
- Token signature validation
- Token expiration handling

### Phase 3 (Future): Session-Based Auth (Optional)
- Server-side sessions
- Cookie-based authentication
- Session management

## Why JWT is Deferred

JWT implementation is deferred to allow:
1. **Rapid development**: Header-based auth is faster to implement and test
2. **Clear separation**: Authentication logic is isolated and can be swapped
3. **Incremental hardening**: Security can be improved without breaking changes
4. **Testing simplicity**: Headers are easier to mock in tests

## Architecture Principles

1. **Single Source of Truth**: Permissions are always derived from role
2. **Explicit Over Implicit**: Headers are explicit, not inferred
3. **Fail Secure**: Missing auth = 401, missing permission = 403
4. **Backward Compatible**: OperatorContextDto still works during migration
5. **No Breaking Changes**: API contracts remain unchanged

## Usage Examples

### Protecting an Endpoint

```typescript
@Controller('resource')
@UseGuards(AuthGuard)
export class ResourceController {
  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.CREATE_RESOURCE)
  async create(@Req() request: Request & { auth?: AuthContext }) {
    const authContext = request.auth!; // Guaranteed by guards
    // Use authContext.userId, authContext.storeId, etc.
  }
}
```

### Accessing AuthContext in Controller

```typescript
@Post(':id/action')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions(Permission.ACTION)
async action(
  @Param('id') id: string,
  @Req() request: Request & { auth?: AuthContext },
) {
  const authContext = request.auth!;
  // Bridge to OperatorContextDto if needed
  const operatorContext: OperatorContextDto = {
    operatorId: authContext.userId,
    storeId: authContext.storeId,
  };
  return this.service.action(id, operatorContext);
}
```

## Security Notes

- **Never trust client input**: Always validate headers and DTOs
- **Always validate consistency**: AuthContext must match OperatorContextDto if provided
- **Use AuthContext as source of truth**: Headers override body/query parameters
- **Fail secure**: Missing auth = deny, missing permission = deny
- **No partial enforcement**: All-or-nothing per endpoint
