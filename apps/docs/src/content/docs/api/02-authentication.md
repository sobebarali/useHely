---
title: Authentication & Authorization API
description: API reference for OAuth2 authentication, JWT tokens, RBAC, and ABAC access control.
---

## Overview

The Authentication API implements OAuth2 with JWT tokens for secure user authentication and authorization. The system supports Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC).

---

## Get Token

**POST** `/api/auth/token`

Obtain access and refresh tokens via OAuth2.

### Authentication

Varies by grant type

### Request Body

#### Password Grant

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| grant_type | string | Yes | `password` |
| username | string | Yes | User email or username |
| password | string | Yes | User password |
| tenant_id | string | Yes | Hospital tenant ID |

#### Authorization Code Grant

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| grant_type | string | Yes | `authorization_code` |
| code | string | Yes | Authorization code |
| redirect_uri | string | Yes | Redirect URI |
| client_id | string | Yes | OAuth client ID |

#### Refresh Token Grant

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| grant_type | string | Yes | `refresh_token` |
| refresh_token | string | Yes | Valid refresh token |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| access_token | string | JWT access token |
| token_type | string | `Bearer` |
| expires_in | number | Access token expiry in seconds (3600) |
| refresh_token | string | Refresh token |
| refresh_expires_in | number | Refresh token expiry in seconds (604800) |

### Token Structure

Access token JWT payload contains:

| Claim | Type | Description |
|-------|------|-------------|
| sub | string | User ID |
| tenantId | string | Tenant ID |
| roles | array | User roles |
| permissions | array | User permissions |
| iat | number | Issued at timestamp |
| exp | number | Expiration timestamp |

### Token Expiry

| Token Type | Expiry |
|------------|--------|
| Access Token | 1 hour |
| Refresh Token | 7 days |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_GRANT | Invalid grant type |
| 400 | INVALID_REQUEST | Missing required fields |
| 401 | INVALID_CREDENTIALS | Wrong username/password |
| 401 | INVALID_TOKEN | Invalid refresh token |
| 403 | ACCOUNT_LOCKED | User account is locked |
| 403 | TENANT_INACTIVE | Hospital tenant is not active |

---

## Revoke Token

**POST** `/api/auth/revoke`

Invalidate access and/or refresh tokens.

### Authentication

Required. Bearer token.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Token to revoke |
| token_type_hint | string | No | `access_token` or `refresh_token` |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| revoked | boolean | `true` if successful |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing token |
| 401 | UNAUTHORIZED | Invalid bearer token |

### Business Rules

- Revoking a refresh token invalidates all associated access tokens
- All active sessions are terminated when refresh token is revoked

---

## Get Current User

**GET** `/api/auth/me`

Retrieve the authenticated user's profile with roles and permissions.

### Authentication

Required. Bearer token.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | User ID |
| username | string | Username |
| email | string | Email address |
| firstName | string | First name |
| lastName | string | Last name |
| tenantId | string | Tenant ID |
| department | string | Department |
| roles | array | Array of role objects |
| permissions | array | Array of permission strings |
| attributes | object | ABAC attributes |

### Roles Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Role ID |
| name | string | Role name |
| description | string | Role description |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 401 | TOKEN_EXPIRED | Access token has expired |

---

## Role-Based Access Control (RBAC)

### Pre-defined Roles

| Role | Description | Hierarchy Level |
|------|-------------|-----------------|
| SUPER_ADMIN | Platform administrator | 0 (highest) |
| HOSPITAL_ADMIN | Hospital administrator | 1 |
| DOCTOR | Medical practitioner | 2 |
| NURSE | Nursing staff | 2 |
| PHARMACIST | Pharmacy staff | 2 |
| RECEPTIONIST | Front desk staff | 3 |

### Role Permissions

#### SUPER_ADMIN
- All system operations across all tenants

#### HOSPITAL_ADMIN
- Tenant configuration
- User management (CRUD)
- Role assignment
- All lower-level permissions

#### DOCTOR
- `PATIENT:CREATE`
- `PATIENT:READ`
- `PATIENT:UPDATE`
- `PRESCRIPTION:CREATE`
- `PRESCRIPTION:READ`
- `PRESCRIPTION:UPDATE`
- `DIAGNOSIS:CREATE`
- `DIAGNOSIS:READ`

#### NURSE
- `PATIENT:READ`
- `PATIENT:UPDATE` (vitals only)
- `VITALS:CREATE`
- `VITALS:READ`
- `PRESCRIPTION:READ`

#### PHARMACIST
- `PRESCRIPTION:READ`
- `DISPENSING:CREATE`
- `DISPENSING:READ`
- `DISPENSING:UPDATE`

#### RECEPTIONIST
- `PATIENT:CREATE`
- `PATIENT:READ`
- `APPOINTMENT:CREATE`
- `APPOINTMENT:READ`
- `APPOINTMENT:UPDATE`
- `APPOINTMENT:DELETE`

### Permission Format

Permissions follow the pattern: `RESOURCE:ACTION`

| Action | Description |
|--------|-------------|
| CREATE | Create new resource |
| READ | View resource |
| UPDATE | Modify resource |
| DELETE | Remove resource |
| MANAGE | Full control over resource |

### Custom Roles

Hospital administrators can create custom roles with specific permission sets.

**POST** `/api/roles`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Role name |
| description | string | No | Role description |
| permissions | array | Yes | Array of permission strings |

### Business Rules

- Users can have multiple roles
- Permissions are cumulative across roles
- Hierarchical inheritance: higher-level roles inherit lower-level permissions
- Custom roles cannot exceed the permissions of the creating admin's role

---

## Attribute-Based Access Control (ABAC)

Fine-grained access control based on user and resource attributes.

### User Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| department | string | User's department |
| specialization | string | Medical specialization |
| shift | string | Work shift (morning, evening, night) |

### Resource Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| patient_department | string | Patient's assigned department |
| confidentiality_level | string | Data sensitivity level |
| assigned_doctor | string | Assigned doctor ID |

### Policy Examples

**Department Restriction**
- Doctors can only view patients in their department
- Nurses can only update vitals for patients in their ward

**Confidentiality Levels**
| Level | Access |
|-------|--------|
| PUBLIC | All authenticated users |
| INTERNAL | Department staff only |
| CONFIDENTIAL | Assigned staff only |
| RESTRICTED | Specific role holders only |

### Policy Evaluation

1. Check RBAC permission exists
2. Evaluate ABAC policy conditions
3. Grant access only if both pass

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | PERMISSION_DENIED | RBAC permission check failed |
| 403 | POLICY_DENIED | ABAC policy check failed |
