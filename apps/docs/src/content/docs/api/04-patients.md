---
title: Patient Management API
description: API reference for patient registration, search, listing, and export operations.
---

## Overview

The Patient Management API handles patient lifecycle operations including registration, search, and data export. Supports both OPD (Outpatient) and IPD (Inpatient) patient types.

---

## Register Patient

**POST** `/api/patients`

Registers a new patient in the system.

### Authentication

Required. Bearer token with `PATIENT:CREATE` permission.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | Yes | Patient's first name |
| lastName | string | Yes | Patient's last name |
| dateOfBirth | string | Yes | Date of birth (ISO 8601) |
| gender | string | Yes | `MALE`, `FEMALE`, `OTHER` |
| bloodGroup | string | No | Blood group (A+, A-, B+, B-, AB+, AB-, O+, O-) |
| phone | string | Yes | Contact phone number |
| email | string | No | Email address |
| address | object | Yes | Address details |
| address.street | string | Yes | Street address |
| address.city | string | Yes | City |
| address.state | string | Yes | State/Province |
| address.postalCode | string | Yes | Postal/ZIP code |
| address.country | string | Yes | Country |
| emergencyContact | object | Yes | Emergency contact details |
| emergencyContact.name | string | Yes | Contact person name |
| emergencyContact.relationship | string | Yes | Relationship to patient |
| emergencyContact.phone | string | Yes | Contact phone number |
| patientType | string | Yes | `OPD` or `IPD` |
| department | string | No | Assigned department |
| assignedDoctor | string | No | Assigned doctor ID |
| photo | string | No | Base64 encoded photo (max 5MB, JPG/PNG) |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Patient ID |
| patientId | string | Unique patient identifier: `{tenantId}-P-{sequential}` |
| firstName | string | First name |
| lastName | string | Last name |
| dateOfBirth | string | Date of birth |
| gender | string | Gender |
| patientType | string | `OPD` or `IPD` |
| status | string | `ACTIVE` |
| createdAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid required fields |
| 400 | INVALID_PHOTO | Photo exceeds size limit or invalid format |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- Patient ID auto-generated: `{tenantId}-P-{sequential}`
- Photo upload limited to 5MB, JPG/PNG formats only
- Patient type determines care pathway (OPD vs IPD)
- Emergency contact is mandatory

---

## List Patients

**GET** `/api/patients`

Retrieves a paginated list of patients with optional filters.

### Authentication

Required. Bearer token with `PATIENT:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page (max 100) |
| patientType | string | - | Filter by `OPD` or `IPD` |
| department | string | - | Filter by department |
| assignedDoctor | string | - | Filter by doctor ID |
| status | string | - | Filter by patient status |
| startDate | string | - | Filter by registration date (from) |
| endDate | string | - | Filter by registration date (to) |
| search | string | - | Search by name, phone, or patient ID |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | `asc` or `desc` |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of patient objects |
| pagination.page | number | Current page |
| pagination.limit | number | Results per page |
| pagination.total | number | Total results |
| pagination.totalPages | number | Total pages |

### Patient Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Internal ID |
| patientId | string | Patient identifier |
| firstName | string | First name |
| lastName | string | Last name |
| dateOfBirth | string | Date of birth |
| gender | string | Gender |
| phone | string | Phone number |
| patientType | string | `OPD` or `IPD` |
| department | string | Department |
| status | string | Patient status |
| createdAt | string | Registration timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_DATE_RANGE | Invalid date range specified |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- Results limited to patient's tenant
- ABAC policies may restrict results based on user's department
- Default pagination: 20 records per page

---

## Search Patients

**GET** `/api/patients/search`

Fast search endpoint optimized for patient lookup.

### Authentication

Required. Bearer token with `PATIENT:READ` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| type | string | No | Search type: `id`, `name`, `phone`, `email` |
| limit | number | No | Max results (default 10) |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| results | array | Array of matching patients |
| count | number | Number of results |

### Search Types

| Type | Description |
|------|-------------|
| id | Exact match on patient ID |
| name | Partial match on first/last name |
| phone | Partial match on phone number |
| email | Exact match on email |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_QUERY | Search query too short (min 2 chars) |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Get Patient

**GET** `/api/patients/:id`

Retrieves complete patient details.

### Authentication

Required. Bearer token with `PATIENT:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Patient ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Internal ID |
| patientId | string | Patient identifier |
| firstName | string | First name |
| lastName | string | Last name |
| dateOfBirth | string | Date of birth |
| age | number | Calculated age |
| gender | string | Gender |
| bloodGroup | string | Blood group |
| phone | string | Phone number |
| email | string | Email address |
| address | object | Full address |
| emergencyContact | object | Emergency contact details |
| patientType | string | `OPD` or `IPD` |
| department | string | Department |
| assignedDoctor | object | Doctor details |
| photoUrl | string | Patient photo URL |
| status | string | Patient status |
| createdAt | string | Registration timestamp |
| updatedAt | string | Last update timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions or ABAC policy denied |
| 404 | NOT_FOUND | Patient not found |

### Business Rules

- ABAC policies control access based on department assignment
- Doctors can only view patients assigned to their department (if policy enabled)

---

## Update Patient

**PATCH** `/api/patients/:id`

Updates patient information.

### Authentication

Required. Bearer token with `PATIENT:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Patient ID |

### Request Body

All fields optional:

| Field | Type | Description |
|-------|------|-------------|
| phone | string | Phone number |
| email | string | Email address |
| address | object | Address details |
| emergencyContact | object | Emergency contact |
| department | string | Department |
| assignedDoctor | string | Doctor ID |
| photo | string | Base64 encoded photo |
| patientType | string | `OPD` or `IPD` |

### Response

**Status: 200 OK**

Returns updated patient object.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid field values |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Patient not found |

### Business Rules

- Patient ID cannot be changed
- Name and DOB changes require `HOSPITAL_ADMIN` permission
- Type change (OPD to IPD) triggers admission workflow

---

## Export Patients

**GET** `/api/patients/export`

Exports patient list to CSV or PDF format.

### Authentication

Required. Bearer token with `PATIENT:EXPORT` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | Yes | `csv` or `pdf` |
| patientType | string | No | Filter by type |
| department | string | No | Filter by department |
| startDate | string | No | Filter from date |
| endDate | string | No | Filter to date |
| fields | string | No | Comma-separated field list |

### Response

**Status: 200 OK**

Returns file download.

| Header | Value |
|--------|-------|
| Content-Type | `text/csv` or `application/pdf` |
| Content-Disposition | `attachment; filename="patients_{date}.{ext}"` |

### Default Export Fields

- Patient ID
- Name
- Date of Birth
- Gender
- Phone
- Patient Type
- Department
- Status
- Registration Date

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_FORMAT | Unsupported export format |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 413 | EXPORT_TOO_LARGE | Too many records to export |

### Business Rules

- Maximum 10,000 records per export
- Export respects same filters as list endpoint
- Export audit logged for compliance

---

## Patient Types

### OPD (Outpatient Department)

Patients who visit for consultation without admission.

| Workflow Step | Description |
|---------------|-------------|
| Registration | Patient registers at reception |
| Queue | Added to doctor's queue |
| Consultation | Doctor examines and diagnoses |
| Prescription | Doctor creates prescription |
| Pharmacy | Patient collects medicines |
| Follow-up | Scheduled if needed |

### IPD (Inpatient Department)

Patients admitted for treatment.

| Workflow Step | Description |
|---------------|-------------|
| Registration | Patient registers at reception |
| Admission | Room/bed assigned |
| Treatment | Ongoing care and monitoring |
| Vitals | Regular vital sign recording |
| Prescription | Doctor creates treatment plan |
| Discharge | Discharge summary generated |

---

## Patient Status

| Status | Description |
|--------|-------------|
| ACTIVE | Currently registered/admitted |
| DISCHARGED | IPD patient discharged |
| COMPLETED | OPD visit completed |
| INACTIVE | Record archived |
