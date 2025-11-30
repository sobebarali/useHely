---
title: Prescription Management API
description: API reference for prescription creation, medicine management, and prescription templates.
---

## Overview

The Prescription Management API enables doctors to create and manage prescriptions for patients. Supports multiple medicines per prescription and template functionality for common prescriptions.

---

## Create Prescription

**POST** `/api/prescriptions`

Creates a new prescription for a patient.

### Authentication

Required. Bearer token with `PRESCRIPTION:CREATE` permission. `DOCTOR` role required.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| patientId | string | Yes | Patient ID |
| diagnosis | string | Yes | Diagnosis description |
| notes | string | No | Additional notes |
| medicines | array | Yes | Array of medicine objects |
| followUpDate | string | No | Follow-up date (ISO 8601) |
| templateId | string | No | Base prescription on template |

### Medicine Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Medicine name |
| dosage | string | Yes | Dosage (e.g., "500mg") |
| frequency | string | Yes | Frequency (e.g., "twice daily") |
| duration | string | Yes | Duration (e.g., "7 days") |
| instructions | string | No | Special instructions |
| route | string | No | Administration route (oral, injection, etc.) |
| quantity | number | No | Total quantity to dispense |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Prescription ID |
| prescriptionId | string | Unique identifier: `{tenantId}-RX-{sequential}` |
| patientId | string | Patient ID |
| patient | object | Patient basic info |
| doctorId | string | Doctor ID |
| doctor | object | Doctor basic info |
| diagnosis | string | Diagnosis |
| medicines | array | Prescribed medicines |
| status | string | `PENDING` |
| createdAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid required fields |
| 400 | INVALID_PATIENT | Patient ID not found |
| 400 | EMPTY_MEDICINES | At least one medicine required |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | TEMPLATE_NOT_FOUND | Template ID not found |

### Business Rules

- Prescription ID auto-generated: `{tenantId}-RX-{sequential}`
- At least one medicine required
- Doctor automatically assigned from token
- Initial status is `PENDING`
- If template provided, medicines merged with template defaults

---

## List Prescriptions

**GET** `/api/prescriptions`

Retrieves a paginated list of prescriptions.

### Authentication

Required. Bearer token with `PRESCRIPTION:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page (max 100) |
| patientId | string | - | Filter by patient |
| doctorId | string | - | Filter by doctor |
| status | string | - | Filter by status |
| startDate | string | - | Filter by date (from) |
| endDate | string | - | Filter by date (to) |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | `asc` or `desc` |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of prescription objects |
| pagination.page | number | Current page |
| pagination.limit | number | Results per page |
| pagination.total | number | Total results |
| pagination.totalPages | number | Total pages |

### Prescription Summary Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Internal ID |
| prescriptionId | string | Prescription identifier |
| patient | object | Patient name and ID |
| doctor | object | Doctor name and ID |
| diagnosis | string | Diagnosis |
| medicineCount | number | Number of medicines |
| status | string | Prescription status |
| createdAt | string | Creation timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- Doctors see all prescriptions by default
- Pharmacists see only prescriptions with `PENDING` or `DISPENSING` status
- Nurses see prescriptions for patients in their department

---

## Get Prescription

**GET** `/api/prescriptions/:id`

Retrieves complete prescription details.

### Authentication

Required. Bearer token with `PRESCRIPTION:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Prescription ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Internal ID |
| prescriptionId | string | Prescription identifier |
| patient | object | Full patient details |
| doctor | object | Full doctor details |
| diagnosis | string | Diagnosis |
| notes | string | Additional notes |
| medicines | array | Full medicine details |
| status | string | Prescription status |
| followUpDate | string | Follow-up date |
| dispensedBy | object | Pharmacist details (if dispensed) |
| dispensedAt | string | Dispensing timestamp |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Full Medicine Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Medicine entry ID |
| name | string | Medicine name |
| dosage | string | Dosage |
| frequency | string | Frequency |
| duration | string | Duration |
| instructions | string | Special instructions |
| route | string | Administration route |
| quantity | number | Quantity |
| dispensed | boolean | Dispensing status |
| dispensedQuantity | number | Actual quantity dispensed |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions or ownership policy denied |
| 404 | NOT_FOUND | Prescription not found |

### Ownership Policy

**ABAC Enforcement:** Doctors can only access prescriptions they created.

- **Allowed:** Prescription's `doctorId` matches authenticated doctor's ID
- **Bypass:** SUPER_ADMIN and HOSPITAL_ADMIN roles
- **Other Roles:** Pharmacists and nurses access based on RBAC permissions

---

## Update Prescription

**PATCH** `/api/prescriptions/:id`

Updates an existing prescription.

### Authentication

Required. Bearer token with `PRESCRIPTION:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Prescription ID |

### Request Body

| Field | Type | Description |
|-------|------|-------------|
| diagnosis | string | Updated diagnosis |
| notes | string | Updated notes |
| medicines | array | Updated medicines list |
| followUpDate | string | Updated follow-up date |

### Response

**Status: 200 OK**

Returns updated prescription object.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid field values |
| 400 | PRESCRIPTION_DISPENSED | Cannot modify dispensed prescription |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions or ownership policy denied |
| 404 | NOT_FOUND | Prescription not found |

### Ownership Policy

Same as GET endpoint - doctors can only update prescriptions they created.

### Business Rules

- Only prescribing doctor can modify (enforced by ownership policy)
- Cannot modify after status is `DISPENSED` or `COMPLETED`
- Medicine changes logged for audit trail

---

## List Templates

**GET** `/api/prescriptions/templates`

Retrieves available prescription templates.

### Authentication

Required. Bearer token with `PRESCRIPTION:READ` permission.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category |
| search | string | Search by name or condition |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of template objects |
| count | number | Total templates |

### Template Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Template ID |
| name | string | Template name |
| category | string | Category (e.g., "General", "Cardiology") |
| condition | string | Associated condition |
| medicines | array | Default medicines |
| createdBy | object | Creator details |
| isSystem | boolean | System-provided template |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Create Template

**POST** `/api/prescriptions/templates`

Creates a new prescription template.

### Authentication

Required. Bearer token with `PRESCRIPTION:CREATE` permission. `DOCTOR` or `HOSPITAL_ADMIN` role required.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Template name |
| category | string | No | Template category |
| condition | string | No | Associated condition |
| medicines | array | Yes | Default medicines |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Template ID |
| name | string | Template name |
| medicines | array | Default medicines |
| createdBy | object | Creator details |
| createdAt | string | Creation timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing required fields |
| 400 | DUPLICATE_NAME | Template name already exists |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- Templates are tenant-specific
- Doctors can create personal templates
- Hospital admin can create shared templates

---

## Get Template

**GET** `/api/prescriptions/templates/:id`

Retrieves a specific prescription template.

### Authentication

Required. Bearer token with `PRESCRIPTION:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Template ID |

### Response

**Status: 200 OK**

Returns full template object with medicines.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Template not found |

---

## Prescription Status

| Status | Description |
|--------|-------------|
| PENDING | Created, awaiting pharmacy |
| DISPENSING | Pharmacy processing |
| DISPENSED | Medicines dispensed |
| COMPLETED | Patient collected |
| CANCELLED | Prescription cancelled |

### Status Transitions

| From | To | Trigger |
|------|-----|---------|
| PENDING | DISPENSING | Pharmacist starts processing |
| PENDING | CANCELLED | Doctor cancels |
| DISPENSING | DISPENSED | Pharmacist completes |
| DISPENSING | PENDING | Pharmacist returns to queue |
| DISPENSED | COMPLETED | Patient collects |

---

## Frequency Reference

Common frequency values:

| Value | Meaning |
|-------|---------|
| once daily | Once per day |
| twice daily | Two times per day |
| three times daily | Three times per day |
| four times daily | Four times per day |
| every 4 hours | Every 4 hours |
| every 6 hours | Every 6 hours |
| every 8 hours | Every 8 hours |
| before meals | Before each meal |
| after meals | After each meal |
| at bedtime | Before sleeping |
| as needed | When required |

---

## Route Reference

Common administration routes:

| Value | Description |
|-------|-------------|
| oral | By mouth |
| sublingual | Under tongue |
| topical | Applied to skin |
| inhalation | Inhaled |
| injection | Intramuscular/subcutaneous |
| intravenous | IV administration |
| rectal | Rectal administration |
| ophthalmic | Eye drops |
| otic | Ear drops |
| nasal | Nasal spray |
