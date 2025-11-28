# Development Practices

## TDD Workflow (Mandatory)

### Test-First Cycle
1. **Understand** - Read requirements and `apps/docs/` API documentation
2. **Check Patterns** - Find and follow existing codebase patterns
3. **Write Tests** - Create failing tests first (Red phase)
4. **Implement** - Write minimum code to pass tests (Green phase)
5. **Refactor** - Improve code quality while keeping tests green
6. **Mandatory Checks** - Run type check, lint, and targeted tests

### Test Organization
- Structure: `__tests__/{domain}/{endpoint}/{scenario}.test.ts`
- One file = One test case = One use case
- Use unique test data per test (UUIDs, timestamps)
- Clean up test data in `afterAll` hook
- No mocking - use real API calls and real database

### Running Tests
- Domain tests: `vitest __tests__/{domain}/`
- Connected domain tests: Test related domains too
- Never run all tests during development (too slow)
- Full test suite runs in CI/CD only

### Test Patterns
- Create unique tenant per test for isolation
- Generate unique data (emails, phones, IDs) to avoid conflicts
- Verify database state after operations
- Test success, validation, auth, and error scenarios
- Design for parallel execution

### Before Committing
- Run `npm run check-types` (fix all TypeScript errors)
- Run `npm run check` (Biome linting and formatting)
- Run tests for domain and connected domains
- Update `apps/docs/` if API changes
- Verify no breaking changes

### Documentation Policy
- Never create unnecessary standalone documentation files (README, CHANGELOG, etc.)
- Update existing `apps/docs/` files only when implementing new features
- Update the specific API documentation file related to your work
- Keep documentation concise and focused on API contracts
- No separate documentation for each task or feature

## Database Patterns

### Mongoose Models
- Place in `packages/db/src/models/{entity}.model.ts`
- Define enums as const objects before schemas
- Use custom string `_id` (not ObjectId)
- Include `tenantId: { type: String, ref: "Hospital", required: true }`
- Enable timestamps: `{ timestamps: true }`
- Define explicit collection name

### Multi-Tenant Design
- Include `tenantId` in every tenant-scoped schema
- Always include `tenantId` first in compound indexes
- Pattern: `schema.index({ tenantId: 1, field: 1 })`
- Unique within tenant: `{ tenantId: 1, uniqueField: 1 }, { unique: true }`

### Sub-Schemas
- Define before main schema with `{ _id: false }`
- Use for embedded data accessed together
- Examples: address, contact, timeSlot

### Indexing Strategy
- Index all query fields
- Compound indexes: tenant ID first, then query fields
- Sparse indexes for optional unique fields
- Monitor and remove unused indexes

### Query Patterns
- Always scope to tenant: `Model.find({ tenantId, ...criteria })`
- Use projection to limit fields
- Use `lean()` for read-only queries
- Implement pagination for large results
- Avoid N+1 queries

## Connected APIs

### Identifying Dependencies
- Patient → Department, User (doctor)
- Appointment → Patient, User (doctor)
- Prescription → Patient, User (prescriber)
- Dispensing → Prescription, Inventory
- Vitals → Patient, User (recorder)

### When Changing APIs
- Update related endpoints for consistency
- Test both primary and connected domains
- Verify foreign key relationships
- Maintain referential integrity
- Check for breaking changes

## Domain Organization
- `hospital`, `authentication`, `users`, `patients`, `prescriptions`, `appointments`, `vitals`, `dispensing`, `departments`, `dashboard`, `reports`, `inventory`
