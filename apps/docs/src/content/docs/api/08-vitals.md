---
title: Vitals API
description: API reference for recording and monitoring patient vital signs.
---

## Overview

The Vitals API enables nurses and medical staff to record, monitor, and track patient vital signs. Supports both OPD pre-consultation vitals and IPD continuous monitoring.

---

## Record Vitals

**POST** `/api/vitals`

Records a new vital signs entry for a patient.

### Authentication

Required. Bearer token with `VITALS:CREATE` permission.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| patientId | string | Yes | Patient ID |
| appointmentId | string | No | Associated appointment ID |
| admissionId | string | No | Associated admission ID (IPD) |
| temperature | object | No | Temperature reading |
| temperature.value | number | Yes | Temperature value |
| temperature.unit | string | Yes | `CELSIUS` or `FAHRENHEIT` |
| bloodPressure | object | No | Blood pressure reading |
| bloodPressure.systolic | number | Yes | Systolic pressure (mmHg) |
| bloodPressure.diastolic | number | Yes | Diastolic pressure (mmHg) |
| heartRate | number | No | Heart rate (bpm) |
| respiratoryRate | number | No | Respiratory rate (breaths/min) |
| oxygenSaturation | number | No | SpO2 percentage |
| weight | object | No | Weight measurement |
| weight.value | number | Yes | Weight value |
| weight.unit | string | Yes | `KG` or `LB` |
| height | object | No | Height measurement |
| height.value | number | Yes | Height value |
| height.unit | string | Yes | `CM` or `IN` |
| bloodGlucose | object | No | Blood glucose reading |
| bloodGlucose.value | number | Yes | Glucose level |
| bloodGlucose.unit | string | Yes | `MG_DL` or `MMOL_L` |
| bloodGlucose.timing | string | Yes | `FASTING`, `RANDOM`, `POSTPRANDIAL` |
| painLevel | number | No | Pain scale (0-10) |
| notes | string | No | Additional observations |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Vitals record ID |
| patientId | string | Patient ID |
| recordedBy | object | Staff who recorded |
| vitals | object | All recorded measurements |
| bmi | number | Calculated BMI (if height/weight provided) |
| alerts | array | Any abnormal value alerts |
| recordedAt | string | ISO 8601 timestamp |

### Alerts Object

| Field | Type | Description |
|-------|------|-------------|
| type | string | Alert type |
| parameter | string | Vital parameter name |
| value | number | Recorded value |
| normalRange | object | Expected range |
| severity | string | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid fields |
| 400 | INVALID_PATIENT | Patient not found |
| 400 | VALUE_OUT_OF_RANGE | Vital value outside valid range |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- At least one vital measurement required
- Values validated against physiological ranges
- Abnormal values trigger alerts
- BMI auto-calculated when height and weight provided
- Records linked to appointment or admission if provided

---

## Get Patient Vitals

**GET** `/api/vitals/patient/:patientId`

Retrieves vital signs history for a patient.

### Authentication

Required. Bearer token with `VITALS:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| patientId | string | Patient ID |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page |
| startDate | string | - | Filter from date |
| endDate | string | - | Filter to date |
| parameter | string | - | Filter by vital type |
| admissionId | string | - | Filter by admission |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of vitals records |
| pagination | object | Pagination details |
| latestVitals | object | Most recent readings |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | PATIENT_NOT_FOUND | Patient not found |

---

## Get Vitals Record

**GET** `/api/vitals/:id`

Retrieves a specific vitals record.

### Authentication

Required. Bearer token with `VITALS:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Vitals record ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Record ID |
| patient | object | Patient details |
| appointment | object | Appointment details (if linked) |
| admission | object | Admission details (if linked) |
| temperature | object | Temperature reading |
| bloodPressure | object | Blood pressure reading |
| heartRate | number | Heart rate |
| respiratoryRate | number | Respiratory rate |
| oxygenSaturation | number | SpO2 |
| weight | object | Weight |
| height | object | Height |
| bmi | number | BMI |
| bloodGlucose | object | Blood glucose |
| painLevel | number | Pain level |
| notes | string | Notes |
| alerts | array | Generated alerts |
| recordedBy | object | Recording staff |
| recordedAt | string | Timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Record not found |

---

## Update Vitals

**PATCH** `/api/vitals/:id`

Updates a vitals record (correction only).

### Authentication

Required. Bearer token with `VITALS:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Vitals record ID |

### Request Body

| Field | Type | Description |
|-------|------|-------------|
| notes | string | Updated notes |
| correctionReason | string | Reason for correction (required) |

### Response

**Status: 200 OK**

Returns updated vitals record.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | CORRECTION_REASON_REQUIRED | Must provide reason |
| 400 | RECORD_TOO_OLD | Cannot modify records older than 24 hours |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Record not found |

### Business Rules

- Only notes can be modified
- Vital values cannot be changed (create new record instead)
- Correction reason mandatory
- Records older than 24 hours locked
- All changes audit logged

---

## Get Latest Vitals

**GET** `/api/vitals/patient/:patientId/latest`

Retrieves most recent vitals for each parameter.

### Authentication

Required. Bearer token with `VITALS:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| patientId | string | Patient ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| patientId | string | Patient ID |
| temperature | object | Latest temperature with timestamp |
| bloodPressure | object | Latest BP with timestamp |
| heartRate | object | Latest HR with timestamp |
| respiratoryRate | object | Latest RR with timestamp |
| oxygenSaturation | object | Latest SpO2 with timestamp |
| weight | object | Latest weight with timestamp |
| height | object | Latest height with timestamp |
| bmi | number | Current BMI |
| bloodGlucose | object | Latest glucose with timestamp |
| lastUpdated | string | Most recent recording time |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | PATIENT_NOT_FOUND | Patient not found |
| 404 | NO_VITALS | No vitals recorded for patient |

---

## Get Vitals Trends

**GET** `/api/vitals/patient/:patientId/trends`

Retrieves vitals trends over time for charting.

### Authentication

Required. Bearer token with `VITALS:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| patientId | string | Patient ID |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| parameter | string | Yes | Vital parameter to trend |
| period | string | No | `24h`, `7d`, `30d`, `90d` (default: 7d) |

### Valid Parameters

| Parameter | Description |
|-----------|-------------|
| temperature | Temperature readings |
| bloodPressure | Systolic and diastolic |
| heartRate | Heart rate |
| respiratoryRate | Respiratory rate |
| oxygenSaturation | SpO2 |
| weight | Weight |
| bloodGlucose | Blood glucose |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| patientId | string | Patient ID |
| parameter | string | Requested parameter |
| period | string | Time period |
| dataPoints | array | Array of readings |
| statistics | object | Min, max, average |

### Data Point Object

| Field | Type | Description |
|-------|------|-------------|
| value | number | Measurement value |
| timestamp | string | Recording time |
| recordedBy | string | Staff name |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_PARAMETER | Unknown vital parameter |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | PATIENT_NOT_FOUND | Patient not found |

---

## Normal Ranges Reference

### Temperature

| Range | Status |
|-------|--------|
| < 35.0°C | Hypothermia |
| 35.0 - 37.5°C | Normal |
| 37.6 - 38.5°C | Low-grade fever |
| 38.6 - 39.5°C | Moderate fever |
| > 39.5°C | High fever |

### Blood Pressure (mmHg)

| Systolic | Diastolic | Status |
|----------|-----------|--------|
| < 90 | < 60 | Low |
| 90-120 | 60-80 | Normal |
| 121-139 | 81-89 | Elevated |
| 140-159 | 90-99 | High (Stage 1) |
| ≥ 160 | ≥ 100 | High (Stage 2) |

### Heart Rate (bpm)

| Range | Status |
|-------|--------|
| < 60 | Bradycardia |
| 60-100 | Normal |
| > 100 | Tachycardia |

### Oxygen Saturation

| Range | Status |
|-------|--------|
| ≥ 95% | Normal |
| 90-94% | Low |
| < 90% | Critical |

### Respiratory Rate (breaths/min)

| Range | Status |
|-------|--------|
| < 12 | Low |
| 12-20 | Normal |
| > 20 | Elevated |

### BMI

| Range | Status |
|-------|--------|
| < 18.5 | Underweight |
| 18.5-24.9 | Normal |
| 25-29.9 | Overweight |
| ≥ 30 | Obese |
