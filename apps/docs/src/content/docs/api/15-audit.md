---
title: Audit Log API
description: API reference for immutable audit trails, PHI access logging, and HIPAA compliance reporting.
---

## Overview

The Audit Log API provides comprehensive, immutable audit trails for all user actions. This is essential for HIPAA compliance, security monitoring, and forensic analysis. All PHI access is logged with full context.

---

## HIPAA Audit Requirements

| Requirement | Implementation |
|-------------|----------------|
| Unique User Identification | User ID in every log entry |
| Automatic Logoff | Session timeout tracking |
| Audit Controls | Immutable, append-only logs |
| Integrity | Cryptographic hash chain |
| Access Authorization | Permission-based log access |
| PHI Access Tracking | All patient data access logged |

---

## Audit Events

### Event Categories

| Category | Description |
|----------|-------------|
| AUTH | Authentication events (login, logout, token refresh) |
| PHI | Protected Health Information access |
| ADMIN | Administrative actions |
| SECURITY | Security-related events |
| DATA | Data modifications |

### Event Types

| Event Type | Category | Description |
|------------|----------|-------------|
| AUTH_LOGIN | AUTH | User login |
| AUTH_LOGOUT | AUTH | User logout |
| AUTH_FAILED | AUTH | Failed login attempt |
| AUTH_TOKEN_REFRESH | AUTH | Token refreshed |
| AUTH_PASSWORD_CHANGE | AUTH | Password changed |
| PHI_VIEW | PHI | Patient record viewed |
| PHI_CREATE | PHI | Patient record created |
| PHI_UPDATE | PHI | Patient record modified |
| PHI_DELETE | PHI | Patient record deleted |
| PHI_EXPORT | PHI | Patient data exported |
| PHI_PRINT | PHI | Patient data printed |
| PRESCRIPTION_VIEW | PHI | Prescription viewed |
| PRESCRIPTION_CREATE | PHI | Prescription created |
| VITALS_VIEW | PHI | Vitals record viewed |
| VITALS_CREATE | PHI | Vitals recorded |
| ADMIN_USER_CREATE | ADMIN | User created |
| ADMIN_USER_UPDATE | ADMIN | User modified |
| ADMIN_USER_DEACTIVATE | ADMIN | User deactivated |
| ADMIN_ROLE_CHANGE | ADMIN | Role/permission changed |
| ADMIN_CONFIG_CHANGE | ADMIN | System configuration changed |
| SECURITY_MFA_ENABLE | SECURITY | MFA enabled |
| SECURITY_MFA_DISABLE | SECURITY | MFA disabled |
| SECURITY_KEY_ROTATE | SECURITY | Encryption key rotated |

---

## List Audit Logs

**GET** `/api/audit/logs`

Query audit logs with filtering and pagination.

### Authentication

Required. Bearer token with `AUDIT:READ` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | No | Event category filter |
| eventType | string | No | Specific event type |
| userId | string | No | Filter by user who performed action |
| resourceType | string | No | Resource type (patient, prescription, etc.) |
| resourceId | string | No | Specific resource ID |
| startDate | string | No | Start date (ISO 8601) |
| endDate | string | No | End date (ISO 8601) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": "audit-uuid",
      "eventType": "PHI_VIEW",
      "category": "PHI",
      "userId": "user-uuid",
      "userName": "Dr. Smith",
      "tenantId": "hospital-uuid",
      "resourceType": "patient",
      "resourceId": "patient-uuid",
      "action": "READ",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "sessionId": "session-uuid",
      "details": {
        "fieldsAccessed": ["firstName", "lastName", "diagnosis"]
      },
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25
  }
}
```

### Audit Log Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique audit log ID |
| eventType | string | Type of event |
| category | string | Event category |
| userId | string | User who performed the action |
| userName | string | User's display name |
| tenantId | string | Tenant ID |
| resourceType | string | Type of resource accessed |
| resourceId | string | ID of resource accessed |
| action | string | CRUD action (CREATE, READ, UPDATE, DELETE) |
| ip | string | Client IP address |
| userAgent | string | Client user agent |
| sessionId | string | Session ID |
| details | object | Event-specific details |
| before | object | State before change (for updates) |
| after | object | State after change (for updates) |
| timestamp | string | Event timestamp (ISO 8601) |
| hash | string | Integrity hash |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Invalid token |
| 403 | PERMISSION_DENIED | Missing AUDIT:READ permission |

---

## Get Audit Log Entry

**GET** `/api/audit/logs/:id`

Get a specific audit log entry with full details.

### Authentication

Required. Bearer token with `AUDIT:READ` permission.

### Response

**Status: 200 OK**

Returns complete audit log object including before/after states for modifications.

---

## Get User Audit Trail

**GET** `/api/audit/users/:userId/trail`

Get complete audit trail for a specific user.

### Authentication

Required. Bearer token with `AUDIT:READ` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date (ISO 8601) |
| endDate | string | No | End date (ISO 8601) |
| page | number | No | Page number |
| limit | number | No | Items per page |

### Response

**Status: 200 OK**

Returns paginated list of all actions performed by the user.

---

## Get Resource Audit Trail

**GET** `/api/audit/resources/:resourceType/:resourceId/trail`

Get complete audit trail for a specific resource (e.g., patient record).

### Authentication

Required. Bearer token with `AUDIT:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| resourceType | string | Resource type (patient, prescription, vitals) |
| resourceId | string | Resource ID |

### Response

**Status: 200 OK**

Returns all access and modification events for the resource.

---

## HIPAA Compliance Report

**GET** `/api/audit/reports/hipaa`

Generate HIPAA compliance report for a date range.

### Authentication

Required. Bearer token with `AUDIT:REPORT` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Report start date (ISO 8601) |
| endDate | string | Yes | Report end date (ISO 8601) |
| format | string | No | `json` or `pdf` (default: json) |

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "reportId": "report-uuid",
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "summary": {
      "totalEvents": 15420,
      "phiAccessEvents": 8230,
      "uniqueUsers": 45,
      "uniquePatients": 1250,
      "failedAccessAttempts": 23,
      "securityEvents": 5
    },
    "phiAccessByUser": [
      {
        "userId": "user-uuid",
        "userName": "Dr. Smith",
        "role": "DOCTOR",
        "accessCount": 520,
        "uniquePatients": 180
      }
    ],
    "phiAccessByRole": {
      "DOCTOR": 4500,
      "NURSE": 2800,
      "RECEPTIONIST": 930
    },
    "securityIncidents": [
      {
        "type": "AUTH_FAILED",
        "count": 18,
        "uniqueUsers": 3
      }
    ],
    "generatedAt": "2024-02-01T10:00:00Z"
  }
}
```

---

## PHI Access Report

**GET** `/api/audit/reports/phi-access`

Generate detailed PHI access report.

### Authentication

Required. Bearer token with `AUDIT:REPORT` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Report start date |
| endDate | string | Yes | Report end date |
| patientId | string | No | Filter by specific patient |
| userId | string | No | Filter by specific user |

### Response

**Status: 200 OK**

Detailed breakdown of who accessed what patient data and when.

---

## Export Audit Logs

**POST** `/api/audit/export`

Export audit logs for archival or external analysis.

### Authentication

Required. Bearer token with `AUDIT:EXPORT` permission.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| startDate | string | Yes | Export start date |
| endDate | string | Yes | Export end date |
| format | string | No | `json`, `csv`, or `parquet` (default: json) |
| categories | array | No | Filter by categories |

### Response

**Status: 202 Accepted**

```json
{
  "success": true,
  "data": {
    "exportId": "export-uuid",
    "status": "processing",
    "estimatedRecords": 50000,
    "downloadUrl": null
  }
}
```

### Get Export Status

**GET** `/api/audit/export/:exportId`

Check export job status and get download URL when ready.

---

## Log Retention

| Data Type | Retention Period | Storage |
|-----------|-----------------|---------|
| PHI Access Logs | 6 years | Append-only |
| Auth Events | 6 years | Append-only |
| Security Events | 6 years | Append-only |
| Admin Actions | 6 years | Append-only |

### Retention Policy

- Logs are immutable once written
- 6-year retention as per HIPAA requirements
- Automatic archival to cold storage after 1 year
- Cryptographic hash chain ensures integrity

---

## Integrity Verification

Each audit log entry includes a cryptographic hash that chains to the previous entry, ensuring tamper detection.

```
Entry N Hash = SHA-256(Entry N Data + Entry N-1 Hash)
```

### Verify Integrity

**POST** `/api/audit/verify`

Verify integrity of audit log chain for a date range.

### Authentication

Required. Bearer token with `AUDIT:MANAGE` permission.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| startDate | string | Yes | Verification start date |
| endDate | string | Yes | Verification end date |

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "verified": true,
    "entriesChecked": 15420,
    "chainIntact": true,
    "verifiedAt": "2024-02-01T10:00:00Z"
  }
}
```

---

## Permissions

| Permission | Description |
|------------|-------------|
| AUDIT:READ | View audit logs |
| AUDIT:REPORT | Generate compliance reports |
| AUDIT:EXPORT | Export audit logs |
| AUDIT:MANAGE | Verify integrity, manage retention |
