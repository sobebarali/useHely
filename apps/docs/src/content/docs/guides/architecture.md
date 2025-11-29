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
│   ├── {endpoint}.{domain}.repository.ts  # Endpoint-specific operations
│   └── shared.{domain}.repository.ts      # Reusable lookup functions
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
| Shared Repositories | Reusable lookup functions | `shared.{domain}.repository.ts` |
| Middlewares | Domain middleware | `{domain}.middleware.ts` |

### Shared Repository Pattern

Reusable database lookup functions are centralized in shared repository files:

- **File naming**: `shared.{domain}.repository.ts`
- **Purpose**: Common lookups used across multiple endpoints or domains
- **Import rule**: Services import directly from shared repositories
- **Cross-domain**: Services can import from other domains' shared repositories

**Example imports in a service:**
```typescript
// Import from same domain's shared repository
import { findPatientById } from "../repositories/shared.patients.repository";

// Import from another domain's shared repository
import { findHospitalById } from "../../hospital/repositories/shared.hospital.repository";
```

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
│   ├── get-by-id.patients.repository.ts
│   └── shared.patients.repository.ts      # findById, findByEmail, etc.
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

## Security Infrastructure

### Encryption Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Mongoose   │  │  Encryption │  │   Key Management    │ │
│  │  Middleware │──│   Service   │──│      Client         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌─────▼─────┐       ┌─────▼─────┐
    │ MongoDB │        │  AWS KMS  │       │  Audit    │
    │ (CSFLE) │        │  / Vault  │       │   Logs    │
    └─────────┘        └───────────┘       └───────────┘
```

### Data Protection

| Layer | Protection |
|-------|------------|
| Transit | HTTPS/TLS 1.3 |
| Rest | AES-256-GCM field-level encryption |
| Keys | AWS KMS / HashiCorp Vault |
| Logs | PII masking, append-only audit |

### Encrypted Fields

| Model | Encrypted Fields |
|-------|------------------|
| Patient | firstName, lastName, dateOfBirth, phone, email, address |
| Prescription | diagnosis, notes |
| Vitals | All health metrics |

### Compliance Stack

| Standard | Implementation |
|----------|----------------|
| HIPAA | Audit logs, encryption, access controls, 6-year retention |
| GDPR | Data export, deletion, consent management, portability |
| SOC 2 | MFA, security monitoring, change detection |

### Audit Trail

- Immutable, append-only audit logs
- Cryptographic hash chain for integrity
- All PHI access tracked
- 6-year retention (HIPAA requirement)

## High Availability Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Load Balancer                          │
│                      (Health Checks)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │  API    │       │  API    │       │  API    │
   │ Node 1  │       │ Node 2  │       │ Node 3  │
   └────┬────┘       └────┬────┘       └────┬────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ MongoDB │       │  Redis  │       │ Metrics │
   │ Cluster │       │ Cluster │       │  Stack  │
   └─────────┘       └─────────┘       └─────────┘
```

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Full health check with dependencies |
| `/health/live` | Kubernetes liveness probe |
| `/health/ready` | Kubernetes readiness probe |
| `/metrics` | Prometheus metrics |

### Monitoring

- Prometheus metrics collection
- P50/P95/P99 latency tracking
- Error rate monitoring
- Active session tracking

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
