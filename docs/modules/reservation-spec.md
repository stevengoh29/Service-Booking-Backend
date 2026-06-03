# BookOS Phase 1 - Reservations Module Backend Specification

## Overview

Build the Reservation module for BookOS Phase 1.

This module is responsible for:

* Public reservation creation
* Reservation management
* Capacity validation
* Reservation status workflow
* Reservation dashboard queries
* Manual reservation creation
* Customer auto-linking
* Future notification integration

The module must be designed to support future phases without major refactoring.

---

# Module Structure

```bash
src/modules/reservations/

├── controllers/
│   ├── reservation.controller.ts
│   ├── public-reservation.controller.ts
│
├── services/
│   ├── reservation.service.ts
│   ├── reservation-capacity.service.ts
│   ├── reservation-query.service.ts
│
├── dto/
│   ├── create-public-reservation.dto.ts
│   ├── create-manual-reservation.dto.ts
│   ├── update-reservation-status.dto.ts
│   ├── reservation-filter.dto.ts
│
├── entities/
│   └── reservation.entity.ts
│
├── enums/
│   ├── reservation-status.enum.ts
│   └── reservation-source.enum.ts
│
├── interfaces/
│   └── reservation-capacity-result.interface.ts
│
└── reservations.module.ts
```

---

# Reservation Entity

## Table: reservations

```ts
id: number

uuid: string

businessId: number

reservationNumber: string

customerId: number | null

customerName: string

customerPhone: string

reservationDate: date

reservationTime: time

guestCount: number

specialRequest: string | null

status: ReservationStatus

source: ReservationSource

confirmedAt: Date | null

cancelledAt: Date | null

completedAt: Date | null

noShowAt: Date | null

metadata: jsonb | null

createdById: number | null
createdByName: string | null

updatedById: number | null
updatedByName: string | null

createdAt: Date
updatedAt: Date
```

---

# Reservation Number

Generate human-readable reservation numbers.

Format:

```txt
RSV-20260603-0001
RSV-20260603-0002
```

Purpose:

* Customer support
* WhatsApp references
* Admin dashboard

Do not expose numeric database IDs.

---

# Reservation Status

```ts
export enum ReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  NO_SHOW = "NO_SHOW",
}
```

---

# Reservation Source

```ts
export enum ReservationSource {
  PUBLIC = "PUBLIC",
  MANUAL = "MANUAL",
}
```

---

# Capacity Validation Service

## Purpose

Prevent overbooking.

Service:

```ts
ReservationCapacityService
```

Method:

```ts
validateReservationCapacity(
  businessId: number,
  date: string,
  time: string,
  guestCount: number,
): Promise<void>
```

Validation:

### Step 1

Check blocked dates.

Reject if blocked.

### Step 2

Check operating hours.

Reject if outside business hours.

### Step 3

Check reservation slot exists.

Reject if slot invalid.

### Step 4

Calculate current occupancy.

Example:

Business capacity:

50

Existing reservations:

18:00 -> 20 guests
18:00 -> 15 guests

Incoming reservation:

20 guests

Result:

55 > 50

Reject reservation.

---

# Reservation Creation

## Public Reservation

Endpoint:

```http
POST /public/:slug/reservations
```

Request:

```json
{
  "date": "2026-06-20",
  "time": "18:00",
  "guestCount": 4,
  "customerName": "Steven",
  "customerPhone": "+628123456789",
  "specialRequest": "Window seat"
}
```

Flow:

1. Find business by slug
2. Validate availability
3. Validate capacity
4. Create reservation
5. Link customer record
6. Queue notification event
7. Return success response

Default status:

```txt
PENDING
```

Default source:

```txt
PUBLIC
```

---

## Manual Reservation

Endpoint:

```http
POST /reservations/manual
```

Authenticated endpoint.

Same validation rules.

Source:

```txt
MANUAL
```

---

# Reservation Status Actions

Use explicit endpoints.

Do NOT build generic status updates.

## Confirm

```http
PATCH /reservations/:uuid/confirm
```

Rules:

Only PENDING reservations.

Set:

```ts
status = CONFIRMED
confirmedAt = now()
```

---

## Cancel

```http
PATCH /reservations/:uuid/cancel
```

Allowed:

PENDING
CONFIRMED

Set:

```ts
status = CANCELLED
cancelledAt = now()
```

---

## Complete

```http
PATCH /reservations/:uuid/complete
```

Allowed:

CONFIRMED

Set:

```ts
status = COMPLETED
completedAt = now()
```

---

## No Show

```http
PATCH /reservations/:uuid/no-show
```

Allowed:

CONFIRMED

Set:

```ts
status = NO_SHOW
noShowAt = now()
```

---

# Dashboard Queries

## Today's Reservations

```http
GET /reservations/today
```

Returns:

* Total bookings
* Total guests
* Confirmed count
* Pending count

---

## Upcoming Reservations

```http
GET /reservations/upcoming
```

Default:

Next 7 days

---

## Reservation List

```http
GET /reservations
```

Filters:

```http
?date=
?status=
?search=
?page=
?limit=
```

Search fields:

* reservation number
* customer name
* phone

---

## Calendar View

```http
GET /reservations/calendar
```

Returns grouped reservations by date.

Used by future calendar UI.

---

# Customer Integration

Reservation creation must automatically link customers.

Flow:

```txt
Find customer by:

businessId
phone
```

If exists:

```txt
Update lastVisitAt
Increment totalReservations
```

If not:

```txt
Create customer
```

Store:

```ts
customerId
```

inside reservation.

---

# Business Rules

## Guest Count

Minimum:

```txt
1
```

Maximum:

```txt
100
```

Configurable later.

---

## Phone Number

Required.

Must normalize:

```txt
0812xxxx
+62812xxxx
62812xxxx
```

Stored format:

```txt
62812xxxx
```

---

## Same Day Booking

Allow for Phase 1.

No advance booking restrictions.

Future enhancement.

---

## Reservation Modification

Not required in Phase 1.

Do not build update endpoint.

Only:

* Create
* Confirm
* Cancel
* Complete
* No Show

---

# Future Events

Emit domain events.

```ts
reservation.created

reservation.confirmed

reservation.cancelled

reservation.completed

reservation.no_show
```

Do not send WhatsApp directly inside service.

Publish events.

Notification module handles delivery.

---

# Permissions

Authenticated endpoints require:

```txt
BUSINESS_OWNER
BUSINESS_ADMIN
```

Public endpoint requires no authentication.

---

# Database Indexes

Create indexes:

```sql
business_id

business_id + reservation_date

business_id + reservation_date + reservation_time

status

customer_phone

reservation_number
```

---

# API Response Standard

Success:
Use the `ResponseUtils` class to create the response.

Error:
Use the `ResponseUtils` class to create the response.

Use ResponseUtil consistently.

---

# Phase 1 Definition of Done

The module is complete when:

✓ Public reservation creation works

✓ Manual reservation creation works

✓ Capacity validation prevents overbooking

✓ Reservation status workflow works

✓ Dashboard listing works

✓ Customer auto-linking works

✓ Domain events are emitted

✓ API follows ResponseUtil standard

✓ All endpoints protected appropriately

✓ Unit tests cover business logic
