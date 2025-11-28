---
title: Authentication Guide
description: Understanding authentication, authorization, and access control in HMS.
---

## Overview

HMS uses OAuth2 with JWT tokens for authentication and implements both Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) for authorization.

## Authentication Flow

### Login Process

1. User submits credentials (username/email + password)
2. System validates credentials against tenant
3. On success, system issues:
   - **Access Token** (1 hour expiry)
   - **Refresh Token** (7 days expiry)
4. Client stores tokens securely
5. Client includes access token in API requests

### Token Structure

Access tokens contain:

| Claim | Description |
|-------|-------------|
| sub | User ID |
| tenantId | Hospital tenant ID |
| roles | Array of user roles |
| permissions | Array of permissions |
| iat | Issued at timestamp |
| exp | Expiration timestamp |

### Token Refresh

When access token expires:

1. Client sends refresh token to `/api/auth/token`
2. System validates refresh token
3. New access token issued
4. Client continues with new token

### Logout

To logout:

1. Call `/api/auth/revoke` with tokens
2. Tokens invalidated server-side
3. Client clears stored tokens

## Authorization

### Role-Based Access Control (RBAC)

Users are assigned roles that grant permissions.

#### Default Roles

| Role | Level | Description |
|------|-------|-------------|
| SUPER_ADMIN | 0 | Platform-wide access |
| HOSPITAL_ADMIN | 1 | Hospital management |
| DOCTOR | 2 | Patient care |
| NURSE | 2 | Patient support |
| PHARMACIST | 2 | Medication dispensing |
| RECEPTIONIST | 3 | Front desk operations |

#### Permission Format

Permissions follow `RESOURCE:ACTION` pattern:

| Permission | Description |
|------------|-------------|
| PATIENT:CREATE | Register new patients |
| PATIENT:READ | View patient records |
| PATIENT:UPDATE | Modify patient data |
| PRESCRIPTION:CREATE | Create prescriptions |
| APPOINTMENT:MANAGE | Full appointment control |

#### Role Inheritance

Higher-level roles inherit lower-level permissions:

```
SUPER_ADMIN
    └── HOSPITAL_ADMIN
            ├── DOCTOR
            ├── NURSE
            ├── PHARMACIST
            └── RECEPTIONIST
```

### Attribute-Based Access Control (ABAC)

Fine-grained control based on attributes.

#### User Attributes

| Attribute | Description |
|-----------|-------------|
| department | User's department |
| specialization | Medical specialty |
| shift | Work shift (morning, evening, night) |

#### Resource Attributes

| Attribute | Description |
|-----------|-------------|
| patient_department | Patient's department |
| confidentiality_level | Data sensitivity |
| assigned_doctor | Treating doctor |

#### Policy Examples

**Department Restriction:**
- Doctors view only patients in their department
- Nurses access only their ward's patients

**Confidentiality Levels:**

| Level | Access Scope |
|-------|--------------|
| PUBLIC | All authenticated users |
| INTERNAL | Department staff |
| CONFIDENTIAL | Assigned staff only |
| RESTRICTED | Specific roles only |

## Multi-Tenant Context

### Tenant Isolation

Every request includes tenant context:

1. JWT contains `tenantId`
2. Middleware extracts tenant
3. All queries scoped to tenant
4. Cross-tenant access blocked

### Tenant in Requests

The `X-Tenant-ID` header is automatically set from the JWT token. You don't need to manually include it.

## Security Best Practices

### Password Requirements

| Rule | Requirement |
|------|-------------|
| Length | Minimum 8 characters |
| Uppercase | At least 1 |
| Lowercase | At least 1 |
| Number | At least 1 |
| Special | At least 1 |
| History | Cannot reuse last 3 |

### Account Security

| Event | Action |
|-------|--------|
| 5 failed logins | Account locked |
| Password expired | Force change on login |
| Suspicious activity | Admin notification |

### Session Management

| Setting | Value |
|---------|-------|
| Access token life | 1 hour |
| Refresh token life | 7 days |
| Idle timeout | Configurable |
| Concurrent sessions | Allowed |

## Custom Roles

Hospital admins can create custom roles:

1. Navigate to **Settings > Roles**
2. Click **Create Role**
3. Provide name and description
4. Select permissions
5. Save role

### Permission Categories

| Category | Permissions |
|----------|-------------|
| Dashboard | VIEW |
| Patients | CREATE, READ, UPDATE, DELETE, EXPORT |
| Prescriptions | CREATE, READ, UPDATE |
| Appointments | CREATE, READ, UPDATE, DELETE, MANAGE |
| Users | CREATE, READ, UPDATE, DELETE, MANAGE |
| Departments | CREATE, READ, UPDATE, DELETE, MANAGE |
| Reports | VIEW, EXPORT |
| Settings | VIEW, MANAGE |

## API Authentication

### Include Token in Requests

```
Authorization: Bearer <access_token>
```

### Handle Token Expiry

1. Catch 401 responses
2. Attempt token refresh
3. Retry original request
4. If refresh fails, redirect to login

### Error Codes

| Code | Description |
|------|-------------|
| UNAUTHORIZED | Missing or invalid token |
| TOKEN_EXPIRED | Access token expired |
| FORBIDDEN | Insufficient permissions |
| ACCOUNT_LOCKED | Too many failed attempts |
| TENANT_INACTIVE | Hospital not active |
