# Services Module Spec
Version: 1.0
Status: Source of Truth

---

# Purpose

The services module manages the business service catalog for customer booking flows.

The services module owns:
- service catalog
- service pricing
- service duration
- service visibility
- deposit configuration
- service categories
- staff-service assignments
- service media

The services module does NOT own:
- slot generation
- scheduling calculations
- booking lifecycle
- payment processing
- availability logic

---

# Core Philosophy

A service represents a customer-bookable operational offering.

Examples:
- Hydra Facial
- Hair Coloring
- Lash Extension
- Nail Gel Polish

Services are foundational scheduling inputs.

Service definitions drive:
- booking eligibility
- duration calculation
- staff compatibility
- deposit requirements

---

# Responsibilities

The services module is responsible for:

- creating services
- updating services
- categorizing services
- assigning staff to services
- managing pricing
- managing durations
- managing deposit settings
- exposing public service catalog APIs

The services module is NOT responsible for:
- availability calculation
- overlap detection
- slot generation
- scheduling conflicts
- booking confirmation
- payment settlement

---

# Relationship To Scheduling System

The scheduling engine consumes service data.

Critical scheduling inputs:
- durationMinutes
- assigned staff
- active state

Future scheduling systems may also consume:
- cleanup buffers
- booking lead times
- preparation durations

Scheduling logic itself must remain isolated.

---

# Entity: Service

## Description

Represents a customer-bookable service inside a business.

A service:
- belongs to one business
- may belong to one category
- may be assigned to multiple staff members
- may require deposits
- may contain images and metadata

---

# Relationships

## Belongs To
- Business
- ServiceCategory (optional)

## Many-To-Many
- Staff

---

# Required Fields

Core:
- id
- uuid
- businessId
- categoryId
- name
- slug
- shortDescription
- fullDescription
- durationMinutes
- basePrice
- currency
- isActive

Deposit:
- requiresDeposit
- depositType
- depositAmount
- depositMessage
- isDepositNonRefundable

Media:
- coverImageUrl
- images

Metadata:
- sortOrder

Inherited from BaseEntity:
- createdAt
- updatedAt
- createdById
- createdByName
- updatedById
- updatedByName

---

# Service Categories

Categories are used for:
- public catalog grouping
- frontend filtering
- operational organization

Examples:
- Facial
- Hair
- Body Treatment
- Nails
- Lashes

Rules:
- categories scoped per business
- categories optional in Phase 1
- category deletion should not silently delete services

---

# Duration Rules

durationMinutes is mandatory.

Purpose:
- scheduling calculations
- slot fitting
- overlap detection

Rules:
- durationMinutes must be greater than 0
- duration must represent total customer appointment duration
- scheduling engine uses total duration only

Examples:
- Facial: 90
- Hair Coloring: 180
- Lash Extension: 120

Do NOT split services into operational steps in Phase 1.

---

# Pricing Rules

basePrice represents:
- displayed customer-facing price

Rules:
- must be non-negative
- currency standardized per business
- pricing belongs to service definition

Phase 1 does NOT support:
- dynamic pricing
- surge pricing
- time-based pricing
- staff-tier pricing

---

# Deposit Rules

Deposits are configurable per service.

Supported:
- no deposit
- fixed amount deposit
- percentage deposit

Required fields:
- requiresDeposit
- depositType
- depositAmount

Deposit types:
- FIXED
- PERCENTAGE

Rules:
- depositAmount cannot exceed basePrice
- percentage deposit must be between 1-100
- deposit configuration validated server-side

Phase 1 refunds remain manual.

---

# Staff Assignment Rules

A service may:
- be assigned to multiple staff members

A staff member may:
- perform multiple services

Relationship:
Many-to-many

Rules:
- only assigned staff can perform service
- inactive staff excluded operationally
- assignment validation required server-side

Future scheduling engine depends on these relationships.

---

# Active State Rules

## isActive = true
Service:
- visible publicly
- bookable
- available operationally

## isActive = false
Service:
- hidden from booking flow
- excluded from scheduling results
- historical bookings preserved

Never hard delete services tied to bookings.

---

# Slug Rules

slug is mandatory.

Purpose:
- SEO
- public URLs
- customer-facing routes

Rules:
- lowercase
- kebab-case
- unique per business
- collision-safe

Examples:
- hydra-facial
- hair-coloring-premium

---

# Service Media Rules

Services may contain:
- cover image
- image gallery

Phase 1:
- maximum 5 images recommended

Media is customer-facing only.

No media processing logic inside services module.

---

# Public Visibility Rules

Public booking pages may access:
- active services only
- customer-safe fields only

Never expose:
- internal IDs
- audit fields
- internal operational metadata

Public APIs must use:
- UUID only

---

# API Endpoints

## Create Service
POST /businesses/:businessUuid/services

## Get Service List
GET /businesses/:businessUuid/services

## Get Public Service List
GET /public/businesses/:businessSlug/services

## Get Service Detail
GET /businesses/:businessUuid/services/:serviceUuid

## Get Public Service Detail
GET /public/businesses/:businessSlug/services/:serviceSlug

## Update Service
PATCH /businesses/:businessUuid/services/:serviceUuid

## Activate Service
PATCH /businesses/:businessUuid/services/:serviceUuid/activate

## Deactivate Service
PATCH /businesses/:businessUuid/services/:serviceUuid/deactivate

## Delete Service
DELETE /businesses/:businessUuid/services/:serviceUuid

---

# Authorization Rules

## BUSINESS_OWNER
Can:
- create services
- update services
- delete services
- assign staff
- manage deposits

## BUSINESS_ADMIN
Can:
- create services
- update services
- assign staff

Cannot:
- delete protected business resources if restricted later

## STAFF
Can:
- view assigned services
- optionally view catalog operationally

Cannot:
- create/update/delete services

## CUSTOMER
Can:
- access public active services only

---

# DTO Requirements

Required DTOs:
- CreateServiceDto
- UpdateServiceDto
- AssignStaffDto

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
- category ownership
- staff ownership
- slug uniqueness
- valid deposit configuration
- valid duration
- image constraints

Never trust frontend payloads.

---

# Public API Exposure Rules

Never expose:
- internal numeric IDs
- audit fields
- internal operational notes

Public APIs must use:
- UUID
- slug

---

# Database Rules

Indexes recommended:
- businessId
- slug
- categoryId
- isActive

Rules:
- paginate list endpoints
- avoid eager loading
- use transactions for critical multi-write operations

---

# Soft Delete Rules

Soft delete preferred.

Reason:
- preserve booking history
- preserve analytics continuity
- preserve audit integrity

Use:
deletedAt

Never hard delete services tied to historical bookings.

---

# Response Standards

All responses must use:
ResponseUtil.success()

Errors must use:
- BadRequestException
- ConflictException
- NotFoundException
- ForbiddenException

Never throw generic errors.

---

# Future Expansion Notes

The following are intentionally NOT part of Phase 1:

- dynamic pricing
- AI recommendations
- service bundles
- package memberships
- inventory deduction
- multi-step treatment flows
- service variants
- franchise-level shared catalogs

Do not implement unless explicitly requested later.

---

# Engineering Notes

The services module is foundational infrastructure for:
- scheduling
- bookings
- customer conversion

Keep the module:
- modular
- scheduling-agnostic
- business-scoped
- customer-safe

Do not place:
- slot generation
- scheduling logic
- booking conflict logic

inside the services module.