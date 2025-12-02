---
title: Organization & Tenant API
description: API reference for organization registration, tenant management, and multi-tenancy operations.
---

## Overview

The Organization & Tenant API enables healthcare organizations to self-register on the platform and manages tenant isolation for the multi-tenant SaaS architecture.

### Organization Types

The platform supports three organization types with different registration flows:

| Type | Description | Registration Flow |
|------|-------------|-------------------|
| HOSPITAL | Large healthcare facility with multiple departments | Requires license verification via email |
| CLINIC | Medical clinic with one or more practitioners | Instant activation (self-service) |
| SOLO_PRACTICE | Individual practitioner | Instant activation with DOCTOR role |

---

## Register Organization

**POST** `/api/hospitals`

Creates a new organization registration on the platform.

### Authentication

None required (public endpoint)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | No | Organization type: `HOSPITAL`, `CLINIC`, `SOLO_PRACTICE`. Defaults to `HOSPITAL` |
| name | string | Yes | Organization name |
| address | object | Yes | Organization address details |
| address.street | string | Yes | Street address |
| address.city | string | Yes | City |
| address.state | string | Yes | State/Province |
| address.postalCode | string | Yes | Postal/ZIP code |
| address.country | string | Yes | Country |
| contactEmail | string | Yes | Primary contact email |
| contactPhone | string | Yes | Primary contact phone |
| licenseNumber | string | Conditional | Required for `HOSPITAL` type only |
| adminEmail | string | Yes | Administrator email for initial admin account |
| adminPhone | string | Yes | Administrator phone number |
| pricingTier | string | No | `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE`. Defaults based on type |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Organization ID (UUID) |
| tenantId | string | Auto-generated tenant ID (UUID) |
| name | string | Organization name |
| type | string | Organization type |
| status | string | `PENDING` for HOSPITAL, `ACTIVE` for CLINIC/SOLO_PRACTICE |
| adminUsername | string | Auto-generated admin username: `admin@{organization-domain}` |
| message | string | Confirmation message |
| temporaryPassword | string | Only for CLINIC/SOLO_PRACTICE (self-service flow) |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid required fields |
| 400 | LICENSE_REQUIRED | License number required for HOSPITAL type |
| 409 | LICENSE_EXISTS | License number already registered |
| 409 | EMAIL_EXISTS | Admin email already in use |

### Business Rules

#### Hospital Registration
- License number required and must be unique across the platform
- Status is `PENDING` until email verification
- Sends verification email with activation link
- Admin account created after verification

#### Clinic & Solo Practice Registration (Self-Service)
- No license number required
- Status is `ACTIVE` immediately
- Admin account created instantly with temporary password
- Welcome email sent with login credentials
- For `SOLO_PRACTICE`: Admin also receives DOCTOR role

---

## Get Organization

**GET** `/api/hospitals/:id`

Retrieves organization details by ID.

### Authentication

Required. Bearer token with `HOSPITAL:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Organization ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Organization ID |
| tenantId | string | Tenant ID |
| name | string | Organization name |
| type | string | Organization type |
| address | object | Organization address |
| contactEmail | string | Contact email |
| contactPhone | string | Contact phone |
| licenseNumber | string | License number (HOSPITAL only) |
| status | string | Current status |
| pricingTier | string | Pricing tier |
| createdAt | string | ISO 8601 timestamp |
| updatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Organization not found |

---

## Update Organization

**PATCH** `/api/hospitals/:id`

Updates organization information.

### Authentication

Required. Bearer token with `HOSPITAL:UPDATE` permission. Only `HOSPITAL_ADMIN` or `SUPER_ADMIN` roles.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Organization ID |

### Request Body

All fields optional:

| Field | Type | Description |
|-------|------|-------------|
| name | string | Organization name |
| address | object | Organization address |
| contactEmail | string | Contact email |
| contactPhone | string | Contact phone |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Organization ID |
| name | string | Organization name |
| address | object | Organization address |
| address.street | string | Street address |
| address.city | string | City |
| address.state | string | State/Province |
| address.postalCode | string | Postal/ZIP code |
| address.country | string | Country |
| contactEmail | string | Contact email |
| contactPhone | string | Contact phone |
| status | string | Current status |
| updatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid field values |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Organization not found |

### Business Rules

- License number and type cannot be changed after registration
- Only users within the same tenant can update their organization

---

## Verify Organization (Hospital Only)

**POST** `/api/hospitals/:id/verify`

Verifies hospital email and activates the account. This endpoint is only used for HOSPITAL type registrations.

> **Note:** CLINIC and SOLO_PRACTICE types are activated immediately upon registration and do not require verification.

### Authentication

None required (uses verification token)

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Organization ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Email verification token |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Organization ID |
| status | string | Updated status: `VERIFIED` |
| message | string | Confirmation message |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_TOKEN | Token is invalid or malformed |
| 400 | TOKEN_EXPIRED | Verification token has expired |
| 404 | NOT_FOUND | Organization not found |
| 409 | ALREADY_VERIFIED | Organization already verified |

### Business Rules

- Only applies to HOSPITAL type organizations
- Email verification is mandatory before activation
- Verification token expires after 24 hours
- Status changes from `PENDING` to `VERIFIED`

### Automatic Tenant Provisioning

Upon successful verification, the system automatically provisions the tenant with everything needed to start operations:

#### 1. System Roles Created

The following pre-defined roles are seeded for the tenant:

| Role | Description | Hierarchy Level |
|------|-------------|-----------------|
| SUPER_ADMIN | Platform administrator | 0 (highest) |
| HOSPITAL_ADMIN | Hospital administrator | 1 |
| DOCTOR | Medical practitioner | 2 |
| NURSE | Nursing staff | 2 |
| PHARMACIST | Pharmacy staff | 2 |
| RECEPTIONIST | Front desk staff | 3 |

Each role comes with pre-configured permissions. See [Authentication API](/api/02-authentication) for permission details.

#### 2. Default Department Created

| Field | Value |
|-------|-------|
| Name | Administration |
| Code | ADMIN |
| Type | ADMINISTRATIVE |
| Status | ACTIVE |

#### 3. Admin User Created

The admin user is automatically created using the `adminEmail` and `adminPhone` from the organization registration:

| Field | Value |
|-------|-------|
| Email | From `adminEmail` in registration |
| Role | HOSPITAL_ADMIN (+ DOCTOR for SOLO_PRACTICE) |
| Department | Administration |
| Employee ID | EMP-00001 |
| Status | ACTIVE |
| Force Password Change | true |

#### 4. Welcome Email Sent

A welcome email is sent to the admin containing:

- Temporary password (auto-generated)
- Login URL
- Security instructions
- Note that password must be changed on first login

#### Provisioning Flow Diagram

```
POST /api/hospitals/:id/verify
         │
         ▼
  ┌──────────────────┐
  │ Validate Token   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Update Status    │
  │ to VERIFIED      │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Seed System      │
  │ Roles (6 roles)  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Create Default   │
  │ Department       │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Create Admin     │
  │ User + Account   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Send Welcome     │
  │ Email            │
  └────────┬─────────┘
           │
           ▼
       Response
```

---

## Update Organization Status

**PATCH** `/api/hospitals/:id/status`

Updates the organization operational status.

### Authentication

Required. Bearer token with `HOSPITAL:MANAGE` permission. `SUPER_ADMIN` role required.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Organization ID |

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
| id | string | Organization ID |
| status | string | Updated status |
| updatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_STATUS | Invalid status value |
| 400 | INVALID_TRANSITION | Status transition not allowed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Only SUPER_ADMIN can change status |
| 404 | NOT_FOUND | Organization not found |

### Business Rules

- Only `SUPER_ADMIN` can manually change organization status
- Status transitions must follow the defined flow
- Suspending an organization disables all user access
- Inactive organizations cannot be reactivated

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
