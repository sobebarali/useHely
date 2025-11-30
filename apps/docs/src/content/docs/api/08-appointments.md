---
title: Appointments API
description: API reference for appointment scheduling, calendar management, and queue operations.
---

## Overview

The Appointments API manages patient appointment scheduling, doctor availability, and OPD queue operations. Receptionists handle scheduling while doctors manage their appointment calendar.

---

## Create Appointment

**POST** `/api/appointments`

Schedules a new appointment for a patient.

### Authentication

Required. Bearer token with `APPOINTMENT:CREATE` permission.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| patientId | string | Yes | Patient ID |
| doctorId | string | Yes | Doctor ID |
| departmentId | string | Yes | Department ID |
| date | string | Yes | Appointment date (ISO 8601) |
| timeSlot | string | Yes | Time slot ID or time string |
| type | string | Yes | `CONSULTATION`, `FOLLOW_UP`, `PROCEDURE` |
| reason | string | No | Reason for visit |
| notes | string | No | Additional notes |
| priority | string | No | `NORMAL`, `URGENT`, `EMERGENCY` |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Appointment ID |
| appointmentNumber | string | Display number: `{tenantId}-APT-{sequential}` |
| patient | object | Patient details |
| doctor | object | Doctor details |
| department | object | Department details |
| date | string | Appointment date |
| timeSlot | object | Time slot details |
| type | string | Appointment type |
| status | string | `SCHEDULED` |
| queueNumber | number | Queue position (if same day) |
| createdAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid required fields |
| 400 | INVALID_PATIENT | Patient not found |
| 400 | INVALID_DOCTOR | Doctor not found |
| 400 | SLOT_UNAVAILABLE | Time slot already booked |
| 400 | DOCTOR_UNAVAILABLE | Doctor not available on this date |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 409 | DUPLICATE_APPOINTMENT | Patient already has appointment with same doctor on date |

### Business Rules

- Cannot book past dates
- Time slot must be within doctor's availability
- Same patient cannot have overlapping appointments
- Emergency appointments bypass slot restrictions
- Queue number assigned for same-day appointments

---

## List Appointments

**GET** `/api/appointments`

Retrieves appointments with filters.

### Authentication

Required. Bearer token with `APPOINTMENT:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page |
| patientId | string | - | Filter by patient |
| doctorId | string | - | Filter by doctor |
| departmentId | string | - | Filter by department |
| date | string | - | Filter by specific date |
| startDate | string | - | Filter from date |
| endDate | string | - | Filter to date |
| status | string | - | Filter by status |
| type | string | - | Filter by type |
| sortBy | string | date | Sort field |
| sortOrder | string | asc | `asc` or `desc` |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of appointment objects |
| pagination | object | Pagination details |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- Doctors see only their appointments by default
- Receptionists see all appointments in their department
- Results scoped to user's tenant

---

## Get Appointment

**GET** `/api/appointments/:id`

Retrieves appointment details.

### Authentication

Required. Bearer token with `APPOINTMENT:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Appointment ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Appointment ID |
| appointmentNumber | string | Display number |
| patient | object | Full patient details |
| doctor | object | Full doctor details |
| department | object | Department details |
| date | string | Appointment date |
| timeSlot | object | Time slot with start/end |
| type | string | Appointment type |
| reason | string | Visit reason |
| notes | string | Notes |
| priority | string | Priority level |
| status | string | Current status |
| queueNumber | number | Queue position |
| checkedInAt | string | Check-in timestamp |
| completedAt | string | Completion timestamp |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Appointment not found |

---

## Update Appointment

**PATCH** `/api/appointments/:id`

Updates appointment details.

### Authentication

Required. Bearer token with `APPOINTMENT:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Appointment ID |

### Request Body

| Field | Type | Description |
|-------|------|-------------|
| doctorId | string | New doctor ID |
| date | string | New date |
| timeSlot | string | New time slot |
| type | string | Appointment type |
| reason | string | Visit reason |
| notes | string | Notes |
| priority | string | Priority level |

### Response

**Status: 200 OK**

Returns updated appointment object.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid field values |
| 400 | SLOT_UNAVAILABLE | New slot not available |
| 400 | CANNOT_RESCHEDULE | Appointment already completed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Appointment not found |

### Business Rules

- Cannot modify completed or cancelled appointments
- Rescheduling notifies patient (if notifications enabled)
- Doctor change resets queue position

---

## Cancel Appointment

**DELETE** `/api/appointments/:id`

Cancels an appointment.

### Authentication

Required. Bearer token with `APPOINTMENT:DELETE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Appointment ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Cancellation reason |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Appointment ID |
| status | string | `CANCELLED` |
| cancelledAt | string | Cancellation timestamp |
| cancelledBy | object | User who cancelled |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | ALREADY_COMPLETED | Cannot cancel completed appointment |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Appointment not found |

---

## Check In Patient

**POST** `/api/appointments/:id/check-in`

Marks patient as arrived for appointment.

### Authentication

Required. Bearer token with `APPOINTMENT:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Appointment ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Appointment ID |
| status | string | `CHECKED_IN` |
| queueNumber | number | Current queue position |
| checkedInAt | string | Check-in timestamp |
| estimatedWait | number | Estimated wait in minutes |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_DATE | Cannot check in for future appointment |
| 400 | ALREADY_CHECKED_IN | Patient already checked in |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Appointment not found |

---

## Complete Appointment

**POST** `/api/appointments/:id/complete`

Marks appointment as completed.

### Authentication

Required. Bearer token with `APPOINTMENT:UPDATE` permission. `DOCTOR` role required.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Appointment ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| notes | string | No | Consultation notes |
| followUpRequired | boolean | No | Follow-up needed |
| followUpDate | string | No | Suggested follow-up date |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Appointment ID |
| status | string | `COMPLETED` |
| completedAt | string | Completion timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | NOT_CHECKED_IN | Patient not checked in |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Only assigned doctor can complete |
| 404 | NOT_FOUND | Appointment not found |

---

## Get Doctor Availability

**GET** `/api/appointments/availability/:doctorId`

Retrieves doctor's available time slots.

### Authentication

Required. Bearer token with `APPOINTMENT:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| doctorId | string | Doctor ID |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | Yes | Date to check (ISO 8601) |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| doctorId | string | Doctor ID |
| date | string | Requested date |
| slots | array | Available time slots |

### Slot Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Slot ID |
| startTime | string | Start time (HH:mm) |
| endTime | string | End time (HH:mm) |
| available | boolean | Slot availability |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_DATE | Invalid or past date |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 404 | DOCTOR_NOT_FOUND | Doctor not found |

---

## Get Queue

**GET** `/api/appointments/queue`

Retrieves current OPD queue.

### Authentication

Required. Bearer token with `QUEUE:READ` permission.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| doctorId | string | Filter by doctor |
| departmentId | string | Filter by department |
| date | string | Date (defaults to today) |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| queue | array | Ordered list of checked-in patients |
| currentNumber | number | Currently being served |
| totalWaiting | number | Total patients waiting |

### Queue Item

| Field | Type | Description |
|-------|------|-------------|
| queueNumber | number | Queue position |
| appointment | object | Appointment details |
| patient | object | Patient basic info |
| checkedInAt | string | Check-in time |
| estimatedTime | string | Estimated consultation time |
| status | string | `WAITING`, `IN_PROGRESS`, `COMPLETED` |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Appointment Status

| Status | Description |
|--------|-------------|
| SCHEDULED | Appointment booked |
| CONFIRMED | Patient confirmed attendance |
| CHECKED_IN | Patient arrived |
| IN_PROGRESS | Consultation started |
| COMPLETED | Consultation finished |
| CANCELLED | Appointment cancelled |
| NO_SHOW | Patient did not arrive |

### Status Transitions

| From | To | Trigger |
|------|-----|---------|
| SCHEDULED | CONFIRMED | Patient confirms |
| SCHEDULED | CANCELLED | Cancel request |
| SCHEDULED | CHECKED_IN | Patient arrives |
| CONFIRMED | CHECKED_IN | Patient arrives |
| CONFIRMED | CANCELLED | Cancel request |
| CHECKED_IN | IN_PROGRESS | Doctor starts |
| CHECKED_IN | NO_SHOW | End of day cleanup |
| IN_PROGRESS | COMPLETED | Doctor completes |

---

## Appointment Types

| Type | Description |
|------|-------------|
| CONSULTATION | General consultation |
| FOLLOW_UP | Follow-up visit |
| PROCEDURE | Medical procedure |
| EMERGENCY | Emergency visit |
| ROUTINE_CHECK | Routine checkup |
