# Auth Module Spec
Version: 1.0
Status: Foundational

This document describes the current authentication foundation for BookOS.
Read this before changing guards, user identity, Supabase integration, or any module that depends on `req.user` / `@CurrentUser()`.

---

# 1. Purpose

Auth answers one question:

> Who is making this request?

It does not decide business ownership, staff permissions, booking access, or role-based authorization by itself.
Those checks belong in the relevant domain service after the authenticated user is known.

BookOS currently centralizes auth identity in the `users` module, backed by Supabase Auth for token verification and a local `users` table for application identity.

---

# 2. Source Files

Core auth files:

- `src/modules/users/guards/supabase-auth.guard.ts`
- `src/modules/users/user.service.ts`
- `src/modules/users/user.controller.ts`
- `src/modules/users/entities/user.entity.ts`
- `src/modules/users/user.module.ts`
- `src/common/providers/supabase.provider.ts`
- `src/common/common.module.ts`
- `src/common/decorators/current-user.decorator.ts`
- `src/common/decorators/public.decorator.ts`
- `src/common/decorators/optional-auth.decorator.ts`
- `src/common/interfaces/authenticated-request.interface.ts`
- `src/app.module.ts`

Related architecture docs:

- `docs/core/backend-architecture.md`
- `docs/core/engineering-rules.md`

---

# 3. Runtime Flow

Auth is enforced globally.

`src/app.module.ts` registers:

```ts
{
  provide: APP_GUARD,
  useClass: SupabaseAuthGuard,
}
```

Request flow:

1. Incoming HTTP request reaches NestJS.
2. `SupabaseAuthGuard` runs before the controller handler.
3. The guard checks metadata for `@Public()`.
4. If the route is public, the guard returns `true` and does not attach a user.
5. If the route is protected, the guard reads `Authorization: Bearer <token>`.
6. The guard verifies the token with `supabase.auth.getUser(token)`.
7. If Supabase rejects the token, the guard throws `UnauthorizedException`.
8. If Supabase returns a user, the guard calls `UserService.findOrCreateFromSupabase(...)`.
9. The local `User` entity is attached to `req.user`.
10. Controllers and services can use that local user for ownership and audit fields.

Important:

- Supabase is the token authority.
- The local `users` table is the application identity authority.
- Domain modules should use the local `User.id` internally and public UUIDs externally.

---

# 4. Supabase Integration

The Supabase client is provided by `SupabaseProvider`.

Configuration keys:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The provider is exported from `CommonModule`, which is marked `@Global()`.

Current client creation:

```ts
createClient(url!, key!)
```

The guard uses:

```ts
this.supabase.auth.getUser(token)
```

Do not create another Supabase client inside feature modules.
Inject the existing `SUPABASE_CLIENT` provider instead.

---

# 5. Local User Identity

The local user entity lives in `src/modules/users/entities/user.entity.ts`.

Current fields:

- `id`: internal numeric primary key inherited from `BaseEntity`; never expose publicly.
- `uuid`: public UUID inherited from `BaseEntity`.
- `email`: unique email address.
- `name`: display name.
- `onboardingCompleted`: local onboarding state.
- `supabaseId`: unique Supabase Auth user id.

`UserService.findOrCreateFromSupabase(...)` is the main auth sync entrypoint.

Current behavior:

1. Look up existing user by email.
2. If not found, create a user with:
   - `email`
   - `name` from `user_metadata.name`, falling back to `User`
   - `supabaseId`
3. Return the local `User`.

Future changes should preserve this invariant:

> After the guard succeeds, `req.user` must be a local `User` entity from the application database.

---

# 6. Request User Access

Preferred controller access:

```ts
@CurrentUser() user: User
```

Fallback access:

```ts
@Req() req
req.user
```

`@CurrentUser()` is defined in `src/common/decorators/current-user.decorator.ts`.
It reads `request.user`, which is populated by `SupabaseAuthGuard`.

Use `AuthenticatedRequest` from `src/common/interfaces/authenticated-request.interface.ts` when a typed request is useful.

Do not read or trust user ids, roles, business ids, or ownership claims from request bodies for authorization.

---

# 7. Public Routes

Use `@Public()` for endpoints that must not require a token.

The guard reads the metadata key from:

```ts
this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),
  context.getClass(),
]);
```

This means `@Public()` can be placed on a controller class or an individual route handler.

Use public routes sparingly.
Typical examples:

- health checks
- public booking pages
- public service listings
- webhook endpoints that use provider signature verification instead of user auth

Even on public routes, never trust client-provided ownership or pricing data.

---

# 8. Optional Auth

`@OptionalAuth()` exists but is not currently implemented by `SupabaseAuthGuard`.

Current reality:

- `OPTIONAL_AUTH_KEY` is defined.
- The guard does not read this metadata.
- Adding `@OptionalAuth()` to a route currently has no effect.

If optional auth is needed later, update the guard so:

1. No token means the request continues with `req.user` unset.
2. A valid token attaches `req.user`.
3. An invalid token still fails with `UnauthorizedException`.

Do not assume optional auth works until the guard explicitly supports it.

---

# 9. Current Endpoints

`UsersController` owns the current profile endpoints.

Base route:

```txt
/users
```

Endpoints:

- `GET /users/me`
  - Requires auth.
  - Reads `req.user.id`.
  - Loads local profile via `UserService.getProfile(...)`.
  - Returns `ResponseUtil.success(user, 'User fetched successfully')`.

- `PATCH /users/me`
  - Requires auth through the global guard.
  - Reads `req.user.id`.
  - Updates local profile fields.
  - Currently accepts inline body shape instead of a DTO.

Known current issue:

- `GET /users/me` has duplicate `@Get('me')` decorators.

---

# 10. Authorization Boundary

Authentication is not authorization.

The auth guard only proves the caller has a valid Supabase token and maps that token to a local user.

Domain services must still validate:

- business ownership
- staff membership
- role permissions
- customer ownership
- resource relationships
- booking access
- payment or webhook authority

Examples:

- `BusinessesService` should validate that `ownerUserId === user.id`.
- Staff writes should validate the authenticated user can manage the target business.
- Booking writes must validate ownership, availability, and scheduling constraints.

Never trust frontend role or ownership claims.

---

# 11. Response And Error Shape

Successful responses should use:

```ts
ResponseUtil.success(data, message)
```

Auth guard failures currently use `UnauthorizedException` with:

```ts
{
  reasonCode: 'NO_TOKEN' | 'INVALID_TOKEN',
  message: 'Missing token' | 'Invalid token',
}
```

Keep auth errors safe and predictable.
Do not expose raw Supabase errors, tokens, stack traces, or implementation details.

---

# 12. Security Rules

Required:

- Verify tokens server-side with Supabase.
- Attach only a database-backed local user to `req.user`.
- Use internal numeric ids only inside the backend.
- Use UUIDs in public API paths and responses.
- Validate ownership inside services.
- Keep auth token values out of logs.
- Use DTO validation for profile updates and auth-adjacent writes.

Forbidden:

- Do not create a second auth system.
- Do not trust user ids from request bodies.
- Do not trust roles from the frontend.
- Do not expose `User.id` publicly.
- Do not bypass the global guard with ad hoc token parsing in controllers.
- Do not put business authorization logic inside the auth guard unless it is truly global.

---

# 13. Extension Rules

When adding auth-related behavior:

1. Keep token verification in `SupabaseAuthGuard`.
2. Keep Supabase client creation in `SupabaseProvider`.
3. Keep local account identity in `UserService` and `User`.
4. Keep profile endpoints in `UsersController`.
5. Put business-specific authorization in business/domain services.
6. Prefer `@CurrentUser()` over raw `@Req()` in new controllers.
7. Add DTOs for write endpoints.
8. Preserve `req.user` as a local `User`.

If roles are added later, prefer a dedicated authorization layer after authentication.
Do not overload the auth guard with every domain rule.

---

# 14. Known Gaps To Fix Later

These are observed from the current codebase and should guide future cleanup:

- `@OptionalAuth()` is defined but unused by the guard.
- `GET /users/me` has duplicate route decorators.
- `PATCH /users/me` does not use a DTO.
- `UsersController` mixes local `@UseGuards(SupabaseAuthGuard)` with a globally registered guard.
- `findOrCreateFromSupabase(...)` looks up users by email first; if email changes in Supabase, account linking behavior may need a clearer rule.
- User/profile responses currently return entities directly; future work should avoid exposing internal fields and use response DTOs or serialization consistently.
- Authorization beyond authentication is not yet centralized.

---

# 15. Mental Model For Future AI Agents

When you need to understand auth, remember this chain:

```txt
Bearer token
  -> SupabaseAuthGuard
  -> Supabase getUser(token)
  -> UserService.findOrCreateFromSupabase(...)
  -> local User entity
  -> req.user / @CurrentUser()
  -> domain service authorization
```

Do not start by inventing an `auth` module.
The current foundation places authentication identity in `users`, while domain modules own authorization context.

Before changing auth, inspect:

1. `src/app.module.ts`
2. `src/modules/users/guards/supabase-auth.guard.ts`
3. `src/modules/users/user.service.ts`
4. `src/common/decorators/current-user.decorator.ts`
5. The domain service that consumes `user.id`

This is foundational infrastructure.
Small changes here can affect every protected endpoint.
