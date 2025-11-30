---
title: Security & Encryption API
description: API reference for field-level encryption, MFA, key management, and security event monitoring.
---

## Overview

The Security API provides field-level encryption for PHI/PII data, multi-factor authentication (MFA), key management integration, and security event monitoring. These features support SOC 2-aligned security practices.

---

## Field-Level Encryption

### Encrypted Fields

The following sensitive PHI/PII fields are encrypted at rest using AES-256-GCM:

| Model | Encrypted Fields |
|-------|------------------|
| Patient | firstName, lastName, phone, email, address.street, address.city, address.state, address.postalCode, address.country, emergencyContact.name, emergencyContact.phone, emergencyContact.relationship |
| Prescription | diagnosis, notes |
| Vitals | notes, correctionReason |
| Staff | phone |

### Encryption Implementation

Field-level encryption is implemented using a Mongoose plugin that automatically encrypts data before saving and decrypts when reading:

```
┌─────────────────────────────────────────────────────┐
│              Application Layer                       │
│                                                      │
│  ┌──────────────┐       ┌──────────────────────┐   │
│  │   Mongoose   │       │  Encryption Plugin   │   │
│  │    Model     │────▶  │  (Pre/Post Hooks)    │   │
│  └──────────────┘       └──────────┬───────────┘   │
│                                    │               │
└────────────────────────────────────┼───────────────┘
                                     │
                      ┌──────────────▼──────────────┐
                      │       MongoDB               │
                      │  (Encrypted with "enc:")    │
                      └─────────────────────────────┘
```

**How It Works:**

1. **Pre-Save Hook**: Intercepts document saves and encrypts specified fields with master key
2. **Encrypted Format**: Adds `"enc:"` prefix to identify encrypted values
3. **Post-Read Hook**: Automatically decrypts fields when documents are retrieved
4. **Transparent**: Application code works with plaintext, encryption is automatic

### Configuration

| Setting | Description | Example |
|---------|-------------|---------|
| ENCRYPTION_MASTER_KEY | 256-bit encryption key (64-char hex string) | `openssl rand -hex 32` |
| Rotation Schedule | Recommended key rotation interval | 90 days |

**Environment Variable:**
```bash
# Generate with: openssl rand -hex 32
ENCRYPTION_MASTER_KEY=a1b2c3d4e5f6...
```

---

## Multi-Factor Authentication (MFA)

MFA is **optional** and can be enabled per user for enhanced security. When enabled, users must provide a TOTP code from their authenticator app in addition to their password.

### MFA Setup Flow

1. **Enable MFA** - Generate TOTP secret and backup codes
2. **Scan QR Code** - Add to authenticator app (Google Authenticator, Authy, etc.)
3. **Verify Setup** - Provide first TOTP code to activate
4. **Store Backup Codes** - Save 10 one-time recovery codes securely

### Enable MFA

**POST** `/api/auth/mfa/enable`

Generate TOTP secret, QR code, and backup codes for MFA setup.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| secret | string | TOTP secret (base32 encoded) |
| qrCodeDataUrl | string | QR code as data URL for authenticator apps |
| backupCodes | array | 10 one-time backup codes (plain text) |

**Important:** Backup codes are shown **only once**. Users must save them securely. Each code can be used only once.

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | MFA_ALREADY_ENABLED | MFA is already enabled. Disable first to reconfigure. |
| 401 | UNAUTHORIZED | Invalid or missing token |

#### Example Response

```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgo...",
    "backupCodes": [
      "a1b2c3d4",
      "e5f6g7h8",
      ...
    ]
  }
}
```

---

### Verify MFA

**POST** `/api/auth/mfa/verify`

Verify TOTP code from authenticator app to activate MFA.

#### Authentication

Required. Bearer token.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | 6-digit TOTP code from authenticator app |

#### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| enabled | boolean | `true` - MFA is now active |
| verifiedAt | string | ISO 8601 timestamp of verification |

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | MFA_NOT_CONFIGURED | Must call `/mfa/enable` first |
| 400 | INVALID_MFA_CODE | Invalid or expired TOTP code |
| 401 | UNAUTHORIZED | Invalid or missing token |

---

### Disable MFA

**POST** `/api/auth/mfa/disable`

Disable MFA for the authenticated user.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Invalid or missing token |

---

### MFA Authentication Flow

When MFA is enabled, the login process becomes two-step:

```
┌─────────────────────────────────────────────────────────┐
│                  MFA Authentication Flow                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: Password Authentication                        │
│  ─────────────────────────────                          │
│  POST /api/auth/token                                   │
│  { grant_type: "password", username, password, ... }    │
│                                                          │
│  Response (MFA Challenge):                              │
│  {                                                       │
│    "mfa_required": true,                                │
│    "challenge_token": "abc123...",                      │
│    "expires_in": 300  // 5 minutes                      │
│  }                                                       │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 2: MFA Verification                               │
│  ───────────────────────                                │
│  POST /api/auth/token                                   │
│  {                                                       │
│    "grant_type": "mfa",                                 │
│    "challenge_token": "abc123...",                      │
│    "code": "123456"  // TOTP or backup code             │
│  }                                                       │
│                                                          │
│  Response (Tokens):                                     │
│  {                                                       │
│    "access_token": "...",                               │
│    "refresh_token": "...",                              │
│    "token_type": "Bearer",                              │
│    "expires_in": 3600                                   │
│  }                                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Backup Codes

- **Quantity**: 10 codes generated during MFA setup
- **Format**: 8-character hex strings
- **Storage**: Hashed with bcrypt before database storage
- **Usage**: One-time use only (removed after successful use)
- **Purpose**: Recovery access if authenticator app unavailable
- **Regeneration**: Disable and re-enable MFA to get new codes

---

## Key Management

### Rotate Encryption Keys

**POST** `/api/security/keys/rotate`

Rotate encryption keys. Re-encrypts all data with new key. Admin only.

#### Authentication

Required. Bearer token with `SECURITY:MANAGE` permission.

#### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| newKeyId | string | New encryption key ID |
| previousKeyId | string | Previous encryption key ID |
| rotatedAt | string | Rotation timestamp (ISO 8601) |
| rotatedBy | string | User ID who initiated rotation |
| recordsReEncrypted | number | Total records re-encrypted |
| breakdown | object | Re-encryption breakdown by collection |
| breakdown.patients | number | Patient records re-encrypted |
| breakdown.prescriptions | number | Prescription records re-encrypted |
| breakdown.vitals | number | Vitals records re-encrypted |
| breakdown.staff | number | Staff records re-encrypted |

**Important:** After key rotation, you must manually update the `ENCRYPTION_MASTER_KEY` environment variable with the new key and restart the server for it to take effect.

#### Example Response

```json
{
  "success": true,
  "data": {
    "newKeyId": "abc12345",
    "previousKeyId": "xyz67890",
    "rotatedAt": "2025-11-30T10:30:00.000Z",
    "rotatedBy": "user-uuid",
    "recordsReEncrypted": 1250,
    "breakdown": {
      "patients": 500,
      "prescriptions": 300,
      "vitals": 400,
      "staff": 50
    }
  }
}
```

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | PERMISSION_DENIED | Missing SECURITY:MANAGE permission |
| 409 | ROTATION_IN_PROGRESS | Key rotation already in progress |

---

### Get Key Status

**GET** `/api/security/keys/status`

Get current encryption key status and rotation history.

#### Authentication

Required. Bearer token with `SECURITY:READ` permission.

#### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| currentKeyId | string | Current encryption key ID |
| lastRotation | object \| null | Last rotation details (null if never rotated) |
| lastRotation.rotatedAt | string | Rotation timestamp (ISO 8601) |
| lastRotation.rotatedBy | string | User ID who initiated rotation |
| lastRotation.recordsReEncrypted | number | Total records re-encrypted |
| lastRotation.daysSinceRotation | number | Days since this rotation |
| rotationRecommended | boolean | `true` if rotation recommended (>90 days) |
| totalRotations | number | Total number of rotations performed |

#### Example Response

```json
{
  "success": true,
  "data": {
    "currentKeyId": "abc12345",
    "lastRotation": {
      "rotatedAt": "2025-09-15T14:20:00.000Z",
      "rotatedBy": "user-uuid",
      "recordsReEncrypted": 1250,
      "daysSinceRotation": 76
    },
    "rotationRecommended": false,
    "totalRotations": 3
  }
}
```

---

## Security Events

### List Security Events

**GET** `/api/security/events`

Query security events (failed logins, permission violations, suspicious activity).

#### Authentication

Required. Bearer token with `SECURITY:READ` permission.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | Event type filter |
| severity | string | No | `low`, `medium`, `high`, `critical` |
| startDate | string | No | Start date (ISO 8601) |
| endDate | string | No | End date (ISO 8601) |
| userId | string | No | Filter by user |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |

#### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Security event objects |
| pagination | object | Pagination metadata |

#### Security Event Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Event ID |
| type | string | Event type |
| severity | string | Severity level |
| userId | string | User ID (if applicable) |
| ip | string | IP address |
| userAgent | string | User agent string |
| details | object | Event-specific details |
| timestamp | string | Event timestamp (ISO 8601) |

#### Event Types

| Type | Description | Severity |
|------|-------------|----------|
| AUTH_FAILED | Failed login attempt | medium |
| AUTH_LOCKOUT | Account locked | high |
| PERMISSION_DENIED | Unauthorized access attempt | medium |
| MFA_ENABLED | MFA enabled for user | low |
| MFA_DISABLED | MFA disabled for user | low |
| MFA_FAILED | Failed MFA verification | high |
| SUSPICIOUS_ACTIVITY | Unusual access pattern | high |
| KEY_ROTATION | Encryption key rotated | low |
| ADMIN_ACTION | Administrative action | medium |

---

### Get Security Event

**GET** `/api/security/events/:id`

Get details of a specific security event.

#### Authentication

Required. Bearer token with `SECURITY:READ` permission.

#### Response

**Status: 200 OK**

Returns full security event object with additional context.

---

## SOC 2 Control Mapping

| Control | Implementation |
|---------|----------------|
| CC6.1 - Logical Access | RBAC + ABAC enforcement |
| CC6.6 - MFA | TOTP-based second factor |
| CC6.7 - Privileged Access | Admin action logging |
| CC7.2 - Security Monitoring | Security event tracking |
| CC7.3 - Incident Response | Event alerting integration |

---

## Access Control

### RBAC (Role-Based Access Control)

All API endpoints are protected by role-based permissions using the format `RESOURCE:ACTION`. Users must have the required permission to access an endpoint.

**Example permissions:**
- `PATIENT:READ` - View patient data
- `PRESCRIPTION:CREATE` - Create prescriptions
- `VITALS:UPDATE` - Update vital signs records

### ABAC (Attribute-Based Access Control)

In addition to RBAC, the system enforces fine-grained access control based on resource ownership and user attributes. ABAC policies ensure users can only access resources they are authorized to see within their role.

#### Patient Ownership Policy

**Applies to:** Doctors accessing patient records

- Doctors can only access patients explicitly assigned to them via `assignedDoctorId`
- Admins (SUPER_ADMIN, HOSPITAL_ADMIN) bypass ownership restrictions
- Other roles (nurses, pharmacists, receptionists) access patients based on RBAC permissions

**Affected Endpoints:**
- `GET /api/patients/:id`
- `PATCH /api/patients/:id`

**Bypass Conditions:**
- User has SUPER_ADMIN or HOSPITAL_ADMIN role
- User is assigned as the patient's doctor

#### Prescription Ownership Policy

**Applies to:** Doctors accessing prescription records

- Doctors can only access prescriptions they created (`doctorId` matches user ID)
- Pharmacists and nurses can access prescriptions based on RBAC permissions
- Admins have unrestricted access

**Affected Endpoints:**
- `GET /api/prescriptions/:id`
- `PATCH /api/prescriptions/:id`

**Bypass Conditions:**
- User has SUPER_ADMIN or HOSPITAL_ADMIN role
- User is the prescribing doctor
- User is a pharmacist or nurse with appropriate permissions

#### Vitals Ownership Policy

**Applies to:** Doctors accessing vital signs records

- Doctors can only access vitals for patients assigned to them
- Nurses can access vitals based on RBAC permissions
- Admins have unrestricted access

**Affected Endpoints:**
- `GET /api/vitals/:id`
- `PATCH /api/vitals/:id`

**Bypass Conditions:**
- User has SUPER_ADMIN or HOSPITAL_ADMIN role
- User is assigned as the patient's doctor
- User is a nurse with appropriate permissions

#### Department-Scoped Access

**Applies to:** Staff accessing resources within specific departments

- Staff can only access resources in their assigned department
- Users without department assignments are denied access
- Admins bypass department restrictions

**Implementation:** Ready to apply to department-specific operations

#### Self-Profile Access

**Applies to:** Users accessing profile information

- Users can only view/edit their own profile
- Users with `USER:READ` or `USER:UPDATE` permissions can access any profile
- Admins have unrestricted access

**Implementation:** Ready to apply to user profile endpoints

#### Shift-Based Access (Optional)

**Applies to:** Time-restricted access based on shift schedules

- MORNING shift: 6 AM - 2 PM
- EVENING shift: 2 PM - 10 PM
- NIGHT shift: 10 PM - 6 AM
- Users without shifts have 24/7 access
- Admins bypass shift restrictions

**Implementation:** Available but not currently enforced

---

## Permissions

| Permission | Description |
|------------|-------------|
| SECURITY:READ | View security events and key status |
| SECURITY:MANAGE | Rotate keys, configure security settings |
| MFA:MANAGE | Enable/disable MFA for other users |
