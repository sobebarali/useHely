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

**Important:** The `tenant_id` is required because users can belong to multiple hospitals. The system loads roles and permissions specific to the selected tenant.

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

#### MFA Grant

Used to complete two-factor authentication after receiving an MFA challenge from password grant.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| grant_type | string | Yes | `mfa` |
| challenge_token | string | Yes | MFA challenge token from password grant |
| code | string | Yes | 6-digit TOTP code from authenticator app or 8-char backup code |

### Response

#### Success Response

When authentication is successful (or MFA not enabled), tokens are issued:

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| access_token | string | JWT access token |
| token_type | string | `Bearer` |
| expires_in | number | Access token expiry in seconds (3600) |
| refresh_token | string | Refresh token |
| refresh_expires_in | number | Refresh token expiry in seconds (604800) |

#### MFA Challenge Response

When user has MFA enabled, password grant returns a challenge instead of tokens:

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| mfa_required | boolean | `true` - MFA verification needed |
| challenge_token | string | Challenge token for MFA grant (5-minute expiry) |
| expires_in | number | Challenge expiry in seconds (300) |

**Next Step:** Client must prompt user for TOTP code and submit MFA grant with `challenge_token` and `code`.

#### Example Responses

**Standard Login (MFA disabled):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "abc123...",
  "refresh_expires_in": 604800
}
```

**MFA Challenge (MFA enabled):**
```json
{
  "mfa_required": true,
  "challenge_token": "challenge_abc123...",
  "expires_in": 300
}
```

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
| 400 | INVALID_MFA_CHALLENGE | Invalid or expired MFA challenge token |
| 400 | INVALID_MFA_CODE | Invalid TOTP or backup code |
| 400 | MFA_NOT_CONFIGURED | MFA setup not completed |
| 401 | INVALID_CREDENTIALS | Wrong username/password |
| 401 | INVALID_TOKEN | Invalid refresh token |
| 403 | ACCOUNT_LOCKED | User account is locked |
| 403 | TENANT_INACTIVE | Hospital tenant is not active |

### Multi-Tenant Login Flow

Users can belong to multiple hospitals with different roles in each. The login process handles this through tenant selection.

#### Login Validation Chain

When a user submits credentials with a `tenant_id`, the system validates:

1. **Account Lock Check** - Is the account locked due to failed attempts?
2. **Tenant Validation** - Does the hospital exist and is it ACTIVE or VERIFIED?
3. **User Lookup** - Does the user exist with this email?
4. **Password Verification** - Is the password correct?
5. **MFA Check** (if user has MFA enabled)
   - Generate challenge token
   - Cache challenge in Redis (5-minute TTL)
   - Return MFA challenge response
   - Client prompts for TOTP code
   - Client submits MFA grant with `challenge_token` and `code`
   - Verify TOTP or backup code against user's MFA settings
   - Proceed to step 6 on success
6. **Staff Record Check** - Does the user have a Staff record in this tenant?
7. **Staff Status Check** - Is the Staff record ACTIVE?
8. **Role/Permission Load** - Load tenant-specific roles and permissions
9. **Token Issuance** - Generate and return access + refresh tokens

#### Multi-Hospital User Scenario

A doctor working at two hospitals:

| Hospital | Role | Permissions |
|----------|------|-------------|
| City General | DOCTOR | PATIENT:READ, PRESCRIPTION:CREATE |
| County Clinic | HOSPITAL_ADMIN | Full tenant access |

The same email address can have completely different access levels depending on which `tenant_id` is provided at login.

#### Session Caching

After successful authentication:

```
Redis Key: session:{access_token}
Value: {
  userId: "user-uuid",
  tenantId: "hospital-uuid",
  roles: ["DOCTOR"],
  permissions: ["PATIENT:READ", "PRESCRIPTION:CREATE", ...],
  cachedAt: timestamp
}
TTL: 3600 seconds (1 hour)
```

This cached session enables fast authorization checks without database queries.

#### First-Time Login

For newly created users (including admin users created during hospital verification):

1. User logs in with temporary password from welcome email
2. System detects `forcePasswordChange: true` on Staff record
3. User is required to set a new password
4. After password change, normal access is granted

---

## Get Hospitals for Email

**GET** `/api/auth/hospitals`

Retrieve the list of hospitals associated with a user's email address. Used during login to show a hospital selector when a user belongs to multiple hospitals.

### Authentication

None required.

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": "hospital-uuid-1",
      "name": "City General Hospital",
      "status": "ACTIVE"
    },
    {
      "id": "hospital-uuid-2",
      "name": "County Medical Center",
      "status": "VERIFIED"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Request success status |
| data | array | List of hospitals |
| data[].id | string | Hospital ID (tenant ID) |
| data[].name | string | Hospital name |
| data[].status | string | Hospital status (ACTIVE, VERIFIED) |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid or missing email |

### Usage Notes

- Returns an empty array if email is not associated with any hospital
- Only returns hospitals with ACTIVE or VERIFIED status
- Used by the login form to populate the hospital dropdown

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

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "john.doe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "tenantId": "hospital-uuid",
    "department": "Cardiology",
    "staffId": "staff-uuid",
    "roles": [
      {
        "id": "role-uuid",
        "name": "DOCTOR",
        "description": "Medical practitioner"
      }
    ],
    "permissions": ["PATIENT:READ", "PRESCRIPTION:CREATE"],
    "hospital": {
      "id": "hospital-uuid",
      "name": "City General Hospital",
      "status": "ACTIVE"
    },
    "attributes": {
      "department": "Cardiology",
      "specialization": "Interventional Cardiology",
      "shift": "morning"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Request success status |
| data | object | User profile data |
| data.id | string | User ID |
| data.username | string | Username |
| data.email | string | Email address |
| data.firstName | string | First name |
| data.lastName | string | Last name |
| data.tenantId | string | Tenant ID |
| data.department | string | Department |
| data.staffId | string | Staff record ID |
| data.roles | array | Array of role objects |
| data.permissions | array | Array of permission strings |
| data.hospital | object | Hospital information |
| data.hospital.id | string | Hospital ID |
| data.hospital.name | string | Hospital name |
| data.hospital.status | string | Hospital status |
| data.attributes | object | ABAC attributes |

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
