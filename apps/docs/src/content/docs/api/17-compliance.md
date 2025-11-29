---
title: GDPR Compliance API
description: API reference for data subject access requests, right to erasure, consent management, and data portability.
---

## Overview

The GDPR Compliance API provides endpoints for data subject rights under the General Data Protection Regulation (GDPR). This includes data export (Right of Access), data deletion (Right to Erasure), consent management, and data portability.

---

## GDPR Rights Implemented

| Right | Article | Implementation |
|-------|---------|----------------|
| Right of Access | Art. 15 | Data export endpoint |
| Right to Rectification | Art. 16 | User profile update endpoints |
| Right to Erasure | Art. 17 | Data deletion endpoint |
| Right to Portability | Art. 20 | Machine-readable export |
| Right to Withdraw Consent | Art. 7(3) | Consent management |

---

## Data Export (Right of Access)

### Request Data Export

**POST** `/api/compliance/data-export`

Request export of all personal data associated with the authenticated user.

#### Authentication

Required. Bearer token.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| format | string | No | `json` or `csv` (default: json) |
| includeAuditLog | boolean | No | Include access history (default: true) |

#### Response

**Status: 202 Accepted**

```json
{
  "success": true,
  "data": {
    "requestId": "dsr-uuid",
    "type": "export",
    "status": "pending",
    "format": "json",
    "createdAt": "2024-01-15T10:30:00Z",
    "estimatedCompletion": "2024-01-15T10:35:00Z"
  }
}
```

#### Processing Time

- Export requests are processed within 72 hours
- User is notified via email when export is ready
- Download link expires after 7 days

---

### Get Export Status

**GET** `/api/compliance/data-export/:requestId`

Check status of a data export request.

#### Authentication

Required. Bearer token (must be same user who requested).

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "requestId": "dsr-uuid",
    "type": "export",
    "status": "completed",
    "format": "json",
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:32:00Z",
    "downloadUrl": "https://...",
    "expiresAt": "2024-01-22T10:32:00Z"
  }
}
```

#### Status Values

| Status | Description |
|--------|-------------|
| pending | Request received, not yet processed |
| processing | Export in progress |
| completed | Export ready for download |
| expired | Download link expired |
| failed | Export failed (contact support) |

---

### Download Export

**GET** `/api/compliance/data-export/:requestId/download`

Download the exported data file.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

Returns the data file with appropriate Content-Type header.

#### Exported Data Includes

| Category | Data |
|----------|------|
| Profile | Name, email, phone, address |
| Account | Created date, last login, preferences |
| Activity | Login history, actions performed |
| Consent | Consent records with timestamps |
| Related | Any data linked to user |

---

## Data Deletion (Right to Erasure)

### Request Data Deletion

**POST** `/api/compliance/data-deletion`

Request deletion of all personal data (Right to be Forgotten).

#### Authentication

Required. Bearer token.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Reason for deletion request |
| confirmEmail | string | Yes | User's email for verification |

#### Response

**Status: 202 Accepted**

```json
{
  "success": true,
  "data": {
    "requestId": "dsr-uuid",
    "type": "deletion",
    "status": "pending_verification",
    "createdAt": "2024-01-15T10:30:00Z",
    "message": "Verification email sent. Please confirm within 48 hours."
  }
}
```

#### Deletion Process

1. User submits deletion request
2. Verification email sent to registered email
3. User clicks verification link within 48 hours
4. 30-day grace period before permanent deletion
5. User can cancel during grace period
6. After grace period, data is permanently deleted

---

### Verify Deletion Request

**POST** `/api/compliance/data-deletion/:requestId/verify`

Verify deletion request via token from email.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Verification token from email |

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "requestId": "dsr-uuid",
    "status": "verified",
    "scheduledDeletion": "2024-02-14T10:30:00Z",
    "message": "Deletion scheduled. You can cancel within 30 days."
  }
}
```

---

### Cancel Deletion Request

**POST** `/api/compliance/data-deletion/:requestId/cancel`

Cancel a pending deletion request during grace period.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "requestId": "dsr-uuid",
    "status": "cancelled",
    "message": "Deletion request cancelled. Your data is safe."
  }
}
```

---

### Get Deletion Status

**GET** `/api/compliance/data-deletion/:requestId`

Check status of a deletion request.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "requestId": "dsr-uuid",
    "type": "deletion",
    "status": "pending_deletion",
    "createdAt": "2024-01-15T10:30:00Z",
    "verifiedAt": "2024-01-15T11:00:00Z",
    "scheduledDeletion": "2024-02-14T10:30:00Z",
    "canCancel": true,
    "gracePeriodEnds": "2024-02-14T10:30:00Z"
  }
}
```

#### Deletion Status Values

| Status | Description |
|--------|-------------|
| pending_verification | Awaiting email verification |
| verification_expired | Verification not completed in time |
| verified | Verified, in grace period |
| pending_deletion | Grace period ended, deletion queued |
| completed | Data permanently deleted |
| cancelled | Request cancelled by user |

---

## Consent Management

### Get Consent Records

**GET** `/api/compliance/consent`

Get all consent records for the authenticated user.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": "consent-uuid",
      "purpose": "marketing_emails",
      "description": "Receive promotional emails and newsletters",
      "granted": true,
      "grantedAt": "2024-01-10T10:00:00Z",
      "version": "1.0",
      "source": "registration"
    },
    {
      "id": "consent-uuid-2",
      "purpose": "analytics",
      "description": "Allow usage analytics for service improvement",
      "granted": false,
      "withdrawnAt": "2024-01-12T15:00:00Z",
      "version": "1.0",
      "source": "settings"
    }
  ]
}
```

---

### Record Consent

**POST** `/api/compliance/consent`

Record a new consent or update existing consent.

#### Authentication

Required. Bearer token.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| purpose | string | Yes | Consent purpose identifier |
| granted | boolean | Yes | Consent granted or denied |

#### Consent Purposes

| Purpose | Description |
|---------|-------------|
| terms_of_service | Agreement to terms of service |
| privacy_policy | Acknowledgment of privacy policy |
| marketing_emails | Promotional email communications |
| sms_notifications | SMS notifications |
| analytics | Usage analytics |
| third_party_sharing | Data sharing with partners |

#### Response

**Status: 201 Created**

```json
{
  "success": true,
  "data": {
    "id": "consent-uuid",
    "purpose": "marketing_emails",
    "granted": true,
    "grantedAt": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

---

### Withdraw Consent

**PUT** `/api/compliance/consent/:id/withdraw`

Withdraw previously granted consent.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "id": "consent-uuid",
    "purpose": "marketing_emails",
    "granted": false,
    "withdrawnAt": "2024-01-15T10:30:00Z",
    "message": "Consent withdrawn. Related processing will stop within 24 hours."
  }
}
```

---

### Get Consent History

**GET** `/api/compliance/consent/:purpose/history`

Get history of consent changes for a specific purpose.

#### Authentication

Required. Bearer token.

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "purpose": "marketing_emails",
    "history": [
      {
        "action": "granted",
        "timestamp": "2024-01-10T10:00:00Z",
        "source": "registration",
        "ip": "192.168.1.100"
      },
      {
        "action": "withdrawn",
        "timestamp": "2024-01-12T15:00:00Z",
        "source": "settings",
        "ip": "192.168.1.100"
      },
      {
        "action": "granted",
        "timestamp": "2024-01-15T10:30:00Z",
        "source": "settings",
        "ip": "192.168.1.100"
      }
    ]
  }
}
```

---

## Admin Endpoints

### List Data Requests

**GET** `/api/compliance/requests`

List all data subject requests (admin view).

#### Authentication

Required. Bearer token with `COMPLIANCE:READ` permission.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | `export`, `deletion`, or `all` |
| status | string | No | Filter by status |
| startDate | string | No | Start date |
| endDate | string | No | End date |
| page | number | No | Page number |
| limit | number | No | Items per page |

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "requestId": "dsr-uuid",
      "type": "deletion",
      "userId": "user-uuid",
      "userEmail": "user@example.com",
      "status": "pending_deletion",
      "createdAt": "2024-01-15T10:30:00Z",
      "scheduledCompletion": "2024-02-14T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

### Process Data Request

**PUT** `/api/compliance/requests/:requestId/process`

Manually process or expedite a data request.

#### Authentication

Required. Bearer token with `COMPLIANCE:MANAGE` permission.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | Yes | `approve`, `reject`, `expedite` |
| notes | string | No | Admin notes |

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "requestId": "dsr-uuid",
    "status": "processing",
    "processedBy": "admin-uuid",
    "processedAt": "2024-01-15T11:00:00Z"
  }
}
```

---

## Data Retention

| Data Type | Retention Period | Legal Basis |
|-----------|-----------------|-------------|
| User Profile | Until deletion requested | Contract |
| Consent Records | 6 years after withdrawal | Legal requirement |
| Audit Logs | 6 years | Legal requirement (HIPAA) |
| Session Data | 30 days | Legitimate interest |
| Analytics | 2 years (anonymized) | Consent |

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing required fields |
| 401 | UNAUTHORIZED | Invalid token |
| 403 | REQUEST_NOT_YOURS | Attempting to access another user's request |
| 404 | REQUEST_NOT_FOUND | Data request not found |
| 409 | REQUEST_ALREADY_EXISTS | Pending request already exists |
| 410 | REQUEST_EXPIRED | Verification link expired |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |

---

## Permissions

| Permission | Description |
|------------|-------------|
| COMPLIANCE:READ | View all data subject requests (admin) |
| COMPLIANCE:MANAGE | Process data requests (admin) |

---

## Webhooks

For enterprise integrations, webhooks can be configured to notify external systems of compliance events:

| Event | Description |
|-------|-------------|
| dsr.export.requested | Data export requested |
| dsr.export.completed | Data export ready |
| dsr.deletion.requested | Deletion requested |
| dsr.deletion.verified | Deletion verified by user |
| dsr.deletion.completed | Data permanently deleted |
| consent.granted | Consent granted |
| consent.withdrawn | Consent withdrawn |
