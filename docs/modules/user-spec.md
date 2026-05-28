# Users Module Spec
Version: 1.0
Status: Foundational

This document describes the current `users` module.
Read this before changing account identity, profile behavior, onboarding state, auth sync, or any module that depends on `User.id`.

---

# 1. Purpose

The `users` module owns application account identity.

It answers:

> Which local BookOS user account is this?

It does not own business operations, staff membership, customer profiles, bookings, payments, or scheduling.

Current role in the system:

- Stores the local user record linked to Supabase Auth.
- Provides the local user entity used by `req.user` / `@CurrentUser()`.
- Owns profile reads and profile updates.
- Exports `UserService` so auth and domain modules can resolve local identity.

---

# 2. Source Files

Core files:

- `src/modules/users/user.module.ts`
- `src/modules/users/user.controller.ts`
- `src/modules/users/user.service.ts`
- `src/modules/users/entities/user.entity.ts`
- `src/modules/users/guards/supabase-auth.guard.ts`

Related files:

- `src/common/decorators/current-user.decorator.ts`
- `src/common/interfaces/authenticated-request.interface.ts`
- `src/common/base.entity.ts`
- `docs/modules/auth-spec.md`
- `docs/core/backend-architecture.md`
- `docs/core/engineering-rules.md`

---

# 3. Ownership Boundary

Users owns:

- local account identity
- profile fields
- Supabase-to-local-user syncing
- onboarding completion state
- account-level data that is true across businesses

Users does not own:

- business ownership rules
- staff permissions
- customer records
- service catalog data
- booking lifecycle
- payment status
- notification settings for a business

Domain modules may reference `User.id` internally, but they must own their own domain rules.

Examples:

- `businesses` uses `ownerUserId` to connect a business to its owner.
- `staff` uses `createdById` / `updatedById` audit fields from the authenticated user.
- future booking modules should validate booking access in booking services, not in `UserService`.

---

# 4. Entity Model

The `User` entity lives in:

```txt
src/modules/users/entities/user.entity.ts
```

It extends `BaseEntity`.

Inherited fields:

- `id`: internal numeric primary key; never expose publicly.
- `uuid`: public stable identifier.
- `createdAt`
- `updatedAt`
- `createdById`
- `createdByName`
- `updatedById`
- `updatedByName`

Current user fields:

- `email`
  - unique
  - used today as the primary lookup during Supabase sync
- `name`
  - display name
- `onboardingCompleted`
  - boolean
  - defaults to `false`
- `supabaseId`
  - nullable
  - unique
  - Supabase Auth user id

Important:

- `User.id` is for backend joins and ownership checks.
- `User.uuid` is the public identity if a user reference must be exposed.
- Do not expose `supabaseId` to clients unless there is a clear administrative need.

---

# 5. Module Wiring

`UsersModule` imports:

```ts
TypeOrmModule.forFeature([User])
```

It provides and exports:

```ts
UserService
```

This export is required because `SupabaseAuthGuard` calls `UserService.findOrCreateFromSupabase(...)`.

Do not duplicate user lookup logic in other modules.
Inject `UserService` only when the module truly needs account identity behavior.

---

# 6. Runtime Identity Flow

The usual path to a local user is:

```txt
Bearer token
  -> SupabaseAuthGuard
  -> Supabase getUser(token)
  -> UserService.findOrCreateFromSupabase(...)
  -> local User
  -> req.user / @CurrentUser()
```

After authentication succeeds, downstream modules should treat `req.user` as the local database-backed `User`.

The frontend must not send `userId` for ownership.
Controllers should take the authenticated user from `@CurrentUser()` or `req.user`.

---

# 7. Service API

Current service methods:

- `findOrCreateUser(payload)`
  - Finds a user by email.
  - Creates one with `email` and `name` if missing.
  - This is a generic local entrypoint and is separate from Supabase-specific sync.

- `findOrCreateFromSupabase(user)`
  - Main auth sync entrypoint.
  - Finds a local user by email.
  - Creates one with `email`, `name`, and `supabaseId` if missing.
  - Returns the local `User`.

- `getProfile(userId)`
  - Finds the user by internal numeric id.
  - Throws if not found through TypeORM `findOneOrFail`.

- `updateProfile(userId, data)`
  - Finds the user by internal numeric id.
  - Throws `NotFoundException('User not found')` if missing.
  - Applies supported profile fields and saves.

Current update shape:

```ts
{
  name?: string;
  defaultCurrency?: string;
}
```

Known mismatch:

- `defaultCurrency` is accepted by `updateProfile(...)`, but `User` currently has no `defaultCurrency` column.

---

# 8. Controller API

Base route:

```txt
/users
```

Current endpoints:

- `GET /users/me`
  - Requires authentication.
  - Reads `req.user.id`.
  - Calls `UserService.getProfile(...)`.
  - Returns `ResponseUtil.success(user, 'User fetched successfully')`.

- `PATCH /users/me`
  - Requires authentication through the global guard.
  - Reads `req.user.id`.
  - Calls `UserService.updateProfile(...)`.
  - Returns `ResponseUtil.success(user, 'User updated successfully')`.

Preferred future controller style:

```ts
async getMe(@CurrentUser() user: User) {
  return this.userService.getProfile(user.id);
}
```

Avoid new direct `@Req() req: any` usage when `@CurrentUser()` is enough.

---

# 9. Data Exposure Rules

User entities should not be returned raw long term.

Current code returns the entity directly.
Future user responses should use a response DTO or serializer that exposes only safe fields.

Safe public profile fields usually include:

- `uuid`
- `email`
- `name`
- `onboardingCompleted`
- `createdAt`
- `updatedAt`

Do not expose:

- `id`
- `supabaseId`
- audit user ids
- internal auth/provider metadata
- tokens

This matters because `BaseEntity` contains internal fields that are intended to stay server-side.

---

# 10. Onboarding Responsibility

`User.onboardingCompleted` is account-level onboarding state.

Business setup state belongs to `Business.onboardingStatus`.

Keep the distinction clear:

- User onboarding means the account has completed required account-level steps.
- Business onboarding means a business profile has completed operational setup.

Do not collapse these two states into one flag.

---

# 11. Authorization Rules

The `users` module authenticates and identifies accounts.
It should not become a central place for every domain permission.

Required rules:

- Use authenticated local `User.id` for backend ownership checks.
- Keep business ownership validation in `BusinessesService` or a future authorization service.
- Keep staff membership validation in staff/business services.
- Keep customer and booking access validation in their future modules.

Never trust:

- `userId` from request body
- role claims from the frontend
- business ownership claims from the frontend
- Supabase metadata as the only source of application authorization

---

# 12. Scaling Rules

As the app grows:

- Keep `users` small and account-focused.
- Add customer profile data to a `customers` module, not to `User`, unless it is truly account-wide.
- Add staff membership data to `staff`, not to `User`.
- Add role assignments through a deliberate authorization model, not ad hoc columns.
- Use `User.uuid` publicly and `User.id` internally.
- Keep auth provider identity isolated behind `UserService`.

If multi-business ownership is added later, the relationship should evolve around business ownership or membership tables, not by duplicating user records.

---

# 13. Known Gaps To Fix Later

Observed current gaps:

- `GET /users/me` has duplicate `@Get('me')` decorators.
- `PATCH /users/me` lacks a DTO and validation class.
- `PATCH /users/me` accepts `defaultCurrency`, but the entity has no matching column.
- `UserController` imports and uses `SupabaseAuthGuard` locally even though the guard is already global.
- `UserController` uses `@Req() req: any` instead of `@CurrentUser()`.
- User responses currently return raw entities.
- `findOrCreateFromSupabase(...)` looks up by email first, which may need a clearer account-linking rule if Supabase email changes are supported.

---

# 14. Mental Model For Future AI Agents

Remember:

```txt
Supabase user != BookOS User entity
```

Supabase proves token identity.
The local `User` is the identity the application uses for joins, ownership, audit fields, and domain relationships.

Before changing users, inspect:

1. `docs/modules/auth-spec.md`
2. `src/modules/users/user.service.ts`
3. `src/modules/users/entities/user.entity.ts`
4. `src/modules/businesses/business.service.ts`
5. Any module that consumes `req.user.id` or `@CurrentUser()`

Small user model changes can affect auth, business ownership, audit fields, and future authorization.
