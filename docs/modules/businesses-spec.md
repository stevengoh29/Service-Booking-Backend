# Businesses Module Spec
Version: 1.0
Status: Foundational

This document describes the current `businesses` module.
Read this before changing business ownership, public business identity, onboarding state, business configuration, or any module scoped by `businessUuid`.

---

# 1. Purpose

The `businesses` module owns the merchant/business workspace.

It answers:

> Which business is being operated, configured, or shown publicly?

In BookOS, a business is the main operational container for:

- service catalog
- staff
- availability
- bookings
- customer-facing brand identity
- business settings
- business onboarding
- future payments and notifications setup

The `users` module owns account identity.
The `businesses` module owns business context.

---

# 2. Source Files

Core files:

- `src/modules/businesses/business.module.ts`
- `src/modules/businesses/business.controller.ts`
- `src/modules/businesses/business.service.ts`
- `src/modules/businesses/entities/business.entity.ts`
- `src/modules/businesses/dto/create-business.dto.ts`
- `src/modules/businesses/dto/update-business.dto.ts`

Enums:

- `src/modules/businesses/enums/business-onboarding-status.enum.ts`
- `src/modules/businesses/enums/business-staff-selection-mode.enum.ts`
- `src/modules/businesses/enums/subscription-tier.enum.ts`

Related files:

- `src/modules/users/entities/user.entity.ts`
- `src/modules/staff/entities/staff.entity.ts`
- `src/common/utils/slugify.util.ts`
- `docs/modules/auth-spec.md`
- `docs/modules/user-spec.md`
- `docs/core/backend-architecture.md`
- `docs/core/engineering-rules.md`

---

# 3. Ownership Boundary

Businesses owns:

- business profile
- business public slug
- owner-to-business relationship
- customer-facing business contact details
- location fields
- locale, timezone, and currency defaults
- business category
- business onboarding status
- subscription tier
- custom domain flags
- business-level settings and metadata
- staff selection mode

Businesses does not own:

- authentication
- account profile fields
- staff entity details
- service catalog entity details
- scheduling calculations
- booking lifecycle
- payment provider transactions
- notification delivery logs

Other modules can be scoped under a business, but they should own their own domain rules.

---

# 4. Entity Model

The `Business` entity lives in:

```txt
src/modules/businesses/entities/business.entity.ts
```

It extends `BaseEntity`.

Inherited fields:

- `id`: internal numeric primary key; never expose publicly.
- `uuid`: public stable identifier for API paths.
- `createdAt`
- `updatedAt`
- `createdById`
- `createdByName`
- `updatedById`
- `updatedByName`

Indexes and uniqueness:

- unique `slug`
- index on `ownerUserId`
- index on `slug`
- index on `isActive`

Core ownership:

- `ownerUserId`
  - internal numeric id of the owning local user
  - Phase 1 rule: one owner user has one business
- `owner`
  - `ManyToOne` relation to `User`

Public brand identity:

- `name`
- `slug`
- `logo`

Customer contact layer:

- `businessWhatsappNumber`
- `contactPhone`
- `contactEmail`

Location:

- `address`
- `city`
- `province`
- `country`

Localization:

- `timezone`
- `locale`
- `currency`

Business classification:

- `businessCategory`

Operational status:

- `onboardingStatus`
- `subscriptionTier`
- `isActive`

Domain and activation:

- `customDomain`
- `customDomainVerified`

Flexible config:

- `operatingHours`
- `settings`
- `socialLinks`
- `seoMetadata`
- `metadata`

Staff behavior:

- `staffSelectionMode`
- `staff`

---

# 5. Current Defaults

When a business is created, `BusinessesService.createBusiness(...)` sets:

```ts
timezone: 'Asia/Jakarta'
locale: 'id-ID'
currency: 'IDR'
```

Entity-level defaults include:

- `country`: `Indonesia`
- `onboardingStatus`: `DRAFT`
- `subscriptionTier`: `FREE`
- `customDomainVerified`: `false`
- `isActive`: `true`
- JSONB config fields: `{}`
- `staffSelectionMode`: `NO_SELECTION`

Do not change these defaults casually.
They define the initial Indonesia-first operating mode of the product.

---

# 6. Module Wiring

`BusinessesModule` imports:

```ts
TypeOrmModule.forFeature([Business])
```

It provides and exports:

```ts
BusinessesService
```

Exporting the service allows other modules to resolve business context.

When other modules need to validate a business, prefer using a shared method from `BusinessesService` rather than duplicating business lookup and ownership logic.
The current staff module still performs its own business lookup directly.

---

# 7. Controller API

Base route:

```txt
/businesses
```

Current endpoints:

- `POST /businesses`
  - Requires authenticated user through global auth guard.
  - Reads `@CurrentUser()`.
  - Creates a business owned by `user.id`.
  - Phase 1 allows only one business per owner.

- `GET /businesses/me`
  - Requires authenticated user.
  - Returns the current user's owned business.

- `PATCH /businesses/me`
  - Requires authenticated user.
  - Updates the current user's owned business.
  - Regenerates slug if the slug changes.

Response shape:

```ts
ResponseUtil.success(data, message)
```

Public business pages should use future explicit public endpoints, usually by slug or UUID, and must not expose internal ids.

---

# 8. Service Behavior

Current service methods:

- `createBusiness(userId, dto)`
  - Checks whether the owner already has a business.
  - Throws `ConflictException` if one exists.
  - Generates a slug from `dto.slug` or `dto.name`.
  - Saves the business with owner id and default localization.

- `getMyBusiness(userId)`
  - Finds a business by `ownerUserId`.
  - Throws `NotFoundException('Business not found')` if missing.

- `updateMyBusiness(userId, dto)`
  - Loads the current user's business.
  - If `dto.slug` changes, generates a unique slug.
  - Applies updates and saves.

- `generateUniqueSlug(baseSlug, excludeId?)`
  - Slugifies the base.
  - Checks uniqueness.
  - Appends `-1`, `-2`, etc. until available.

Important:

- User input slug is validated by DTO as lowercase kebab-case.
- Service still calls `slugify(...)` before persistence.
- Slug is globally unique today, not per owner.

---

# 9. DTO Rules

Create DTO:

```txt
src/modules/businesses/dto/create-business.dto.ts
```

It validates:

- name
- slug format
- logo
- business WhatsApp number
- contact phone
- contact email
- address
- city
- province
- business category
- operating hours
- settings
- social links
- SEO metadata
- metadata
- staff selection mode

Update DTO:

```txt
src/modules/businesses/dto/update-business.dto.ts
```

It uses:

```ts
PartialType(CreateBusinessDto)
```

Future business writes must keep DTO validation.
Do not accept raw arbitrary business updates directly from request bodies.

---

# 10. UUID And ID Rules

Public API paths should use:

```txt
businessUuid
```

Internal joins should use:

```txt
business.id
```

Current example:

```txt
/businesses/:businessUuid/staff
```

The staff module resolves `businessUuid` into internal `business.id`, then uses `businessId` for staff queries.

Never expose `business.id` publicly.
Never trust a client-supplied internal id.

---

# 11. Authorization Rules

Authentication only proves who the user is.
Business authorization proves what business the user can operate.

Current owner rule:

```txt
business.ownerUserId === user.id
```

Required for protected business-owner operations:

- Create business using authenticated `user.id`, not body owner fields.
- Read "my business" by authenticated `user.id`.
- Update "my business" by authenticated `user.id`.
- For nested modules, validate the authenticated user can operate the target business.

Important current gap:

- Staff routes resolve business by UUID, but current staff service does not validate that `req.user` owns or can manage the business before writes.

Future modules under `/businesses/:businessUuid/...` must validate:

1. business exists
2. user has permission for that business
3. target resource belongs to that business

---

# 12. JSONB Config Rules

Business uses JSONB for flexible, low-refactor configuration:

- `operatingHours`
- `settings`
- `socialLinks`
- `seoMetadata`
- `metadata`

Good use cases:

- display preferences
- public profile metadata
- social profile links
- SEO fields
- migration flags
- onboarding metadata
- small configuration objects

Avoid JSONB for:

- bookings
- payments
- staff relationships
- service relationships
- transactional history
- anything requiring frequent relational queries

If a JSONB field starts driving core query behavior, consider a normalized table or indexed column.

---

# 13. Onboarding And Subscription

Business onboarding is tracked by `BusinessOnboardingStatus`.

Current values:

- `DRAFT`
- `PROFILE_COMPLETED`
- `SERVICES_ADDED`
- `PAYMENT_CONNECTED`
- `WHATSAPP_CONNECTED`
- `COMPLETED`

Subscription tier is tracked by `SubscriptionTier`.

Current values:

- `FREE`
- `STARTER`
- `PRO`
- `BUSINESS`

Keep account onboarding separate from business onboarding:

- `User.onboardingCompleted` is account-level.
- `Business.onboardingStatus` is workspace-level.

Payment and WhatsApp setup state is not fully implemented yet.
Do not fake those states from frontend success alone.

---

# 14. Staff Selection Mode

`BusinessStaffSelectionMode` controls how booking flows should choose staff.

Current values:

- `NO_SELECTION`
- `CUSTOMER_SELECT`
- `AUTO_ASSIGN`

Expected meaning:

- `NO_SELECTION`: customers do not choose staff.
- `CUSTOMER_SELECT`: customers can pick a staff member.
- `AUTO_ASSIGN`: system assigns staff based on future scheduling logic.

Scheduling and booking modules must respect this value once implemented.
Do not duplicate this setting in service or staff modules.

---

# 15. Scaling Rules

As the app grows:

- Treat `Business` as the main tenant/workspace boundary.
- Keep business ownership validation close to business/domain services.
- Use `businessUuid` in public routes.
- Use `business.id` for internal joins.
- Keep business profile separate from service catalog, bookings, payments, and notifications.
- Avoid putting large operational workflows directly in `BusinessesService`.
- Add helper methods for common business lookup and authorization instead of duplicating queries across modules.
- Preserve the Phase 1 one-owner-one-business rule until a deliberate multi-business design replaces it.

If multi-business ownership is introduced later, prefer explicit owner/member/role structures over changing the meaning of `ownerUserId` in place.

---

# 16. Known Gaps To Fix Later

Observed current gaps:

- Business responses currently return raw entities.
- `createdById`, `createdByName`, `updatedById`, and `updatedByName` are not set during business create/update.
- `BusinessesController` has a commented `@UseGuards(SupabaseAuthGuard)` even though auth is global.
- There is no reusable `findByUuidOrFail(...)` method in `BusinessesService` yet.
- Nested modules such as staff duplicate business lookup logic.
- Staff writes under a business do not currently validate that the authenticated user owns or can manage the business.
- Phase 1 one-business-per-owner is enforced only in service logic; if this remains important, consider a database-level uniqueness rule on `ownerUserId`.
- Public business lookup by slug is not implemented yet.
- Custom domain verification fields exist, but verification workflow is not implemented.
- Payment and notification setup fields are commented out and should not be assumed active.

---

# 17. Mental Model For Future AI Agents

Remember:

```txt
User = account identity
Business = operational workspace
businessUuid = public business reference
business.id = internal join key
ownerUserId = current Phase 1 ownership link
```

Before changing businesses, inspect:

1. `docs/modules/auth-spec.md`
2. `docs/modules/user-spec.md`
3. `src/modules/businesses/entities/business.entity.ts`
4. `src/modules/businesses/business.service.ts`
5. Any nested module using `businessUuid` or `businessId`

Most future modules will hang off `Business`.
That makes this module foundational for authorization, tenant scoping, and public booking experiences.
