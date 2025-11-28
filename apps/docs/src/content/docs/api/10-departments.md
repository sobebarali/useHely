---
title: Departments API
description: API reference for hospital department management and configuration.
---

## Overview

The Departments API manages hospital departments, their configurations, and staff assignments. Hospital administrators use this API to organize the hospital structure and assign staff to departments.

---

## Create Department

**POST** `/api/departments`

Creates a new department in the hospital.

### Authentication

Required. Bearer token with `DEPARTMENT:CREATE` permission. `HOSPITAL_ADMIN` role required.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Department name |
| code | string | Yes | Short code (unique) |
| description | string | No | Department description |
| type | string | Yes | Department type |
| headId | string | No | Department head (user ID) |
| parentId | string | No | Parent department ID |
| location | string | No | Physical location/floor |
| contactPhone | string | No | Department phone |
| contactEmail | string | No | Department email |
| operatingHours | object | No | Operating hours |

### Operating Hours Object

| Field | Type | Description |
|-------|------|-------------|
| monday | object | Start and end times |
| tuesday | object | Start and end times |
| wednesday | object | Start and end times |
| thursday | object | Start and end times |
| friday | object | Start and end times |
| saturday | object | Start and end times |
| sunday | object | Start and end times |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Department ID |
| name | string | Department name |
| code | string | Department code |
| type | string | Department type |
| status | string | `ACTIVE` |
| createdAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid fields |
| 400 | INVALID_HEAD | Head user ID not found |
| 400 | INVALID_PARENT | Parent department not found |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 409 | CODE_EXISTS | Department code already exists |
| 409 | NAME_EXISTS | Department name already exists |

### Business Rules

- Department code must be unique within tenant
- Department name must be unique within tenant
- Head must be a user with appropriate role
- Child departments inherit parent's type

---

## List Departments

**GET** `/api/departments`

Retrieves all departments in the hospital.

### Authentication

Required. Bearer token with `DEPARTMENT:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Results per page |
| type | string | - | Filter by type |
| status | string | - | Filter by status |
| parentId | string | - | Filter by parent |
| search | string | - | Search by name or code |
| includeStaffCount | boolean | false | Include staff counts |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of department objects |
| pagination | object | Pagination details |

### Department Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Department ID |
| name | string | Department name |
| code | string | Department code |
| type | string | Department type |
| head | object | Department head info |
| location | string | Location |
| status | string | Status |
| staffCount | number | Staff count (if requested) |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Get Department

**GET** `/api/departments/:id`

Retrieves department details.

### Authentication

Required. Bearer token with `DEPARTMENT:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Department ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Department ID |
| name | string | Department name |
| code | string | Department code |
| description | string | Description |
| type | string | Department type |
| head | object | Full head details |
| parent | object | Parent department |
| children | array | Child departments |
| location | string | Location |
| contactPhone | string | Phone |
| contactEmail | string | Email |
| operatingHours | object | Operating hours |
| status | string | Status |
| staffCount | number | Total staff |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Department not found |

---

## Update Department

**PATCH** `/api/departments/:id`

Updates department information.

### Authentication

Required. Bearer token with `DEPARTMENT:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Department ID |

### Request Body

All fields optional:

| Field | Type | Description |
|-------|------|-------------|
| name | string | Department name |
| description | string | Description |
| headId | string | New department head |
| location | string | Location |
| contactPhone | string | Phone |
| contactEmail | string | Email |
| operatingHours | object | Operating hours |

### Response

**Status: 200 OK**

Returns updated department object.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid field values |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Department not found |
| 409 | NAME_EXISTS | Name already in use |

### Business Rules

- Code cannot be changed after creation
- Type cannot be changed after creation
- Head change notifies previous and new head

---

## Delete Department

**DELETE** `/api/departments/:id`

Deactivates a department.

### Authentication

Required. Bearer token with `DEPARTMENT:DELETE` permission. `HOSPITAL_ADMIN` role required.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Department ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Department ID |
| status | string | `INACTIVE` |
| deactivatedAt | string | Timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | HAS_ACTIVE_STAFF | Cannot delete with assigned staff |
| 400 | HAS_ACTIVE_PATIENTS | Cannot delete with active patients |
| 400 | HAS_CHILDREN | Cannot delete with child departments |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Department not found |

### Business Rules

- Soft delete (deactivation)
- Must reassign staff before deletion
- Must reassign patients before deletion
- Child departments must be deleted first

---

## Get Department Staff

**GET** `/api/departments/:id/staff`

Retrieves staff assigned to a department.

### Authentication

Required. Bearer token with `DEPARTMENT:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Department ID |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page |
| role | string | - | Filter by role |
| status | string | ACTIVE | Filter by status |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of staff members |
| pagination | object | Pagination details |

### Staff Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | User ID |
| name | string | Full name |
| email | string | Email |
| role | string | Primary role |
| specialization | string | Specialization |
| status | string | User status |
| assignedAt | string | Assignment date |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Department not found |

---

## Assign Staff

**POST** `/api/departments/:id/staff`

Assigns staff to a department.

### Authentication

Required. Bearer token with `DEPARTMENT:MANAGE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Department ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User ID to assign |
| isPrimary | boolean | No | Primary department (default: false) |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| userId | string | User ID |
| departmentId | string | Department ID |
| isPrimary | boolean | Is primary department |
| assignedAt | string | Assignment timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | ALREADY_ASSIGNED | User already in department |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | USER_NOT_FOUND | User not found |
| 404 | DEPARTMENT_NOT_FOUND | Department not found |

### Business Rules

- User can belong to multiple departments
- Only one primary department per user
- Setting new primary removes old primary

---

## Remove Staff

**DELETE** `/api/departments/:id/staff/:userId`

Removes staff from a department.

### Authentication

Required. Bearer token with `DEPARTMENT:MANAGE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Department ID |
| userId | string | User ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| message | string | Confirmation message |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | NOT_ASSIGNED | User not in department |
| 400 | IS_HEAD | Cannot remove department head |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Department or user not found |

### Business Rules

- Department head cannot be removed (reassign first)
- User must have at least one department

---

## Get Department Tree

**GET** `/api/departments/tree`

Retrieves hierarchical department structure.

### Authentication

Required. Bearer token with `DEPARTMENT:READ` permission.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| tree | array | Hierarchical department structure |

### Tree Node

| Field | Type | Description |
|-------|------|-------------|
| id | string | Department ID |
| name | string | Department name |
| code | string | Department code |
| type | string | Department type |
| children | array | Child departments |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Department Types

| Type | Description |
|------|-------------|
| CLINICAL | Patient care departments |
| ADMINISTRATIVE | Admin departments |
| SUPPORT | Support services |
| DIAGNOSTIC | Lab and imaging |
| PHARMACY | Pharmacy services |
| EMERGENCY | Emergency services |

### Common Clinical Departments

| Name | Code |
|------|------|
| General Medicine | MED |
| Surgery | SUR |
| Pediatrics | PED |
| Obstetrics & Gynecology | OBG |
| Orthopedics | ORT |
| Cardiology | CAR |
| Neurology | NEU |
| Oncology | ONC |
| Dermatology | DER |
| ENT | ENT |
| Ophthalmology | OPH |
| Psychiatry | PSY |

---

## Department Status

| Status | Description |
|--------|-------------|
| ACTIVE | Operational |
| INACTIVE | Deactivated |
| SUSPENDED | Temporarily suspended |
