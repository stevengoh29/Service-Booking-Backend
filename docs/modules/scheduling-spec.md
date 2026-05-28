# Scheduling Module Spec
Version: 1.0
Status: Source of Truth

---

# Purpose

The scheduling module is the temporal calculation engine of BookOS.

The scheduling module owns:
- slot generation
- overlap detection
- duration fitting
- booking conflict validation
- unified slot merging
- reschedule validation
- staff assignment logic
- future temporary slot reservation

The scheduling module does NOT own:
- booking persistence
- payment processing
- notification sending
- customer CRM
- business operating hours storage

---

# Core Philosophy

The scheduling engine has one responsibility:

"Only show customers slots that are actually valid."

The scheduling engine is:
- deterministic
- validation-driven
- availability-aware
- booking-aware

Scheduling calculations must remain isolated from:
- controllers
- generic CRUD logic
- booking persistence logic

---

# Scheduling Inputs

Scheduling engine consumes:

- services
- staff
- business operating hours
- staff working hours
- blocked times
- leave periods
- existing bookings

---

# Scheduling Outputs

Scheduling engine outputs:
- valid customer-facing slots
- scheduling conflict validation
- reschedule validation
- available staff combinations

The scheduling module does NOT create bookings.

---

# Core Scheduling Rules

A slot is valid only when:

1. Business is open
2. Staff is active
3. Staff can perform service
4. Staff is scheduled to work
5. Staff is not on leave
6. No blocked time overlaps
7. No booking overlaps
8. Full service duration fits
9. Buffer rules are respected

If any rule fails:
slot is invalid.

---

# Core Concepts

## Slot

Represents a customer-bookable start time.

Example:
- 14:00

NOT:
- arbitrary timestamps
- freeform negotiation

Customer-facing scheduling should remain structured.

---

## Duration Fitting

Scheduling engine must ensure:

startTime + durationMinutes
fits fully inside:
- business hours
- staff working hours

Example:
- Service duration: 90 mins
- Business closes: 20:00
- Last valid slot: 18:30

---

## Overlap Detection

A booking overlaps when:

newStart < existingEnd
AND
newEnd > existingStart

Overlapping bookings are invalid.

Scheduling engine must never:
- silently overwrite bookings
- auto-move existing bookings

---

# Staff Assignment Modes

Supported modes:

## NO_STAFF_SELECTION
Customer chooses:
- service
- time

System internally assigns staff later.

---

## CUSTOMER_SELECTS_STAFF
Customer chooses:
- service
- staff
- time

Only selected staff availability shown.

---

## AUTO_ASSIGN
Scheduling engine:
- merges all valid staff availability
- returns unified slot pool

Customer sees:
- available slots only

---

# Unified Slot Merging

When multiple staff can perform service:

Scheduling engine may merge:
- overlapping valid slots
- duplicate availability windows

Purpose:
- cleaner customer UX
- simplified booking selection

Scheduling engine should not expose:
- duplicate identical slots unnecessarily

---

# Slot Interval Rules

Phase 1:
- configurable slot interval

Examples:
- 15 minutes
- 30 minutes

Rules:
- interval independent from service duration
- duration determines slot occupancy
- interval determines slot generation cadence

---

# Buffer Rules

Phase 1:
- optional global buffer support

Examples:
- 15 min cleanup time
- prep time

Effective booking duration:

serviceDuration + buffer

Buffer must be respected during:
- slot generation
- overlap checks
- reschedule validation

---

# Reschedule Validation Rules

Reschedule flow:
- validates new slot
- validates duration fit
- validates overlap conflicts

Scheduling engine never:
- auto-cascades bookings
- auto-moves downstream customers

Manual operational decisions remain with SMB.

---

# Manual Override Validation

Dashboard may allow:
- arbitrary manual booking times

Example:
- 13:45 instead of 14:00

Scheduling engine must:
- validate overlap
- validate duration fit
- validate availability

If invalid:
- return conflict error

Never silently bypass conflicts.

---

# Slot Generation Flow

Example flow:

1. Select service
2. Determine duration
3. Determine eligible staff
4. Load business hours
5. Load staff schedules
6. Remove leave periods
7. Remove blocked periods
8. Remove booking conflicts
9. Apply duration fit checks
10. Apply buffer checks
11. Generate valid slots

---

# Scheduling Query Inputs

Required:
- businessUuid
- serviceUuid
- date

Optional:
- staffUuid
- timezone

---

# Scheduling Query Outputs

Slot result should include:

- slotStart
- slotEnd
- availableStaffIds
- serviceDurationMinutes

Public APIs must use:
- UUID only

Never expose:
- internal IDs
- sensitive operational metadata

---

# Timezone Rules

Phase 1:
- business timezone only

All scheduling calculations must use:
- business timezone

Never assume:
- server timezone
- browser timezone

Timezone normalization required.

---

# Scheduling Constraints

Maximum scheduling range:
- configurable

Recommended Phase 1:
- 30–60 days ahead

Prevent:
- infinite slot generation
- excessive query load

---

# Temporary Reservation (Future)

Phase 1:
- no soft locking yet

Future support:
- temporary slot reservation during payment

Do NOT implement reservation expiration yet unless explicitly requested.

---

# Public Scheduling APIs

## Get Available Slots
GET /public/businesses/:businessSlug/services/:serviceSlug/slots

Query:
- date
- optional staffUuid

---

## Validate Manual Slot
POST /internal/scheduling/validate-slot

Purpose:
- dashboard validation
- manual override validation

---

# Internal Scheduling Service Rules

Scheduling logic should live in:
- dedicated scheduling services

Never:
- duplicate overlap logic
- calculate slots in controllers
- calculate slots inside bookings module

Scheduling engine must remain centralized.

---

# Authorization Rules

## Public
Public users may:
- query public slots

---

## BUSINESS_OWNER
Can:
- validate internal scheduling
- use manual override validation

---

## BUSINESS_ADMIN
Can:
- validate scheduling
- use dashboard scheduling tools

---

## STAFF
May:
- view operational schedule later

---

# DTO Requirements

Required DTOs:
- GetAvailableSlotsDto
- ValidateManualSlotDto

Validation required:
- class-validator
- whitelist
- transform

---

# Validation Rules

Always validate:
- business ownership
- service ownership
- staff ownership
- valid time ranges
- valid timezone usage
- scheduling boundaries

Never trust frontend slot assumptions.

All scheduling validation must happen server-side.

---

# Error Handling Rules

Use:
- BadRequestException
- ConflictException
- NotFoundException
- ForbiddenException

Conflict examples:
- overlapping booking
- outside business hours
- inactive staff
- blocked time overlap

Never throw generic errors.

---

# Database Rules

Scheduling queries must be optimized.

Indexes recommended:
- booking start/end times
- staffId
- businessId
- date ranges

Avoid:
- eager loading
- unnecessary joins
- full table scans

Pagination not required for slot generation responses.

---

# Performance Rules

Scheduling engine is performance-sensitive.

Rules:
- minimize DB round trips
- avoid N+1 queries
- cache stable availability when possible later
- keep calculations deterministic

---

# Future Expansion Notes

The following are intentionally NOT part of Phase 1:

- AI scheduling
- predictive optimization
- auto-cascade rescheduling
- load balancing
- smart staff optimization
- multi-location scheduling
- cross-business staff pools
- calendar sync integrations

Do not implement unless explicitly requested later.

---

# Engineering Notes

Scheduling engine is core BookOS infrastructure.

This module is considered:
- business-critical
- reliability-critical
- future moat infrastructure

Prioritize:
- correctness
- predictability
- deterministic validation
- clean architecture

Never prioritize:
- clever abstractions
- premature optimization
- hidden automation