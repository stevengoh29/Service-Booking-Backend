# Availability Module Spec
Version: 1.0
Status: Source of Truth

---

# Purpose

The availability module manages operational time availability for businesses and staff.

The availability module owns:
- business operating hours
- staff working hours
- break periods
- blocked times
- leave periods
- special closures

The availability module does NOT own:
- slot generation
- booking lifecycle
- scheduling calculations
- payment logic
- customer booking flow

---

# Core Philosophy

Availability defines:
"When can this business or staff theoretically operate?"

It does NOT define:
"What customer booking slots exist?"

Availability is foundational infrastructure consumed by:
- scheduling module
- booking validation
- future calendar systems

---

# Responsibilities

The availability module is responsible for:

- managing business operating hours
- managing staff schedules
- managing leave periods
- managing blocked operational periods
- exposing availability configuration APIs

The availability module is NOT responsible for:
- overlap detection
- slot generation
- customer-facing scheduling
- booking creation
- auto-assignment logic

---

# Relationship To Scheduling

Scheduling engine consumes:
- operating hours
- blocked periods
- leave periods
- service duration
- booking reservations

Availability itself does not generate customer slots.

---

# Core Entities

## BusinessOperatingHours

Represents recurring business operating hours.

Examples:
- Monday 09:00–20:00
- Tuesday CLOSED

Fields:
- id
- uuid
- businessId
- dayOfWeek
- startTime
- endTime
- isClosed

Rules:
- one record per day
- endTime must be after startTime

---

## StaffWorkingHours

Represents recurring staff working schedule.

Fields:
- id
- uuid
- businessId
- staffId
- dayOfWeek
- startTime
- endTime
- isOffDay

Rules:
- staff schedule may differ from business hours
- cannot exceed business closure windows unless explicitly supported later

---

## StaffLeave

Represents one-off leave periods.

Examples:
- sick leave
- vacation
- emergency leave

Fields:
- id
- uuid
- businessId
- staffId
- startDate
- endDate
- reason
- isApproved

Rules:
- leave blocks scheduling availability
- historical leave preserved

---

## BlockedTime

Represents temporary blocked operational periods.

Examples:
- lunch break
- maintenance
- emergency closure
- meeting time

Fields:
- id
- uuid
- businessId
- staffId (nullable)
- startDateTime
- endDateTime
- reason

Rules:
- may apply business-wide
- may apply to individual staff
- blocks future scheduling

---

# Availability Rules

Availability is valid only when:
- business open
- staff active
- staff not on leave
- no blocked period exists

Availability does NOT:
- validate customer booking conflicts
- reserve slots
- calculate durations

---

# Business Hours Rules

Business hours define:
- operational opening windows

Rules:
- business may close fully on specific days
- recurring schedules supported
- special closures override recurring schedules

Examples:
- Monday 09:00–20:00
- Sunday CLOSED

---

# Staff Schedule Rules

Staff schedules define:
- when staff may theoretically work

Rules:
- staff may have different hours
- staff may have off days
- inactive staff excluded operationally

Examples:
- Staff A: 10:00–18:00
- Staff B: 12:00–20:00

---

# Blocked Time Rules

Blocked periods override normal schedules.

Examples:
- lunch break
- emergency closure
- equipment maintenance

Rules:
- blocked time always wins
- overlapping blocked periods allowed
- scheduling engine consumes blocked windows

---

# Leave Rules

Leave periods fully remove staff operational availability.

Rules:
- leave prevents scheduling assignment
- leave preserved historically
- leave may span multiple days

---

# Timezone Rules

Phase 1:
- single business timezone only

All availability calculations must use:
- business timezone

Do not assume server timezone.

---

# API Endpoints

## Business Operating Hours

GET    /businesses/:businessUuid/availability/business-hours
PATCH  /businesses/:businessUuid/availability/business-hours

---

## Staff Working Hours

GET    /businesses/:businessUuid/staff/:staffUuid/availability
PATCH  /businesses/:businessUuid/staff/:staffUuid/availability

---

## Staff Leave

POST   /businesses/:businessUuid/staff/:staffUuid/leave
GET    /businesses/:businessUuid/staff/:staffUuid/leave
PATCH  /businesses/:businessUuid/staff/:staffUuid/leave/:leaveUuid
DELETE /businesses/:businessUuid/staff/:staffUuid/leave/:leaveUuid

---

## Blocked Time

POST   /businesses/:businessUuid/blocked-times
GET    /businesses/:businessUuid/blocked-times
PATCH  /businesses/:businessUuid/blocked-times/:blockedTimeUuid
DELETE /businesses/:businessUuid/blocked-times/:blockedTimeUuid

---

# Authorization Rules

## BUSINESS_OWNER
Can:
- manage all availability
- manage leave
- manage blocked times

---

## BUSINESS_ADMIN
Can:
- manage staff availability
- manage blocked periods

---

## STAFF
Can:
- view own availability
- optionally request leave later

Cannot:
- modify business-wide schedules

---

## CUSTOMER
No availability management permissions.

---

# Validation Rules

Always validate:
- business ownership
- staff ownership
- overlapping invalid ranges
- valid time ranges
- timezone consistency

Rules:
- end time must be after start time
- leave ranges valid
- blocked periods valid

Never trust frontend payloads.

---

# DTO Requirements

Required DTOs:
- UpdateBusinessOperatingHoursDto
- UpdateStaffWorkingHoursDto
- CreateStaffLeaveDto
- UpdateStaffLeaveDto
- CreateBlockedTimeDto
- UpdateBlockedTimeDto

Validation required:
- class-validator
- whitelist
- transform

Update DTOs must use:
PartialType()

---

# Database Rules

Indexes recommended:
- businessId
- staffId
- dayOfWeek
- startDateTime
- endDateTime

Rules:
- paginate list endpoints
- avoid eager loading
- use transactions for critical writes

---

# Soft Delete Rules

Soft delete preferred for:
- leave
- blocked periods

Use:
deletedAt

Never hard delete operational history casually.

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

- recurring leave automation
- smart shift optimization
- AI scheduling
- workforce optimization
- multi-location timezone handling
- auto-balancing workloads
- shift trading

Do not implement unless explicitly requested later.

---

# Engineering Notes

Availability is foundational temporal infrastructure.

Keep the module:
- scheduling-agnostic
- reusable
- business-scoped
- calculation-free

Do NOT:
- generate slots
- calculate booking conflicts
- reserve appointments

Those belong to the scheduling module.