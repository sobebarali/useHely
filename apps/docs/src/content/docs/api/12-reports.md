---
title: Reports API
description: API reference for generating and managing hospital reports.
---

## Overview

The Reports API enables generation of various hospital reports including patient statistics, appointment analytics, prescription reports, and operational metrics. Reports can be exported in multiple formats.

---

## List Available Reports

**GET** `/api/reports`

Retrieves list of available report types.

### Authentication

Required. Bearer token with `REPORT:VIEW` permission.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| reports | array | Available report types |

### Report Type Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Report type ID |
| name | string | Report name |
| description | string | Report description |
| category | string | Report category |
| parameters | array | Required parameters |
| formats | array | Available export formats |
| requiredPermission | string | Permission needed |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Generate Report

**POST** `/api/reports/generate`

Generates a report with specified parameters.

### Authentication

Required. Bearer token with `REPORT:VIEW` permission.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportType | string | Yes | Report type ID |
| parameters | object | Yes | Report parameters |
| format | string | No | Output format (default: `json`) |

### Common Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Report period start |
| endDate | string | Report period end |
| departmentId | string | Filter by department |
| doctorId | string | Filter by doctor |
| groupBy | string | Grouping option |

### Response

**Status: 200 OK** (for JSON format)

| Field | Type | Description |
|-------|------|-------------|
| reportId | string | Generated report ID |
| reportType | string | Report type |
| generatedAt | string | Generation timestamp |
| parameters | object | Parameters used |
| data | object | Report data |
| summary | object | Summary statistics |

**Status: 200 OK** (for file formats)

Returns file download with appropriate Content-Type.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REPORT_TYPE | Unknown report type |
| 400 | INVALID_PARAMETERS | Missing or invalid parameters |
| 400 | DATE_RANGE_TOO_LARGE | Date range exceeds maximum |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- Maximum date range: 1 year
- Large reports may be queued for async generation
- Report generation audit logged

---

## Patient Reports

### Patient Registration Report

**Report Type:** `patient-registration`

Statistics on patient registrations.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Period start |
| endDate | string | Yes | Period end |
| patientType | string | No | OPD/IPD filter |
| departmentId | string | No | Department filter |
| groupBy | string | No | `day`, `week`, `month` |

#### Response Data

| Field | Type | Description |
|-------|------|-------------|
| totalRegistrations | number | Total count |
| byType | object | OPD/IPD breakdown |
| byDepartment | array | Department breakdown |
| byGender | object | Gender breakdown |
| byAgeGroup | array | Age group breakdown |
| trend | array | Time-based trend |

---

### Patient Demographics Report

**Report Type:** `patient-demographics`

Patient demographic analysis.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| asOfDate | string | No | Point-in-time (default: today) |
| patientType | string | No | OPD/IPD filter |

#### Response Data

| Field | Type | Description |
|-------|------|-------------|
| totalPatients | number | Total count |
| byGender | object | Gender distribution |
| byAgeGroup | array | Age distribution |
| byBloodGroup | object | Blood group distribution |
| byLocation | array | Geographic distribution |

---

## Appointment Reports

### Appointment Summary Report

**Report Type:** `appointment-summary`

Appointment statistics and trends.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Period start |
| endDate | string | Yes | Period end |
| departmentId | string | No | Department filter |
| doctorId | string | No | Doctor filter |
| groupBy | string | No | `day`, `week`, `month` |

#### Response Data

| Field | Type | Description |
|-------|------|-------------|
| totalAppointments | number | Total count |
| byStatus | object | Status breakdown |
| byType | object | Type breakdown |
| byDepartment | array | Department breakdown |
| byDoctor | array | Doctor breakdown |
| averageWaitTime | number | Average wait (minutes) |
| noShowRate | number | No-show percentage |
| trend | array | Time-based trend |

---

### Doctor Performance Report

**Report Type:** `doctor-performance`

Individual doctor performance metrics.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Period start |
| endDate | string | Yes | Period end |
| doctorId | string | No | Specific doctor |
| departmentId | string | No | Department filter |

#### Response Data

| Field | Type | Description |
|-------|------|-------------|
| doctors | array | Doctor performance list |

#### Doctor Performance Object

| Field | Type | Description |
|-------|------|-------------|
| doctorId | string | Doctor ID |
| doctorName | string | Doctor name |
| department | string | Department |
| totalAppointments | number | Total appointments |
| completedAppointments | number | Completed count |
| averageConsultationTime | number | Avg time (minutes) |
| patientsSeen | number | Unique patients |
| prescriptionsIssued | number | Prescriptions count |
| followUpRate | number | Follow-up percentage |

---

## Prescription Reports

### Prescription Summary Report

**Report Type:** `prescription-summary`

Prescription statistics.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Period start |
| endDate | string | Yes | Period end |
| doctorId | string | No | Doctor filter |
| departmentId | string | No | Department filter |

#### Response Data

| Field | Type | Description |
|-------|------|-------------|
| totalPrescriptions | number | Total count |
| byDoctor | array | Doctor breakdown |
| byDepartment | array | Department breakdown |
| byStatus | object | Status breakdown |
| averageMedicinesPerPrescription | number | Average medicines |
| topMedicines | array | Most prescribed medicines |
| trend | array | Time-based trend |

---

### Medicine Usage Report

**Report Type:** `medicine-usage`

Medicine dispensing statistics.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Period start |
| endDate | string | Yes | Period end |
| medicineId | string | No | Specific medicine |

#### Response Data

| Field | Type | Description |
|-------|------|-------------|
| totalDispensed | number | Total items dispensed |
| byMedicine | array | Medicine breakdown |
| byDepartment | array | Department breakdown |
| trend | array | Usage trend |

---

## Operational Reports

### Department Utilization Report

**Report Type:** `department-utilization`

Department workload and capacity.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Period start |
| endDate | string | Yes | Period end |
| departmentId | string | No | Department filter |

#### Response Data

| Field | Type | Description |
|-------|------|-------------|
| departments | array | Department metrics |

#### Department Metrics

| Field | Type | Description |
|-------|------|-------------|
| departmentId | string | Department ID |
| departmentName | string | Department name |
| totalPatients | number | Patients served |
| totalAppointments | number | Appointments |
| averageWaitTime | number | Average wait |
| staffUtilization | number | Staff utilization % |
| peakHours | array | Busiest hours |

---

### Staff Report

**Report Type:** `staff-summary`

Staff statistics and attendance.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Period start |
| endDate | string | Yes | Period end |
| departmentId | string | No | Department filter |
| role | string | No | Role filter |

#### Response Data

| Field | Type | Description |
|-------|------|-------------|
| totalStaff | number | Total count |
| byRole | array | Role breakdown |
| byDepartment | array | Department breakdown |
| byStatus | object | Status breakdown |
| newHires | number | New in period |
| departures | number | Left in period |

---

## Export Formats

| Format | Content-Type | Description |
|--------|--------------|-------------|
| json | application/json | JSON data |
| csv | text/csv | CSV spreadsheet |
| pdf | application/pdf | PDF document |
| xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | Excel spreadsheet |

---

## Get Report History

**GET** `/api/reports/history`

Retrieves previously generated reports.

### Authentication

Required. Bearer token with `REPORT:VIEW` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page |
| reportType | string | - | Filter by type |
| startDate | string | - | Generated after |
| endDate | string | - | Generated before |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Report history |
| pagination | object | Pagination details |

### History Object

| Field | Type | Description |
|-------|------|-------------|
| reportId | string | Report ID |
| reportType | string | Report type |
| parameters | object | Parameters used |
| format | string | Output format |
| generatedBy | object | User who generated |
| generatedAt | string | Generation timestamp |
| expiresAt | string | Expiration timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Download Report

**GET** `/api/reports/:reportId/download`

Downloads a previously generated report.

### Authentication

Required. Bearer token with `REPORT:VIEW` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| reportId | string | Report ID |

### Response

Returns file download.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Report not found |
| 410 | EXPIRED | Report has expired |

### Business Rules

- Generated reports stored for 7 days
- Large reports may require async generation
- Download tracked for audit

---

## Report Categories

| Category | Description |
|----------|-------------|
| PATIENT | Patient-related reports |
| APPOINTMENT | Appointment analytics |
| PRESCRIPTION | Prescription reports |
| OPERATIONAL | Operational metrics |
| FINANCIAL | Financial reports |
| COMPLIANCE | Compliance reports |
