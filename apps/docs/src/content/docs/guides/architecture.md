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
├── controller/     # HTTP request handlers
├── service/        # Business logic
├── repository/     # Data access
├── model/          # Mongoose schemas
├── dto/            # Data transfer objects
├── validation/     # Input validation
└── routes/         # Route definitions
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
