# BookOS Engineering Rules
Version: 1.0
Status: Mandatory

These rules are mandatory for all AI-generated and human-written code.

Failure to follow these rules is considered architectural violation.

---

# 1. Public API Rules

- Never expose internal numeric IDs
- Always use UUID publicly
- Never leak internal database structure
- Always standardize API responses

---

# 2. Controller Rules

Controllers must:
- remain thin
- delegate business logic to services
- never contain scheduling calculations
- never access repositories directly

Controllers may:
- validate requests
- call services
- return formatted responses

---

# 3. Service Layer Rules

Business logic belongs in services.

Services must:
- encapsulate business rules
- validate domain constraints
- coordinate repositories
- coordinate transactions

Services must NOT:
- return raw entities directly
- contain HTTP concerns
- contain frontend formatting

---

# 4. Repository Rules

Repositories should:
- focus on data access
- avoid business logic
- optimize query performance

Avoid:
- deeply nested queries
- uncontrolled joins
- eager loading

---

# 5. DTO Rules

Every write endpoint requires DTO validation.

Required:
- class-validator
- whitelist
- transform

Update DTOs must use:
PartialType()

Never trust raw request payloads.

---

# 6. Validation Rules

Validate:
- ownership
- business relationships
- staff relationships
- slot availability
- scheduling conflicts

Validation must happen server-side.

---

# 7. Authorization Rules

Always validate:
- authenticated user
- business ownership
- role permissions

Never trust:
- frontend roles
- frontend ownership claims

---

# 8. Scheduling Rules

Scheduling logic must remain centralized.

Do NOT:
- duplicate slot calculations
- calculate availability in controllers
- bypass scheduling validation

All booking writes must:
- validate overlaps
- validate duration
- validate staff availability

---

# 9. Database Rules

All list endpoints:
- must paginate

Critical write operations:
- must use transactions

Add indexes for:
- foreign keys
- booking lookup paths
- scheduling queries

---

# 10. Entity Rules

Entities must:
- extend BaseEntity
- use UUID publicly
- use proper indexes
- avoid circular dependencies

Never expose entities directly to frontend.

---

# 11. Error Handling Rules

Use proper NestJS exceptions:
- BadRequestException
- NotFoundException
- ForbiddenException
- ConflictException

Never:
throw generic Error()

Error messages must be:
- actionable
- predictable
- safe

---

# 12. Logging Rules

Log:
- payment webhook failures
- scheduling conflicts
- notification failures
- authorization violations

Do not log:
- passwords
- tokens
- sensitive payment details

---

# 13. Payment Rules

Payments must be:
- idempotent
- webhook-driven

Frontend payment success is NOT source of truth.

Webhook confirmation is source of truth.

---

# 14. Notification Rules

Notifications must be asynchronous.

Booking success must not depend on:
- WhatsApp delivery
- email delivery

All notifications should be queueable.

---

# 15. Migration Rules

Migration safety first.

Never:
- drop critical tables casually
- mutate production data blindly
- create destructive migrations without rollback plan

---

# 16. AI Implementation Rules

AI agents must:
- follow module specs strictly
- avoid redesigning architecture
- avoid introducing unrequested abstractions
- avoid premature optimization

If requirements are ambiguous:
- ask for clarification
- do not invent business rules

---

# 17. Performance Rules

Avoid:
- N+1 queries
- eager loading
- fetching unnecessary relations

Prefer:
- pagination
- selective fields
- indexed queries

---

# 18. Code Consistency Rules

Naming:
- kebab-case for routes
- camelCase for variables
- PascalCase for classes

Keep:
- modules consistent
- DTO naming predictable
- folder structures identical across domains

---

# 19. Security Rules

Never trust client input.

Always:
- validate ownership
- sanitize payloads
- validate permissions
- verify webhook signatures

Sensitive operations require:
- authentication
- authorization
- audit tracking

---

# 20. Final Engineering Rule

BookOS is NOT generic CRUD software.

Every implementation decision must support:
- booking reliability
- conversion optimization
- operational simplicity
- future scalability