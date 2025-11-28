---
title: Architecture Overview
description: Technical architecture and design of the Hospital Management System.
---

## System Architecture

HMS follows a **modular monolithic architecture** designed for flexibility, maintainability, and scalability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web App   │  │ Mobile App  │  │  Third-party│             │
│  │   (React)   │  │  (Future)   │  │     Apps    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │ HTTPS/REST
┌──────────────────────────┼──────────────────────────────────────┐
│                    API Gateway / Nginx                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    Application Layer                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Express.js Server                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │  Auth   │ │ Patient │ │Prescr.  │ │Pharmacy │        │  │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │        │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │  User   │ │ Appoint.│ │ Vitals  │ │ Reports │        │  │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │        │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────▼─────┐  ┌───────▼───────┐  ┌─────▼─────┐
│   MongoDB     │  │     Redis     │  │   Email   │
│   (Atlas)     │  │    Cache      │  │  Service  │
└───────────────┘  └───────────────┘  └───────────┘
```

## Technology Stack

### Backend

| Component | Technology |
|-----------|------------|
| Runtime | Node.js (v20+) |
| Framework | Express.js |
| Database | MongoDB (Atlas) |
| ORM | Mongoose |
| Cache | Redis (v7.x) |
| Authentication | Better-Auth (OAuth2 + JWT) |
| Email | Nodemailer |
| Logging | Winston / Morgan |

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | React (v18+) |
| Build Tool | Vite |
| Routing | TanStack Router |
| State | Context API / Redux Toolkit |
| UI Components | shadcn/ui (Radix UI) |
| Styling | TailwindCSS |
| HTTP Client | Axios |
| Language | TypeScript |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Monorepo | Turborepo |
| Reverse Proxy | Nginx |
| CI/CD | GitHub Actions |
| Containers | Docker / Docker Compose |
| Code Quality | Biome, Husky |

## Multi-Tenancy Architecture

HMS implements **schema-per-tenant** isolation:

```
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Tenant A   │  │  Tenant B   │  │  Tenant C   │         │
│  │   Schema    │  │   Schema    │  │   Schema    │         │
│  │             │  │             │  │             │         │
│  │ - patients  │  │ - patients  │  │ - patients  │         │
│  │ - users     │  │ - users     │  │ - users     │         │
│  │ - appts     │  │ - appts     │  │ - appts     │         │
│  │ - prescr.   │  │ - prescr.   │  │ - prescr.   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Tenant Isolation

| Layer | Isolation Method |
|-------|------------------|
| Database | Schema-per-tenant |
| Cache | Redis namespace: `tenant:{id}:*` |
| API | Middleware extracts tenant from JWT |
| Queries | Automatic tenant scoping |

### Request Flow

1. Client sends request with JWT token
2. Middleware extracts `tenantId` from token
3. Tenant context set for request lifecycle
4. All database queries scoped to tenant
5. Response returned to client

## Module Structure

Each functional module contains:

```
module/
├── controllers/    # HTTP request handlers
├── services/       # Business logic
├── repositories/   # Data access
├── validations/   # Zod schemas + type definitions (Input & Output)
├── middlewares/   # Domain-specific middleware
└── routes.ts      # Route definitions
```

### Layer Details

| Layer | Purpose | Naming Convention |
|-------|---------|------------------|
| Routes | Endpoint definitions and middleware | `{domain}.routes.ts` |
| Validations | Request validation schemas & type definitions | `{endpoint}.{domain}.validation.ts` |
| Controllers | HTTP request/response handling | `{endpoint}.{domain}.controller.ts` |
| Services | Business logic and orchestration | `{endpoint}.{domain}.service.ts` |
| Repositories | Database operations | `{endpoint}.{domain}.repository.ts` |
| Middlewares | Domain middleware | `{domain}.middleware.ts` |

### Example: Patients Domain

```
apps/server/src/apis/patients/
├── controllers/
│   ├── register.patients.controller.ts
│   ├── list.patients.controller.ts
│   └── get-by-id.patients.controller.ts
├── services/
│   ├── register.patients.service.ts
│   ├── list.patients.service.ts
│   └── get-by-id.patients.service.ts
├── repositories/
│   ├── register.patients.repository.ts
│   ├── list.patients.repository.ts
│   └── get-by-id.patients.repository.ts
├── validations/
│   ├── register.patients.validation.ts
│   ├── list.patients.validation.ts
│   └── get-by-id.patients.validation.ts
├── middlewares/
│   └── patients.middleware.ts
└── patients.routes.ts
```

## Security Architecture

### Authentication Flow

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ Client │────▶│  Auth  │────▶│ Better │────▶│  JWT   │
│        │     │  API   │     │  Auth  │     │ Token  │
└────────┘     └────────┘     └────────┘     └────────┘
                                                  │
                                                  ▼
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│  API   │◀────│  RBAC  │◀────│  ABAC  │◀────│Validate│
│Response│     │ Check  │     │ Check  │     │ Token  │
└────────┘     └────────┘     └────────┘     └────────┘
```

### Authorization Layers

1. **RBAC** - Role-Based Access Control
   - Pre-defined roles with permissions
   - Permission format: `RESOURCE:ACTION`

2. **ABAC** - Attribute-Based Access Control
   - Fine-grained access based on attributes
   - User attributes: department, specialization
   - Resource attributes: confidentiality level

## Caching Strategy

| Data Type | Cache Duration | Invalidation |
|-----------|----------------|--------------|
| User session | Token lifetime | Logout/revoke |
| Menu structure | Until token refresh | Role change |
| Dashboard stats | 30 seconds | Manual refresh |
| Lookup data | 1 hour | Admin update |

## Scalability Considerations

### Horizontal Scaling

- Stateless API servers behind load balancer
- Redis for session/cache sharing
- MongoDB Atlas auto-scaling

### Performance Optimizations

- Database indexing on frequently queried fields
- Query result pagination
- Response compression
- Static asset CDN delivery
