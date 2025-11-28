---
title: Hospital & Tenant API
description: API reference for hospital registration, tenant management, and multi-tenancy operations.
---

## Overview

The Hospital & Tenant API enables hospitals to self-register on the platform and manages tenant isolation for the multi-tenant SaaS architecture.

---

## Register Hospital

**POST** `/api/hospitals`

Creates a new hospital registration on the platform.

### Authentication

None required (public endpoint)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Hospital name |
| address | object | Yes | Hospital address details |
| address.street | string | Yes | Street address |
| address.city | string | Yes | City |
| address.state | string | Yes | State/Province |
| address.postalCode | string | Yes | Postal/ZIP code |
| address.country | string | Yes | Country |
| contactEmail | string | Yes | Primary contact email |
| contactPhone | string | Yes | Primary contact phone |
| licenseNumber | string | Yes | Hospital license number (must be unique) |
| adminEmail | string | Yes | Administrator email for initial admin account |
| adminPhone | string | Yes | Administrator phone number |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Hospital ID (UUID) |
| tenantId | string | Auto-generated tenant ID (UUID) |
| name | string | Hospital name |
| status | string | Initial status: `PENDING` |
| adminUsername | string | Auto-generated admin username: `admin@{hospital-domain}` |
| message | string | Confirmation message about verification email |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid required fields |
| 409 | LICENSE_EXISTS | License number already registered |
| 409 | EMAIL_EXISTS | Admin email already in use |

### Business Rules

- License number must be unique across the entire platform
- System auto-generates a tenant ID (UUID-based)
- Creates isolated database schema per tenant
- Sends verification email with activation link
- Admin credentials created automatically with username format: `admin@{hospital-domain}`
- Initial hospital status is `PENDING`

---

## Get Hospital

**GET** `/api/hospitals/:id`

Retrieves hospital details by ID.

### Authentication

Required. Bearer token with `HOSPITAL:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Hospital ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Hospital ID |
| tenantId | string | Tenant ID |
| name | string | Hospital name |
| address | object | Hospital address |
| contactEmail | string | Contact email |
| contactPhone | string | Contact phone |
| licenseNumber | string | License number |
| status | string | Current status |
| createdAt | string | ISO 8601 timestamp |
| updatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Hospital not found |

---

## Update Hospital

**PATCH** `/api/hospitals/:id`

Updates hospital information.

### Authentication

Required. Bearer token with `HOSPITAL:UPDATE` permission. Only `HOSPITAL_ADMIN` or `SUPER_ADMIN` roles.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Hospital ID |

### Request Body

All fields optional:

| Field | Type | Description |
|-------|------|-------------|
| name | string | Hospital name |
| address | object | Hospital address |
| contactEmail | string | Contact email |
| contactPhone | string | Contact phone |

### Response

**Status: 200 OK**

Returns updated hospital object.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid field values |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Hospital not found |

### Business Rules

- License number cannot be changed after registration
- Only users within the same tenant can update their hospital

---

## Verify Hospital

**POST** `/api/hospitals/:id/verify`

Verifies hospital email and activates the account.

### Authentication

None required (uses verification token)

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Hospital ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Email verification token |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Hospital ID |
| status | string | Updated status: `VERIFIED` |
| message | string | Confirmation message |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_TOKEN | Token is invalid or malformed |
| 400 | TOKEN_EXPIRED | Verification token has expired |
| 404 | NOT_FOUND | Hospital not found |
| 409 | ALREADY_VERIFIED | Hospital already verified |

### Business Rules

- Email verification is mandatory before activation
- Verification token expires after 24 hours
- Status changes from `PENDING` to `VERIFIED`

---

## Update Hospital Status

**PATCH** `/api/hospitals/:id/status`

Updates the hospital operational status.

### Authentication

Required. Bearer token with `HOSPITAL:MANAGE` permission. `SUPER_ADMIN` role required.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Hospital ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status value |
| reason | string | No | Reason for status change |

### Valid Status Values

| Status | Description |
|--------|-------------|
| PENDING | Initial state after registration |
| VERIFIED | Email verified, awaiting activation |
| ACTIVE | Fully operational |
| SUSPENDED | Temporarily disabled |
| INACTIVE | Permanently disabled |

### Status Transitions

```
PENDING → VERIFIED → ACTIVE → SUSPENDED → INACTIVE
                  ↑          ↓
                  ←──────────←
```

- `PENDING` → `VERIFIED` (via email verification)
- `VERIFIED` → `ACTIVE` (admin approval)
- `ACTIVE` → `SUSPENDED` (temporary suspension)
- `SUSPENDED` → `ACTIVE` (reactivation)
- `ACTIVE` or `SUSPENDED` → `INACTIVE` (permanent deactivation)

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Hospital ID |
| status | string | Updated status |
| updatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_STATUS | Invalid status value |
| 400 | INVALID_TRANSITION | Status transition not allowed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Only SUPER_ADMIN can change status |
| 404 | NOT_FOUND | Hospital not found |

### Business Rules

- Only `SUPER_ADMIN` can manually change hospital status
- Status transitions must follow the defined flow
- Suspending a hospital disables all user access
- Inactive hospitals cannot be reactivated

---

## Tenant Isolation

All API requests include tenant context derived from the JWT token.

### Tenant Context Headers

| Header | Description |
|--------|-------------|
| X-Tenant-ID | Tenant identifier (extracted from JWT) |

### Middleware Behavior

- Tenant context automatically extracted from JWT token
- All database queries scoped to tenant's schema
- Cross-tenant data access prevented via middleware
- Redis namespacing: `tenant:{tenantId}:*`

### Architecture

- Schema-per-tenant database isolation
- Shared infrastructure with isolated data
- Automatic tenant context injection in all queries
