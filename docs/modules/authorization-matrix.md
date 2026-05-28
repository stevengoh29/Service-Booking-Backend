# Authorization Matrix
Version: 1.0

---

# Roles

- SUPER_ADMIN
- BUSINESS_OWNER
- BUSINESS_ADMIN
- STAFF
- CUSTOMER

---

# Businesses

| Action | SUPER_ADMIN | BUSINESS_OWNER | BUSINESS_ADMIN | STAFF | CUSTOMER |
|---|---|---|---|---|---|
| Create business | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update business | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete business | ✅ | ✅ | ❌ | ❌ | ❌ |
| View business dashboard | ✅ | ✅ | ✅ | Limited | ❌ |

---

# Staff

| Action | SUPER_ADMIN | BUSINESS_OWNER | BUSINESS_ADMIN | STAFF | CUSTOMER |
|---|---|---|---|---|---|
| Create staff | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update staff | ✅ | ✅ | ✅ | Self only | ❌ |
| Delete staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| View staff list | ✅ | ✅ | ✅ | Limited | ❌ |

---

# Services

| Action | SUPER_ADMIN | BUSINESS_OWNER | BUSINESS_ADMIN | STAFF | CUSTOMER |
|---|---|---|---|---|---|
| Create service | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update service | ✅ | ✅ | ✅ | ❌ | ❌ |
| View services | ✅ | ✅ | ✅ | ✅ | Public |

---

# Bookings

| Action | SUPER_ADMIN | BUSINESS_OWNER | BUSINESS_ADMIN | STAFF | CUSTOMER |
|---|---|---|---|---|---|
| Create booking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reschedule booking | ✅ | ✅ | ✅ | Limited | Self only |
| Cancel booking | ✅ | ✅ | ✅ | Limited | Self only |
| Mark completed | ✅ | ✅ | ✅ | Assigned staff | ❌ |

---

# Permission Rules

Rules:
- BUSINESS_OWNER owns the business
- BUSINESS_ADMIN manages operations
- STAFF permissions are operationally limited
- CUSTOMER only accesses own bookings/profile

Never trust frontend role claims.
All authorization must be validated server-side.