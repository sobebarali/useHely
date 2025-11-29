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

## Server Source Structure

```
apps/server/src/
├── apis/          # API domains (hospital, auth, users, etc.)
├── constants/     # Centralized constants (auth, cache, http, rbac)
├── errors/        # Typed error classes (AppError, HTTP errors, auth errors)
├── lib/           # Shared libraries (cache, email, redis, logger)
├── middlewares/   # Express middlewares (auth, validation, error handling)
├── utils/         # Utility functions (crypto)
└── index.ts       # Application entry point
```

## API Implementation Pattern

### File-Per-Endpoint Structure

Each endpoint requires dedicated files in each layer. Follow this order when implementing:

**1. Validation Layer** (`validations/{endpoint}.{domain}.validation.ts`)
- Define Zod schemas for runtime validation of request data
- Export Input types inferred from Zod (single source of truth)
- Define Output types as interfaces for response data
- Input types are validated at runtime, output types are for type safety only

Example:
```typescript
import { z } from "zod";

// Zod schema for runtime validation
export const registerPatientSchema = z.object({
	body: z.object({
		firstName: z.string().min(1),
		lastName: z.string().min(1),
		dateOfBirth: z.string().datetime(),
		gender: z.enum(["MALE", "FEMALE", "OTHER"]),
		bloodGroup: z.string().optional(),
		phone: z.string(),
		email: z.string().email().optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type RegisterPatientInput = z.infer<typeof registerPatientSchema.shape.body>;

// Output type - manually defined for response structure
export interface RegisterPatientOutput {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: string;
	patientType: string;
	status: string;
	createdAt: string;
}
```

**2. Repository Layer** (`repositories/{endpoint}.{domain}.repository.ts`)
- Database operations only
- No business logic
- Return database results directly
- Endpoint repositories contain only endpoint-specific operations
- Reusable lookups go in `shared.{domain}.repository.ts`

Example:
```typescript
import { Patient } from "@repo/db";
import type { RegisterPatientInput } from "../validations/register.patients.validation";

export async function createPatient({
	tenantId,
	data,
}: {
	tenantId: string;
	data: RegisterPatientInput;
}) {
	const patient = await Patient.create({
		tenantId,
		...data,
	});
	return patient;
}
```

**2b. Shared Repository Layer** (`repositories/shared.{domain}.repository.ts`)
- Reusable lookup functions used across multiple endpoints or domains
- Services import directly from shared repositories
- Never re-export from endpoint repositories

Example:
```typescript
import { Patient } from "@repo/db";

export async function findPatientById({
	tenantId,
	patientId,
}: {
	tenantId: string;
	patientId: string;
}) {
	return Patient.findOne({ _id: patientId, tenantId }).lean();
}

export async function findPatientByEmail({
	tenantId,
	email,
}: {
	tenantId: string;
	email: string;
}) {
	return Patient.findOne({ tenantId, email }).lean();
}
```

**3. Service Layer** (`services/{endpoint}.{domain}.service.ts`)
- Business logic and orchestration
- Call one or more repositories
- Handle transactions
- No HTTP concerns
- Import shared lookups from `shared.{domain}.repository.ts`
- Can import from other domains' shared repositories

Example:
```typescript
import { createPatient as createPatientRepo } from "../repositories/register.patients.repository";
import { findPatientByEmail } from "../repositories/shared.patients.repository";
import { findDepartmentById } from "../../departments/repositories/shared.departments.repository";
import { ConflictError, BadRequestError } from "@/errors";
import type { RegisterPatientInput, RegisterPatientOutput } from "../validations/register.patients.validation";

export async function registerPatient({
	tenantId,
	data,
}: {
	tenantId: string;
	data: RegisterPatientInput;
}): Promise<RegisterPatientOutput> {
	// Check for duplicate email using shared repository
	const existing = await findPatientByEmail({ tenantId, email: data.email });
	if (existing) {
		throw new ConflictError("EMAIL_EXISTS", "Email already in use");
	}
	
	// Validate department exists (cross-domain import)
	const department = await findDepartmentById({ tenantId, departmentId: data.departmentId });
	if (!department) {
		throw new BadRequestError("INVALID_DEPARTMENT", "Department not found");
	}
	
	// Create patient using endpoint-specific repository
	const patient = await createPatientRepo({ tenantId, data });
	
	// Map to output DTO
	return {
		id: patient._id,
		patientId: patient.patientId,
		firstName: patient.firstName,
		lastName: patient.lastName,
		dateOfBirth: patient.dateOfBirth,
		gender: patient.gender,
		patientType: patient.patientType,
		status: patient.status,
		createdAt: patient.createdAt.toISOString(),
	};
}
```

**4. Controller Layer** (`controllers/{endpoint}.{domain}.controller.ts`)
- HTTP request/response handling only
- Extract data from request
- Call service
- Format and return response
- Handle errors

Example:
```typescript
import type { Request, Response } from "express";
import { registerPatient } from "../services/register.patients.service";

export async function registerPatientController(req: Request, res: Response) {
	try {
		const tenantId = req.user.tenantId; // From auth middleware
		const patient = await registerPatient({
			tenantId,
			data: req.body,
		});
		
		res.status(201).json({
			success: true,
			data: patient,
		});
	} catch (error) {
		// Error handling
		res.status(500).json({
			success: false,
			error: "Failed to register patient",
		});
	}
}
```

**5. Routes Layer** (`{domain}.routes.ts`)
- Register all endpoints
- Apply middleware
- Map HTTP methods to controllers

Example:
```typescript
import { Router } from "express";
import { authenticate } from "@/middlewares/auth";
import { authorize } from "@/middlewares/authorize";
import { validate } from "@/middlewares/validate";
import { registerPatientSchema } from "./validations/register.patients.validation";
import { registerPatientController } from "./controllers/register.patients.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /patients - Register new patient
router.post(
	"/",
	authorize("PATIENT:CREATE"),
	validate(registerPatientSchema),
	registerPatientController
);

// Additional routes...

export default router;
```

### Implementation Checklist

When creating a new endpoint, follow these steps in order:

- [ ] **Validation**: Create validation schema with Input and Output types in `validations/{endpoint}.{domain}.validation.ts`
- [ ] **Repository**: Create database operations in `repositories/{endpoint}.{domain}.repository.ts`
- [ ] **Service**: Create business logic in `services/{endpoint}.{domain}.service.ts`
- [ ] **Controller**: Create HTTP handler in `controllers/{endpoint}.{domain}.controller.ts`
- [ ] **Routes**: Register route in `{domain}.routes.ts` with middleware
- [ ] **Middleware**: Add domain-specific middleware in `middlewares/{domain}.middleware.ts` if needed
- [ ] **Tests**: Write tests in `__tests__/{domain}/{endpoint}/{scenario}.test.ts`
- [ ] **Documentation**: Update API docs in `apps/docs/src/content/docs/api/{domain}.md`

### File Organization Example

For a complete patients domain with common CRUD operations:

```
apps/server/src/apis/patients/
├── controllers/
│   ├── register.patients.controller.ts
│   ├── list.patients.controller.ts
│   ├── get-by-id.patients.controller.ts
│   ├── update.patients.controller.ts
│   ├── delete.patients.controller.ts
│   └── search.patients.controller.ts
├── services/
│   ├── register.patients.service.ts
│   ├── list.patients.service.ts
│   ├── get-by-id.patients.service.ts
│   ├── update.patients.service.ts
│   ├── delete.patients.service.ts
│   └── search.patients.service.ts
├── repositories/
│   ├── register.patients.repository.ts
│   ├── list.patients.repository.ts
│   ├── get-by-id.patients.repository.ts
│   ├── update.patients.repository.ts
│   ├── delete.patients.repository.ts
│   ├── search.patients.repository.ts
│   └── shared.patients.repository.ts      # Reusable lookups
├── validations/
│   ├── register.patients.validation.ts
│   ├── list.patients.validation.ts
│   ├── get-by-id.patients.validation.ts
│   ├── update.patients.validation.ts
│   ├── delete.patients.validation.ts
│   └── search.patients.validation.ts
├── middlewares/
│   └── patients.middleware.ts
└── patients.routes.ts
```

### Shared Repository Import Rules

1. **Services import shared functions directly** from `shared.{domain}.repository.ts`
2. **Endpoint repositories export only endpoint-specific operations** (e.g., `createPatient`, `updatePatient`)
3. **Never re-export shared functions** from endpoint repositories
4. **Cross-domain imports allowed** for shared repositories only

**Correct:**
```typescript
// service imports from shared repositories
import { findPatientById } from "../repositories/shared.patients.repository";
import { findHospitalById } from "../../hospital/repositories/shared.hospital.repository";
```

**Incorrect:**
```typescript
// DON'T re-export from endpoint repositories
// in register.patients.repository.ts
export { findPatientById } from "./shared.patients.repository"; // ❌ WRONG
```
