# BookOS Backend Architecture
Version: 1.0
Status: Source of Truth

---

# 1. System Philosophy

BookOS is a modular Service Commerce OS built for service SMBs.

The backend architecture prioritizes:

- Booking reliability
- Scalability without painful refactors
- Clear domain ownership
- Predictable APIs
- Operational simplicity
- AI-assisted maintainability

The architecture must remain understandable and scalable when serving:
- 1 business
- 1,000 SMBs
- multiple service verticals

---

# 2. Core Engineering Principles

## 2.1 Identity Is Centralized

Authentication identity is centralized.

`users` owns:
- authentication
- credentials
- login state
- account identity

Domain modules own operational context.

Examples:
- `staff` owns staff operations
- `customers` owns customer operations
- `bookings` owns booking lifecycle

---

## 2.2 Modular Domain Architecture

Backend structure is domain-first.

Example:

src/modules/
  auth/
  users/
  businesses/
  staff/
  customers/
  services/
  availability/
  scheduling/
  bookings/
  payments/
  notifications/
  analytics/

Each module owns:
- controllers
- services
- entities
- DTOs
- repository logic
- business rules

Cross-domain coupling should remain minimal.

---

# 3. Base Entity Standards

Every major entity must inherit from BaseEntity.

Required fields:

- id
- uuid
- createdAt
- updatedAt
- createdById
- createdByName
- updatedById
- updatedByName

Rules:

## Internal Numeric IDs
- used for joins
- never exposed publicly

## UUID
- used in APIs
- used externally
- safe for public references

---

# 4. API Standards

All API responses must follow standardized structure.

Example:

{
  "success": true,
  "message": "Service fetched successfully",
  "data": {}
}

Controllers must use:
ResponseUtil.success()

Errors must use proper NestJS exceptions.

Never throw generic errors.

---

# 5. DTO Standards

Every write operation requires DTO validation.

Required:
- class-validator
- whitelist
- transform

Rules:

## Create DTO
Strict validation.

## Update DTO
Use PartialType().

No direct entity mutation from request bodies.

---

# 6. Authorization Architecture

Authentication and authorization are separate concerns.

Flow:
1. Authentication
2. Authorization
3. Ownership validation

Roles:

- SUPER_ADMIN
- BUSINESS_OWNER
- BUSINESS_ADMIN
- STAFF
- CUSTOMER

Rules:
- never trust frontend role claims
- always validate permissions server-side

---

# 7. Scheduling System Architecture

Scheduling is a dedicated system.

It must remain isolated from generic booking CRUD.

Core modules:
- availability
- scheduling
- bookings

Scheduling responsibilities:
- slot generation
- overlap detection
- buffer calculations
- staff availability
- soft locks
- reschedule validation

Bookings module should consume scheduling results.

---

# 8. Booking Reliability Doctrine

Booking consistency is sacred.

Never:
- silently overwrite conflicts
- auto-reschedule customers
- bypass conflict checks

Every booking write operation must:
- validate slot availability
- validate staff availability
- validate duration constraints

---

# 9. Database Principles

Primary database:
PostgreSQL

ORM:
TypeORM

Guidelines:
- prefer explicit relations
- avoid eager loading
- use indexes intentionally
- paginate all list endpoints
- use transactions for critical writes

---

# 10. JSONB Usage

Use JSONB only for flexible structures.

Good:
- settings
- metadata
- operatingHours
- preferences
- socialLinks

Avoid JSONB for:
- bookings
- relationships
- transactional records

---

# 11. Soft Delete Policy

Soft delete preferred for:
- bookings
- payments
- customers

Use:
deletedAt

Never hard delete critical transactional history.

---

# 12. Payment Architecture

Payments must be idempotent.

All payment webhooks:
- verified
- logged
- idempotent

Payment providers:
- Xendit
- Midtrans

Booking confirmation logic must not depend on frontend success state.

Webhook is source of truth.

---

# 13. Notification Architecture

Notifications are asynchronous.

Never block booking flow waiting for:
- WhatsApp send
- email send
- analytics events

Use queues for:
- reminders
- follow-ups
- delayed notifications

---

# 14. Scalability Doctrine

Avoid:
- premature microservices
- over-abstraction
- generic mega-services

Prefer:
- modular monolith
- clean boundaries
- extract later when proven necessary

---

# 15. Anti-Patterns

Never:

- expose internal numeric IDs
- place business logic in controllers
- couple scheduling logic into controllers
- use massive god services
- bypass DTO validation
- bypass authorization guards
- auto-move bookings silently
- create duplicate auth systems

---

# 16. Engineering North Star

Every technical decision should improve at least one:

- booking conversion
- scheduling reliability
- operational efficiency
- scalability
- maintainability
- onboarding speed

If a solution increases complexity without improving these:
do not build it.