# Staff Module Spec
Version: 1.0
Status: Source of Truth

---

# Purpose

The staff module manages operational staff members inside a business.

The staff module owns:
- staff profiles
- business staff membership
- staff operational roles
- staff-service assignments
- staff active state

The staff module does NOT own:
- authentication
- scheduling calculations
- availability generation
- booking lifecycle
- payroll or HR systems

---

# Core Philosophy

A staff member is an operational identity inside a business.

Authentication identity belongs to:
- users module

Operational staff context belongs to:
- staff module

A user may:
- own a business
- become staff in one or more businesses
- later become customer as well

Authentication identity and operational role are separate concerns.

---

# Responsibilities

The staff module is responsible for:

- creating staff profiles
- assigning staff to businesses
- assigning operational roles
- assigning services staff can perform
- activating/deactivating staff
- exposing staff management APIs

The staff module is NOT responsible for:
- slot generation
- leave management
- booking conflict calculation
- payment permissions
- payroll management

---

# Future Scheduling Relationship

The staff module provides foundational data for:
- availability module
- scheduling module

Future scheduling systems will consume:
- active status
- service assignments
- business ownership
- staff identity

Scheduling logic itself must remain isolated.

---

# Entity: Staff

## Description

Represents a staff member operating inside a business.

A staff record:
- belongs to one business
- references one user identity
- may perform multiple services

---

# Relationships

## Belongs To
- Business
- User

## Many-To-Many
- Services

---

# Required Fields

- id
- uuid
- businessId
- userId
- role
- displayName
- email
- phone
- profileImageUrl
- bio
- isActive
- joinedAt

Inherited from BaseEntity:
- createdAt
- updatedAt
- createdById
- createdByName
- updatedById
- updatedByName

---

# Staff Roles

Allowed operational roles:

- BUSINESS_OWNER
- BUSINESS_ADMIN
- STAFF

Rules:
- CUSTOMER cannot exist as staff role
- SUPER_ADMIN is platform-level only
- BUSINESS_OWNER should normally exist once per business

---

# Service Assignment Rules

A staff member may:
- perform multiple services

A service may:
- belong to multiple staff members

Relationship:
Many-to-many

Rules:
- inactive staff should not appear in public booking flows
- only assigned staff may perform a service
- service assignment validation must happen server-side

---

# Active State Rules

## isActive = true
Staff:
- visible operationally
- selectable in future scheduling flows
- available for assignment

## isActive = false
Staff:
- hidden from operational assignment
- excluded from public scheduling
- historical bookings remain intact

Never hard delete staff tied to bookings.

---

# Business Ownership Rules

Staff must always belong to a business.

Rules:
- cross-business staff access forbidden unless explicitly supported later
- business scoping required on all queries
- ownership validation required on mutations

---

# API Endpoints

## Create Staff
POST /businesses/:businessUuid/staff

## Get Staff List
GET /businesses/:businessUuid/staff

## Get Staff Detail
GET /businesses/:businessUuid/staff/:staffUuid

## Update Staff
PATCH /businesses/:businessUuid/staff/:staffUuid

## Deactivate Staff
PATCH /businesses/:businessUuid/staff/:staffUuid/deactivate

## Activate Staff
PATCH /businesses/:businessUuid/staff/:staffUuid/activate

## Delete Staff (Optional / Soft Delete Preferred)
DELETE /businesses/:businessUuid/staff/:staffUuid

---

# Authorization Rules

## Allowed Roles

### BUSINESS_OWNER
Can:
- create staff
- update staff
- deactivate staff
- assign services
- view all staff

### BUSINESS_ADMIN
Can:
- create staff
- update staff
- assign services
- view all staff

Cannot:
- delete business owner

### STAFF
Can:
- view own profile
- update limited own profile fields

Cannot:
- manage other staff

### CUSTOMER
No staff management permissions.

---

# DTO Requirements

Required DTOs:

- CreateStaffDto
- UpdateStaffDto
- AssignServicesDto

Validation required:
- class-validator
- whitelist
- transform

Update DTOs must use:
PartialType()

---

# Validation Rules

Always validate:
- business ownership
- role permissions
- service assignment ownership
- duplicate staff relationships
- valid user relationship

Never trust frontend payloads.

---

# Public API Exposure Rules

Never expose:
- internal numeric IDs
- sensitive auth data
- password-related fields
- internal audit fields

Public APIs must use:
- UUID only

---

# Database Rules

Indexes recommended:
- businessId
- userId
- isActive
- role

Rules:
- use transactions for critical multi-write operations
- avoid eager loading
- paginate list endpoints

---

# Soft Delete Rules

Soft delete preferred.

Reason:
- preserve booking history
- preserve audit integrity
- preserve analytics continuity

Use:
deletedAt

Never hard delete staff tied to historical bookings.

---

# Response Standards

All responses must use:
ResponseUtil.success()

Error handling must use:
- NotFoundException
- ConflictException
- ForbiddenException
- BadRequestException

Never throw generic errors.

---

# Future Expansion Notes

The following are intentionally NOT part of Phase 1:

- payroll
- commission tracking
- attendance tracking
- performance analytics
- advanced scheduling logic
- staff shift optimization
- HR systems

Do not implement these unless explicitly requested later.

---

# Engineering Notes

The staff module is foundational infrastructure for:
- scheduling
- bookings
- operational management

Keep the module:
- clean
- modular
- scheduling-agnostic
- business-scoped

Do not couple staff logic directly into booking calculations.