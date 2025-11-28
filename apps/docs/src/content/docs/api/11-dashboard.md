---
title: Dashboard API
description: API reference for dashboard statistics, metrics, and role-specific overview data.
---

## Overview

The Dashboard API provides role-specific statistics and metrics for the hospital management system. Each role receives relevant data for their dashboard view.

---

## Get Dashboard

**GET** `/api/dashboard`

Retrieves role-specific dashboard data.

### Authentication

Required. Bearer token with `DASHBOARD:VIEW` permission.

### Response

Response varies by user role. See role-specific sections below.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Hospital Admin Dashboard

**GET** `/api/dashboard`

Returns when user has `HOSPITAL_ADMIN` role.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| overview | object | Hospital-wide statistics |
| patients | object | Patient statistics |
| appointments | object | Appointment statistics |
| staff | object | Staff statistics |
| departments | object | Department statistics |
| revenue | object | Revenue statistics (if enabled) |
| alerts | array | System alerts |

### Overview Object

| Field | Type | Description |
|-------|------|-------------|
| totalPatients | number | Total registered patients |
| activePatients | number | Currently active patients |
| opdToday | number | OPD patients today |
| ipdCurrent | number | Current IPD admissions |
| appointmentsToday | number | Today's appointments |
| prescriptionsToday | number | Prescriptions issued today |

### Patients Object

| Field | Type | Description |
|-------|------|-------------|
| newThisWeek | number | New registrations this week |
| newThisMonth | number | New registrations this month |
| byType | object | Count by OPD/IPD |
| byDepartment | array | Count by department |
| trend | array | Daily trend (7 days) |

### Appointments Object

| Field | Type | Description |
|-------|------|-------------|
| today | number | Today's total |
| completed | number | Completed today |
| pending | number | Pending today |
| cancelled | number | Cancelled today |
| noShow | number | No-shows today |
| byDepartment | array | Count by department |
| trend | array | Daily trend (7 days) |

### Staff Object

| Field | Type | Description |
|-------|------|-------------|
| totalActive | number | Total active staff |
| byRole | array | Count by role |
| onDutyToday | number | Staff on duty |

### Alerts Object

| Field | Type | Description |
|-------|------|-------------|
| type | string | Alert type |
| severity | string | `INFO`, `WARNING`, `CRITICAL` |
| message | string | Alert message |
| createdAt | string | Alert timestamp |

---

## Doctor Dashboard

**GET** `/api/dashboard`

Returns when user has `DOCTOR` role.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| today | object | Today's summary |
| appointments | object | Appointment data |
| patients | object | Patient data |
| prescriptions | object | Prescription data |
| queue | object | Current queue |

### Today Object

| Field | Type | Description |
|-------|------|-------------|
| totalAppointments | number | Total scheduled |
| completed | number | Completed consultations |
| remaining | number | Remaining consultations |
| currentPatient | object | Currently consulting |
| nextPatient | object | Next in queue |

### Appointments Object

| Field | Type | Description |
|-------|------|-------------|
| upcoming | array | Next 5 appointments |
| todaySchedule | array | Full day schedule |
| pendingFollowUps | number | Pending follow-ups |

### Patients Object

| Field | Type | Description |
|-------|------|-------------|
| totalAssigned | number | Total assigned patients |
| seenToday | number | Seen today |
| recentPatients | array | Last 5 patients |

### Prescriptions Object

| Field | Type | Description |
|-------|------|-------------|
| issuedToday | number | Issued today |
| pendingDispensing | number | Awaiting pharmacy |

### Queue Object

| Field | Type | Description |
|-------|------|-------------|
| current | array | Current queue list |
| waiting | number | Patients waiting |
| averageWait | number | Average wait (minutes) |

---

## Nurse Dashboard

**GET** `/api/dashboard`

Returns when user has `NURSE` role.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| ward | object | Ward summary |
| patients | object | Patient data |
| vitals | object | Vitals summary |
| tasks | object | Pending tasks |
| alerts | array | Patient alerts |

### Ward Object

| Field | Type | Description |
|-------|------|-------------|
| name | string | Assigned ward |
| totalBeds | number | Total beds |
| occupiedBeds | number | Occupied beds |
| availableBeds | number | Available beds |

### Patients Object

| Field | Type | Description |
|-------|------|-------------|
| assigned | number | Assigned patients |
| critical | number | Critical patients |
| needsAttention | array | Patients needing attention |

### Vitals Object

| Field | Type | Description |
|-------|------|-------------|
| pendingRecording | number | Vitals due |
| recordedToday | number | Recorded today |
| abnormal | array | Abnormal readings |

### Tasks Object

| Field | Type | Description |
|-------|------|-------------|
| medicationDue | array | Medications due |
| vitalsdue | array | Vitals recordings due |
| pending | number | Total pending tasks |

### Alerts Array

| Field | Type | Description |
|-------|------|-------------|
| patientId | string | Patient ID |
| patientName | string | Patient name |
| type | string | Alert type |
| message | string | Alert message |
| severity | string | Severity level |
| createdAt | string | Alert time |

---

## Pharmacist Dashboard

**GET** `/api/dashboard`

Returns when user has `PHARMACIST` role.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| queue | object | Dispensing queue |
| dispensing | object | Dispensing statistics |
| inventory | object | Inventory alerts |
| statistics | object | Performance stats |

### Queue Object

| Field | Type | Description |
|-------|------|-------------|
| pending | number | Prescriptions waiting |
| urgent | number | Urgent prescriptions |
| inProgress | number | Currently processing |
| averageWait | number | Average wait (minutes) |
| nextPrescription | object | Next in queue |

### Dispensing Object

| Field | Type | Description |
|-------|------|-------------|
| completedToday | number | Completed today |
| totalToday | number | Total for today |
| byHour | array | Hourly breakdown |

### Inventory Object

| Field | Type | Description |
|-------|------|-------------|
| lowStock | array | Low stock items |
| expiringSoon | array | Items expiring soon |
| outOfStock | number | Out of stock count |

### Statistics Object

| Field | Type | Description |
|-------|------|-------------|
| averageProcessingTime | number | Avg processing (minutes) |
| prescriptionsHandled | number | Total handled today |

---

## Receptionist Dashboard

**GET** `/api/dashboard`

Returns when user has `RECEPTIONIST` role.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| registrations | object | Registration stats |
| appointments | object | Appointment data |
| queue | object | OPD queue |
| checkIns | object | Check-in data |

### Registrations Object

| Field | Type | Description |
|-------|------|-------------|
| today | number | Registered today |
| pending | number | Pending verifications |
| recentRegistrations | array | Last 5 registrations |

### Appointments Object

| Field | Type | Description |
|-------|------|-------------|
| todayTotal | number | Total today |
| scheduled | number | Scheduled |
| checkedIn | number | Checked in |
| completed | number | Completed |
| cancelled | number | Cancelled |
| upcoming | array | Next appointments |

### Queue Object

| Field | Type | Description |
|-------|------|-------------|
| byDoctor | array | Queue per doctor |
| totalWaiting | number | Total waiting |
| averageWait | number | Average wait |

### CheckIns Object

| Field | Type | Description |
|-------|------|-------------|
| completedToday | number | Check-ins today |
| pending | array | Awaiting check-in |

---

## Get Dashboard Widget

**GET** `/api/dashboard/widget/:widgetId`

Retrieves specific widget data.

### Authentication

Required. Bearer token with `DASHBOARD:VIEW` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| widgetId | string | Widget identifier |

### Available Widgets

| Widget ID | Description |
|-----------|-------------|
| patient-trend | Patient registration trend |
| appointment-trend | Appointment trend |
| revenue-trend | Revenue trend |
| department-load | Department load |
| staff-attendance | Staff attendance |
| bed-occupancy | Bed occupancy rate |

### Response

**Status: 200 OK**

Returns widget-specific data structure.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_WIDGET | Unknown widget ID |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Widget not available for role |

---

## Get Quick Stats

**GET** `/api/dashboard/quick-stats`

Retrieves quick statistics for header display.

### Authentication

Required. Bearer token.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| notifications | number | Unread notifications |
| pendingTasks | number | Pending tasks count |
| alerts | number | Active alerts count |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |

---

## Refresh Dashboard

**POST** `/api/dashboard/refresh`

Forces refresh of cached dashboard data.

### Authentication

Required. Bearer token with `DASHBOARD:VIEW` permission.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| refreshed | boolean | Success status |
| timestamp | string | Refresh timestamp |

### Business Rules

- Rate limited to 1 refresh per minute
- Dashboard data cached for 30 seconds by default
