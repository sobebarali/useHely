# Coding Standards

## TypeScript Conventions

### Type Safety
- Leverage TypeScript fully - avoid `any` type
- Define explicit types for function parameters and return values
- Use const objects for enums: `export const Status = { ACTIVE: "ACTIVE" } as const`
- Never use type assertions unless well-documented

### File Naming
- Use kebab-case: `patient-service.ts`, `auth-controller.ts`
- Model files: `{entity}.model.ts`
- Service files: `{entity}.service.ts`
- Test files: `{scenario}.test.ts`

### API Module Organization
- Domain directory: `apps/server/src/apis/{domain}/`
- **One file per endpoint per layer** - Each endpoint has dedicated files across all layers
- Controller files: `{endpoint}.{domain}.controller.ts`
- Service files: `{endpoint}.{domain}.service.ts`
- Repository files: `{endpoint}.{domain}.repository.ts`
- Validation files: `{endpoint}.{domain}.validation.ts`
- Middleware files: `{domain}.middleware.ts` (shared across domain)
- Route files: `{domain}.routes.ts` (main router)

### Layer File Structure
Each endpoint must have dedicated files across layers:
- **Routes** (`{domain}.routes.ts`): Register all domain endpoints with middleware
- **Validations** (`{endpoint}.{domain}.validation.ts`): Zod schemas for runtime validation, Input types (inferred from Zod), Output types (manually defined interfaces)
- **Controllers** (`{endpoint}.{domain}.controller.ts`): Request/response handling only, no business logic
- **Services** (`{endpoint}.{domain}.service.ts`): Business logic only, no HTTP concerns
- **Repositories** (`{endpoint}.{domain}.repository.ts`): Database operations only, no business logic
- **Middlewares** (`{domain}.middleware.ts`): Domain-level middleware shared across endpoints

### Endpoint Naming in Files
- Use descriptive endpoint names: `register`, `list`, `get-by-id`, `update`, `delete`, `search`
- Use kebab-case for multi-word endpoints: `get-by-id`, `search-by-name`, `bulk-update`
- Be consistent across all layers for the same endpoint

### Function Parameters
- Use object destructuring with inline types for parameters
- Avoid separate interfaces for single-function parameters
- Pattern: `function create({ name, age }: { name: string; age: number })`
- Destructure parameters directly in function signature

### Code Style
- Use tabs for indentation (Biome config)
- Use double quotes for strings
- Always use semicolons
- Keep functions small and focused
- Prefer early returns over nested conditions
- Use async/await over raw promises

### Shared Utilities
- **Crypto utilities** (`utils/crypto.ts`): `hashPassword`, `comparePassword`, `generateTemporaryPassword`
- **Constants** (`constants/`): Centralized configuration for auth, cache, HTTP, RBAC
- **Errors** (`errors/`): Typed error classes for consistent error handling
- Import utilities: `import { hashPassword } from "@/utils/crypto"`
- Import constants: `import { AUTH_CACHE_TTL } from "@/constants"`
- Import errors: `import { NotFoundError, ConflictError } from "@/errors"`

## API Conventions

### REST Principles
- Use proper HTTP methods: GET (retrieve), POST (create), PATCH (update), DELETE (remove)
- Use plural nouns for resources: `/patients`, `/appointments`
- Path parameters for IDs, query parameters for filters
- Return appropriate status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict)

### Request/Response
- Accept and return JSON with camelCase fields
- Use ISO 8601 for dates
- Include pagination metadata for lists: `{ data: [], pagination: { page, limit, total } }`
- Validate all inputs at API boundary
- Never expose internal errors or stack traces

### Authentication & Authorization
- Require JWT tokens in Authorization header
- Extract tenant ID from JWT automatically
- Check RBAC permissions on all protected endpoints
- Return 401 for missing/invalid auth, 403 for insufficient permissions
- Scope all queries to authenticated tenant

### Multi-Tenant Context
- Extract `tenantId` from JWT token only (never from request params)
- Include tenant ID in all database queries
- Prevent cross-tenant data access at all layers
- Use tenant-scoped cache keys

### Error Responses
- Use consistent error format with error codes
- Provide clear, actionable error messages
- Include field-level validation errors
- Log detailed errors server-side only

### Error Handling in Services
- Use typed error classes from `@/errors` instead of throwing plain objects
- Available error classes:
  - **HTTP Errors**: `BadRequestError`, `NotFoundError`, `ConflictError`, `ValidationError`, `InternalError`, `RateLimitError`, `ServiceUnavailableError`
  - **Auth Errors**: `UnauthorizedError`, `ForbiddenError`, `InvalidCredentialsError`, `InvalidTokenError`, `SessionExpiredError`, `AccountLockedError`, `TenantInactiveError`, `PasswordExpiredError`, `InvalidGrantError`
- Pattern: `throw new NotFoundError("USER_NOT_FOUND", "User not found")`
- Custom error codes allowed: `throw new ForbiddenError("SELF_DEACTIVATION", "Cannot deactivate yourself")`
- Error handler middleware automatically formats responses
- Never throw plain objects: `throw { status, code, message }` (legacy pattern)

## Media Assets & Resources

### Images
- Use **Unsplash** (https://unsplash.com) for free stock photography
- Prefer direct Unsplash URLs with optimization parameters:
  - Format: `https://images.unsplash.com/photo-{id}?w={width}&h={height}&fit=crop&q=80`
  - Always specify `w` (width) to optimize load times
  - Use `q=80` for good quality with smaller file size
  - Use `fit=crop` for consistent aspect ratios
- Always include descriptive `alt` text for accessibility
- Consider lazy loading for below-the-fold images: `loading="lazy"`

### Icons
- Use **Lucide React** (https://lucide.dev) for static icons - already installed
- Import only needed icons to minimize bundle size
- Pattern: `import { IconName } from "lucide-react"`
- Use consistent sizing: `className="h-5 w-5"` or `size={20}`
- Apply colors via className: `className="text-primary"`

### Animated Icons & Illustrations
- Use **Lottie Files** (https://lottiefiles.com) for animated graphics
  - Install: `npm install lottie-react`
  - Use for loading states, success animations, onboarding
- Use **unDraw** (https://undraw.co) for free SVG illustrations
- Use **Tabler Icons** (https://tabler.io/icons) as alternative icon set
- Use **Heroicons** (https://heroicons.com) for additional icon options

### Best Practices
- Optimize all images before use (consider WebP format)
- Use responsive images with `srcSet` when needed
- Prefer SVG for icons and simple illustrations
- Cache static assets appropriately
- Use CSS animations for simple effects instead of heavy libraries

## TanStack Router Conventions

### Route File Structure
TanStack Router uses file-based routing with automatic route generation. Routes are defined in `apps/web/src/routes/`.

### Layout Routes Pattern
**CRITICAL**: When creating nested routes that share a common layout, use the layout route pattern:

1. **Layout Route** (`{section}.tsx`): Renders shared layout with `<Outlet />` for child content
2. **Index Route** (`{section}/index.tsx`): Default content shown at the section root
3. **Child Routes** (`{section}/{page}.tsx`): Individual pages rendered inside the layout

**Example - Dashboard with nested pages:**
```
routes/
├── dashboard.tsx           # Layout route with <Outlet />
└── dashboard/
    ├── index.tsx           # /dashboard - Dashboard home content
    ├── staff/
    │   ├── index.tsx       # /dashboard/staff - Staff list
    │   ├── add.tsx         # /dashboard/staff/add - Add staff form
    │   └── $id.tsx         # /dashboard/staff/:id - Staff details
    └── patients/
        └── index.tsx       # /dashboard/patients - Patients list
```

**Layout Route Pattern:**
```tsx
// dashboard.tsx - Layout route
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayoutRoute,
  beforeLoad: async () => {
    // Auth check runs once for all child routes
    if (!authClient.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
});

function DashboardLayoutRoute() {
  // Shared layout logic (session, user info, etc.)
  return (
    <DashboardLayout user={user} hospital={hospital}>
      <Outlet /> {/* Child routes render here */}
    </DashboardLayout>
  );
}
```

**Child Route Pattern:**
```tsx
// dashboard/staff/index.tsx - Child route (NO layout wrapper)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/staff/")({
  component: StaffListPage,
});

function StaffListPage() {
  // Only render page content - layout is handled by parent
  return (
    <div className="p-6">
      <h1>Staff List</h1>
      {/* Page content */}
    </div>
  );
}
```

### Common Mistakes to Avoid

1. **DON'T wrap child routes in layout components** - The parent layout route handles this
2. **DON'T duplicate auth checks** - Parent route's `beforeLoad` runs for all children
3. **DON'T forget `<Outlet />`** - Without it, child routes won't render
4. **DO use fragments or divs** - Child components should return simple containers

### Route Naming Conventions
- Use kebab-case for route files: `forgot-password.tsx`, `reset-password.tsx`
- Use `index.tsx` for default/list pages within a directory
- Use `$param.tsx` for dynamic routes: `$id.tsx` for `/staff/:id`
- Use descriptive names: `add.tsx` instead of `new.tsx` or `create.tsx`

### Authentication in Routes
- Place auth checks in the parent layout route's `beforeLoad`
- Child routes inherit parent authentication automatically
- Use `redirect({ to: "/login" })` for unauthenticated users
