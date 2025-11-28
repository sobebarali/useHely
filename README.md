# hms

A multi-tenant, cloud-enabled Hospital Management System enabling hospitals to self-register, manage operations, and maintain complete patient lifecycle
management with role-based access control

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Express** - Fast, unopinionated web framework
- **Node.js** - Runtime environment
- **Mongoose** - TypeScript-first ORM
- **MongoDB** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **Starlight** - Documentation site with Astro
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality

## Getting Started

First, install the dependencies:

```bash
npm install
```
## Database Setup

This project uses MongoDB with Mongoose.

1. Make sure you have MongoDB set up.
2. Update your `apps/server/.env` file with your MongoDB connection URI.

3. Apply the schema to your database:
```bash
npm run db:push
```


Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).






## Deployment (Alchemy)
- Web dev: cd apps/web && npm run dev
- Web deploy: cd apps/web && npm run deploy
- Web destroy: cd apps/web && npm run destroy


## Project Structure

```
hms/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   ├── docs/        # Documentation site (Astro Starlight)
│   └── server/      # Backend API (Express)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Module Structure (Per Domain)

Each API domain follows a consistent layered architecture with one file per endpoint per layer:

```
apps/server/src/apis/{domain}/
├── controllers/          # HTTP request/response handling
│   ├── {endpoint1}.{domain}.controller.ts
│   ├── {endpoint2}.{domain}.controller.ts
│   └── {endpoint3}.{domain}.controller.ts
├── services/            # Business logic
│   ├── {endpoint1}.{domain}.service.ts
│   ├── {endpoint2}.{domain}.service.ts
│   └── {endpoint3}.{domain}.service.ts
├── repositories/        # Database operations
│   ├── {endpoint1}.{domain}.repository.ts
│   ├── {endpoint2}.{domain}.repository.ts
│   └── {endpoint3}.{domain}.repository.ts
├── dtos/               # Data Transfer Objects
│   ├── {endpoint1}.{domain}.dto.ts
│   ├── {endpoint2}.{domain}.dto.ts
│   └── {endpoint3}.{domain}.dto.ts
├── validations/        # Input validation schemas (Zod)
│   ├── {endpoint1}.{domain}.validation.ts
│   ├── {endpoint2}.{domain}.validation.ts
│   └── {endpoint3}.{domain}.validation.ts
├── middlewares/        # Domain-specific middleware
│   └── {domain}.middleware.ts
└── {domain}.routes.ts  # Route definitions
```

**Example: Patients Domain**

```
apps/server/src/apis/patients/
├── controllers/
│   ├── register.patients.controller.ts
│   ├── list.patients.controller.ts
│   ├── get-by-id.patients.controller.ts
│   ├── update.patients.controller.ts
│   └── delete.patients.controller.ts
├── services/
│   ├── register.patients.service.ts
│   ├── list.patients.service.ts
│   ├── get-by-id.patients.service.ts
│   ├── update.patients.service.ts
│   └── delete.patients.service.ts
├── repositories/
│   ├── register.patients.repository.ts
│   ├── list.patients.repository.ts
│   ├── get-by-id.patients.repository.ts
│   ├── update.patients.repository.ts
│   └── delete.patients.repository.ts
├── dtos/
│   ├── register.patients.dto.ts
│   ├── list.patients.dto.ts
│   ├── get-by-id.patients.dto.ts
│   ├── update.patients.dto.ts
│   └── delete.patients.dto.ts
├── validations/
│   ├── register.patients.validation.ts
│   ├── list.patients.validation.ts
│   ├── get-by-id.patients.validation.ts
│   ├── update.patients.validation.ts
│   └── delete.patients.validation.ts
├── middlewares/
│   └── patients.middleware.ts
└── patients.routes.ts
```

**Layer Responsibilities:**
- **Routes** - Endpoint definitions, route-level middleware registration
- **Validations** - Zod schemas for request validation (body, params, query)
- **DTOs** - Data Transfer Objects for type-safe data transfer between layers
- **Controllers** - HTTP handling, extract data from request, call service, return response
- **Services** - Business logic, orchestration, multi-repository coordination
- **Repositories** - Database queries, single model CRUD operations
- **Middlewares** - Domain-specific middleware (authorization, validation, etc.)

## Available Scripts

- `npm run dev`: Start all applications in development mode
- `npm run build`: Build all applications
- `npm run dev:web`: Start only the web application
- `npm run dev:server`: Start only the server
- `npm run check-types`: Check TypeScript types across all apps
- `npm run db:push`: Push schema changes to database
- `npm run db:studio`: Open database studio UI
- `npm run check`: Run Biome formatting and linting
- `cd apps/docs && npm run dev`: Start documentation site
- `cd apps/docs && npm run build`: Build documentation site
