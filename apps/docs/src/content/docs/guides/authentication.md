---
title: Authentication Guide
description: Understanding authentication, authorization, and access control in useHely.
---

## Overview

useHely uses OAuth2 with JWT tokens for authentication and implements both Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) for authorization.

## Complete Multi-Tenant Flow

### Hospital Onboarding to First Login

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE MULTI-TENANT FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PHASE 1: Hospital Onboarding                                        │
│  ─────────────────────────────                                       │
│                                                                      │
│  1. POST /api/hospitals (register)                                   │
│     └─ Creates hospital with status: PENDING                         │
│     └─ Sends verification email                                      │
│                                                                      │
│  2. POST /api/hospitals/:id/verify (verify token)                    │
│     └─ Updates status to VERIFIED                                    │
│     └─ AUTO-PROVISIONS TENANT:                                       │
│        ├─ Seed system roles (HOSPITAL_ADMIN, DOCTOR, etc.)          │
│        ├─ Create default Administration department                  │
│        ├─ Create admin User + Account with temp password            │
│        ├─ Create Staff linking admin to hospital                    │
│        └─ Send welcome email with credentials                       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PHASE 2: User Login                                                 │
│  ───────────────────                                                 │
│                                                                      │
│  3. POST /api/auth/token (password grant)                            │
│     {                                                                │
│       "grant_type": "password",                                      │
│       "username": "admin@hospital.com",                              │
│       "password": "temp-password-from-email",                        │
│       "tenant_id": "hospital-uuid"                                   │
│     }                                                                │
│                                                                      │
│     Validation Chain:                                                │
│     ├─ Check account not locked (Redis)                             │
│     ├─ Verify hospital exists & is ACTIVE/VERIFIED                  │
│     ├─ Find user by email                                           │
│     ├─ Verify password (bcrypt)                                     │
│     ├─ Find Staff record for user + tenant                          │
│     ├─ Verify Staff status is ACTIVE                                │
│     └─ Load roles and aggregate permissions                         │
│                                                                      │
│     If MFA enabled for user:                                         │
│     Response (MFA Challenge):                                        │
│     {                                                                │
│       "mfa_required": true,                                          │
│       "challenge_token": "...",                                      │
│       "expires_in": 300                                              │
│     }                                                                │
│                                                                      │
│  3b. POST /api/auth/token (mfa grant) - If MFA enabled              │
│      {                                                               │
│        "grant_type": "mfa",                                          │
│        "challenge_token": "...",                                     │
│        "code": "123456"  // TOTP or backup code                      │
│      }                                                               │
│                                                                      │
│      Response (Tokens):                                              │
│      {                                                               │
│        "access_token": "...",                                        │
│        "refresh_token": "...",                                       │
│        "expires_in": 3600                                            │
│      }                                                               │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PHASE 3: Authenticated Requests                                     │
│  ───────────────────────────────                                     │
│                                                                      │
│  4. GET /api/users (any protected endpoint)                          │
│     Headers: Authorization: Bearer <access_token>                    │
│                                                                      │
│     Middleware Chain:                                                │
│     ├─ authenticate.ts                                              │
│     │   └─ Extract token → Redis lookup → populate req.user         │
│     │   └─ req.user = { id, tenantId, roles, permissions }          │
│     │                                                                │
│     ├─ authorize("USER:READ")                                       │
│     │   └─ Check permissions array includes required permission     │
│     │                                                                │
│     └─ Controller                                                   │
│         └─ Uses req.user.tenantId for all queries                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

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

## Multi-Factor Authentication (MFA)

### Optional Two-Factor Authentication

MFA is optional and can be enabled per user for enhanced security:

1. **User enables MFA** via `/api/auth/mfa/enable`
   - Receives TOTP secret and QR code
   - Scans QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Receives 10 backup codes for recovery

2. **User verifies setup** via `/api/auth/mfa/verify`
   - Provides first TOTP code from app
   - MFA is activated on success

3. **Future logins require two steps:**
   - Step 1: Password → MFA challenge
   - Step 2: TOTP code → Access tokens

### Backup Codes

- 10 one-time use codes provided during setup
- Use if authenticator app unavailable
- Each code removed after use
- Generate new codes by disabling and re-enabling MFA

### MFA Best Practices

| User Type | Recommendation |
|-----------|----------------|
| Admin accounts | Require MFA |
| High-privilege users | Strongly recommend MFA |
| Regular users | Optional MFA |
| Backup codes | Store securely offline |

## Data Encryption

### Field-Level Encryption

Sensitive PHI/PII data is encrypted at rest using AES-256-GCM:

**Encrypted Fields:**
- **Patient**: firstName, lastName, phone, email, address, emergency contact
- **Prescription**: diagnosis, notes
- **Vitals**: notes, correctionReason
- **Staff**: phone

**How It Works:**
1. Mongoose plugin intercepts save/update operations
2. Encrypts specified fields with master key
3. Adds "enc:" prefix for identification
4. Decrypts automatically on read

**Key Management:**
- Master key stored in `ENCRYPTION_MASTER_KEY` environment variable
- Keys rotated every 90 days (recommended)
- Rotation re-encrypts all data with new key

### Encryption Configuration

Generate encryption key:
```bash
openssl rand -hex 32
```

Add to `.env`:
```bash
ENCRYPTION_MASTER_KEY=your-generated-key-here
```

**Important:** Keep encryption keys secure. Loss of encryption key means data cannot be decrypted.

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

### How TenantId Flows Through the System

```
┌────────────────┐    tenant_id in     ┌─────────────────┐
│  Login Request │ ─────────────────▶  │  Token Service  │
└────────────────┘    request body     └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  Redis Cache    │
                                       │  session:{token}│
                                       │  { tenantId,    │
                                       │    userId,      │
                                       │    permissions }│
                                       └────────┬────────┘
                                                │
┌────────────────┐    Authorization    ┌────────▼────────┐
│  API Request   │ ─────────────────▶  │  Authenticate   │
│  Bearer token  │                     │  Middleware     │
└────────────────┘                     └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  req.user = {   │
                                       │    tenantId,    │
                                       │    roles,       │
                                       │    permissions  │
                                       │  }              │
                                       └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  All Queries    │
                                       │  Scoped by      │
                                       │  tenantId       │
                                       └─────────────────┘
```

### Users in Multiple Tenants

A single user (by email) can belong to multiple hospitals with different roles:

| Hospital | Staff Record | Role |
|----------|--------------|------|
| City General Hospital | staff-123 | DOCTOR |
| County Clinic | staff-456 | HOSPITAL_ADMIN |
| Rural Health Center | staff-789 | NURSE |

When logging in, the user specifies which hospital via `tenant_id`. The system then:
1. Finds the Staff record for that user + tenant combination
2. Loads the roles assigned to that Staff record
3. Aggregates permissions from all assigned roles
4. Caches the session with tenant-specific context

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
