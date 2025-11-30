---
title: Dispensing API
description: API reference for pharmacy dispensing operations and prescription fulfillment.
---

## Overview

The Dispensing API manages pharmacy operations including prescription processing, medicine dispensing, and fulfillment tracking. Pharmacists use this API to process prescriptions and manage dispensing workflows.

---

## Get Pending Prescriptions

**GET** `/api/dispensing/pending`

Retrieves prescriptions awaiting dispensing.

### Authentication

Required. Bearer token with `DISPENSING:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page |
| priority | string | - | Filter by priority |
| departmentId | string | - | Filter by department |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | asc | `asc` or `desc` |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of pending prescriptions |
| pagination | object | Pagination details |
| summary | object | Queue summary |

### Summary Object

| Field | Type | Description |
|-------|------|-------------|
| totalPending | number | Total pending prescriptions |
| urgent | number | Urgent priority count |
| averageWaitTime | number | Average wait in minutes |

### Prescription Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Prescription ID |
| prescriptionId | string | Display ID |
| patient | object | Patient name and ID |
| doctor | object | Doctor name |
| medicineCount | number | Number of medicines |
| priority | string | Priority level |
| createdAt | string | Prescription time |
| waitingTime | number | Minutes waiting |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Start Dispensing

**POST** `/api/dispensing/:prescriptionId/start`

Begins dispensing process for a prescription.

### Authentication

Required. Bearer token with `DISPENSING:CREATE` permission. `PHARMACIST` role required.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| prescriptionId | string | Prescription ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Dispensing record ID |
| prescriptionId | string | Prescription ID |
| status | string | `DISPENSING` |
| assignedTo | object | Pharmacist details |
| startedAt | string | Start timestamp |
| medicines | array | Medicines to dispense |

### Medicine Dispensing Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Medicine entry ID |
| name | string | Medicine name |
| dosage | string | Dosage |
| prescribedQuantity | number | Quantity prescribed |
| availableStock | number | Current inventory |
| status | string | `PENDING` |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | ALREADY_STARTED | Dispensing already in progress |
| 400 | PRESCRIPTION_CANCELLED | Prescription was cancelled |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Prescription not found |

### Business Rules

- Prescription status changes to `DISPENSING`
- Locks prescription to prevent concurrent processing
- Checks inventory availability for all medicines
- Assigns dispensing to current pharmacist

---

## Dispense Medicine

**POST** `/api/dispensing/:prescriptionId/dispense`

Records dispensing of medicines.

### Authentication

Required. Bearer token with `DISPENSING:CREATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| prescriptionId | string | Prescription ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| medicines | array | Yes | Array of dispensing details |

### Medicine Dispensing Detail

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| medicineId | string | Yes | Medicine entry ID |
| dispensedQuantity | number | Yes | Quantity dispensed |
| batchNumber | string | No | Batch/lot number |
| expiryDate | string | No | Expiry date |
| substituted | boolean | No | If generic substitute used |
| substituteNote | string | No | Substitution reason |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Dispensing record ID |
| prescriptionId | string | Prescription ID |
| medicines | array | Dispensed medicines status |
| totalDispensed | number | Count of items dispensed |
| totalPending | number | Count of items pending |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing required fields |
| 400 | INSUFFICIENT_STOCK | Not enough inventory |
| 400 | QUANTITY_EXCEEDS_PRESCRIBED | Cannot dispense more than prescribed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | NOT_ASSIGNED | Prescription assigned to different pharmacist |
| 404 | NOT_FOUND | Prescription or medicine not found |

### Business Rules

- Quantity cannot exceed prescribed amount
- Inventory automatically decremented
- Partial dispensing allowed
- Substitutions require documentation

---

## Complete Dispensing

**POST** `/api/dispensing/:prescriptionId/complete`

Marks dispensing as complete.

### Authentication

Required. Bearer token with `DISPENSING:CREATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| prescriptionId | string | Prescription ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| notes | string | No | Pharmacist notes |
| patientCounseled | boolean | No | Patient counseling done |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Dispensing record ID |
| prescriptionId | string | Prescription ID |
| status | string | `DISPENSED` |
| completedAt | string | Completion timestamp |
| completedBy | object | Pharmacist details |
| medicines | array | Final dispensing details |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INCOMPLETE_DISPENSING | Not all medicines dispensed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Prescription not found |

### Business Rules

- All medicines must be dispensed or marked unavailable
- Prescription status changes to `DISPENSED`
- Patient notified (if notifications enabled)
- Dispensing record finalized

---

## Mark Medicine Unavailable

**POST** `/api/dispensing/:prescriptionId/unavailable`

Marks medicine as unavailable/out of stock.

### Authentication

Required. Bearer token with `DISPENSING:CREATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| prescriptionId | string | Prescription ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| medicineId | string | Yes | Medicine entry ID |
| reason | string | Yes | Unavailability reason |
| alternativeSuggested | string | No | Alternative medicine suggested |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| medicineId | string | Medicine ID |
| status | string | `UNAVAILABLE` |
| reason | string | Reason provided |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing required fields |
| 400 | ALREADY_DISPENSED | Medicine already dispensed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Medicine not found |

### Business Rules

- Prescribing doctor notified
- Alternative suggestions documented
- Does not block completing the dispensing

---

## Return to Queue

**POST** `/api/dispensing/:prescriptionId/return`

Returns prescription to pending queue.

### Authentication

Required. Bearer token with `DISPENSING:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| prescriptionId | string | Prescription ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | Yes | Return reason |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| prescriptionId | string | Prescription ID |
| status | string | `PENDING` |
| returnedAt | string | Timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | PARTIALLY_DISPENSED | Cannot return after partial dispensing |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Prescription not found |

### Business Rules

- Only allowed before any medicine dispensed
- Releases lock on prescription
- Returns to pending queue

---

## Get Dispensing Record

**GET** `/api/dispensing/:prescriptionId`

Retrieves dispensing details for a prescription.

### Authentication

Required. Bearer token with `DISPENSING:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| prescriptionId | string | Prescription ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Dispensing record ID |
| prescription | object | Full prescription details |
| patient | object | Patient details |
| medicines | array | Detailed dispensing info |
| status | string | Current status |
| assignedTo | object | Assigned pharmacist |
| startedAt | string | Start timestamp |
| completedAt | string | Completion timestamp |
| notes | string | Pharmacist notes |

### Medicine Detail

| Field | Type | Description |
|-------|------|-------------|
| id | string | Medicine entry ID |
| name | string | Medicine name |
| prescribedQuantity | number | Quantity prescribed |
| dispensedQuantity | number | Quantity dispensed |
| batchNumber | string | Batch number |
| expiryDate | string | Expiry date |
| status | string | Item status |
| substituted | boolean | Was substituted |
| substituteNote | string | Substitution note |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Record not found |

---

## Get Dispensing History

**GET** `/api/dispensing/history`

Retrieves dispensing history with filters.

### Authentication

Required. Bearer token with `DISPENSING:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page |
| pharmacistId | string | - | Filter by pharmacist |
| patientId | string | - | Filter by patient |
| startDate | string | - | Filter from date |
| endDate | string | - | Filter to date |
| status | string | - | Filter by status |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of dispensing records |
| pagination | object | Pagination details |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Dispensing Status

| Status | Description |
|--------|-------------|
| PENDING | Awaiting pharmacist |
| DISPENSING | Being processed |
| DISPENSED | Completed |
| COLLECTED | Patient collected |
| CANCELLED | Cancelled |

### Status Transitions

| From | To | Trigger |
|------|-----|---------|
| PENDING | DISPENSING | Pharmacist starts |
| PENDING | CANCELLED | Prescription cancelled |
| DISPENSING | PENDING | Returned to queue |
| DISPENSING | DISPENSED | Completed |
| DISPENSED | COLLECTED | Patient pickup |
