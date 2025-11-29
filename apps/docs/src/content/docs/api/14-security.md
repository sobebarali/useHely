---
title: Security & Encryption API
description: API reference for field-level encryption, MFA, key management, and security event monitoring.
---

## Overview

The Security API provides field-level encryption for PHI/PII data, multi-factor authentication (MFA), key management integration, and security event monitoring. These features support SOC 2-aligned security practices.

---

## Field-Level Encryption

### Encrypted Fields

The following sensitive fields are encrypted at rest using AES-256-GCM:

| Model | Encrypted Fields |
|-------|------------------|
| Patient | firstName, lastName, dateOfBirth, phone, email, address, emergencyContact |
| Prescription | diagnosis, notes |
| Vitals | All health metrics |
| Staff | personalPhone, personalEmail |

### Encryption Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Mongoose   │  │  Encryption │  │  Key Management │ │
│  │  Middleware │──│   Service   │──│     Client      │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└────────────────────────────┬────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌─────▼─────┐       ┌─────▼─────┐
    │ MongoDB │        │  AWS KMS  │       │ HashiCorp │
    │ (CSFLE) │        │           │       │   Vault   │
    └─────────┘        └───────────┘       └───────────┘
```

### Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| ENCRYPTION_ALGORITHM | Encryption algorithm | AES-256-GCM |
| KEY_ROTATION_DAYS | Key rotation schedule | 90 |
| KMS_PROVIDER | Key management provider | aws-kms |

---

## Multi-Factor Authentication (MFA)

### Enable MFA

**POST** `/api/security/mfa/enable`

Enable TOTP-based MFA for the authenticated user.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| secret | string | TOTP secret (base32 encoded) |
| qrCode | string | QR code data URL for authenticator apps |
| backupCodes | array | One-time backup codes (10) |

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | MFA_ALREADY_ENABLED | MFA is already enabled |
| 401 | UNAUTHORIZED | Invalid token |

---

### Verify MFA

**POST** `/api/security/mfa/verify`

Verify TOTP code during login or to confirm MFA setup.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | 6-digit TOTP code |
| type | string | No | `totp` or `backup` (default: totp) |

#### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| verified | boolean | `true` if code is valid |
| mfaEnabled | boolean | MFA status after verification |

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_CODE | Invalid or expired TOTP code |
| 400 | BACKUP_CODE_USED | Backup code already used |
| 401 | UNAUTHORIZED | Invalid token |

---

### Disable MFA

**POST** `/api/security/mfa/disable`

Disable MFA for the authenticated user. Requires current TOTP code.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | Current 6-digit TOTP code |

#### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| mfaEnabled | boolean | `false` |

---

## Key Management

### Rotate Encryption Keys

**POST** `/api/security/keys/rotate`

Rotate encryption keys. Re-encrypts all data with new key. Admin only.

#### Authentication

Required. Bearer token with `SECURITY:MANAGE` permission.

#### Response

**Status: 202 Accepted**

| Field | Type | Description |
|-------|------|-------------|
| jobId | string | Background job ID |
| status | string | `in_progress` |
| estimatedDuration | number | Estimated seconds to complete |

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
| keyAge | number | Days since last rotation |
| nextRotation | string | Scheduled next rotation (ISO 8601) |
| rotationHistory | array | Last 10 key rotations |

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

## Permissions

| Permission | Description |
|------------|-------------|
| SECURITY:READ | View security events and key status |
| SECURITY:MANAGE | Rotate keys, configure security settings |
| MFA:MANAGE | Enable/disable MFA for other users |
