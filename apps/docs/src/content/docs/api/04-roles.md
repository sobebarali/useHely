---
title: Roles API
description: API reference for role management and RBAC configuration.
---

## Overview

The Roles API manages custom roles and permissions for Role-Based Access Control (RBAC). Hospital administrators can create custom roles to fine-tune access control beyond the pre-defined system roles.

---

## Pre-defined System Roles

| Role | Hierarchy Level | Description |
|------|-----------------|-------------|
| SUPER_ADMIN | 0 (highest) | Platform administrator with all permissions |
| HOSPITAL_ADMIN | 1 | Hospital administrator with tenant-scoped management |
| DOCTOR | 2 | Medical practitioner with patient and prescription access |
| NURSE | 2 | Nursing staff with vitals and patient care access |
| PHARMACIST | 2 | Pharmacy staff with dispensing and inventory access |
| RECEPTIONIST | 3 (lowest) | Front desk with patient registration and appointments |

---

## Permission Format

Permissions follow the `RESOURCE:ACTION` pattern.

### Resources

| Resource | Description |
|----------|-------------|
| PATIENT | Patient records |
| PRESCRIPTION | Prescription management |
| DIAGNOSIS | Medical diagnoses |
| VITALS | Patient vital signs |
| DISPENSING | Medication dispensing |
| APPOINTMENT | Appointment scheduling |
| USER | User management |
| ROLE | Role management |
| DEPARTMENT | Department management |
| INVENTORY | Inventory management |
| REPORT | Report generation |
| TENANT | Tenant/Hospital settings |
| ADMISSION | Patient admissions |
| DASHBOARD | Dashboard access |
| SETTINGS | System settings |
| QUEUE | Queue management |
| SECURITY | Security settings |

### Actions

| Action | Description |
|--------|-------------|
| CREATE | Create new resources |
| READ | View resources |
| UPDATE | Modify resources |
| DELETE | Remove resources |
| MANAGE | Full control (implies all actions) |
| VIEW | View-only access |
| EXPORT | Export data |

### Example Permissions

- `PATIENT:CREATE` - Create new patients
- `PRESCRIPTION:READ` - View prescriptions
- `USER:MANAGE` - Full user management (implies CREATE, READ, UPDATE, DELETE)

---

## Create Role

**POST** `/api/roles`

Creates a new custom role within the tenant.

### Authentication

Required. Bearer token with `ROLE:CREATE` permission.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Role name (1-50 characters, unique per tenant) |
| description | string | No | Role description (max 255 characters) |
| permissions | array | Yes | Array of permission strings |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Role ID |
| name | string | Role name |
| description | string | Role description |
| permissions | array | Assigned permissions |
| isSystem | boolean | `false` for custom roles |
| isActive | boolean | `true` |
| tenantId | string | Tenant ID |
| createdAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid fields |
| 400 | INVALID_PERMISSION | Invalid permission format |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | PERMISSION_DENIED | Cannot grant permissions you don't have |
| 409 | ROLE_EXISTS | Role name already exists |

### Business Rules

- Permission format must match: `/^[A-Z_]+:[A-Z_]+$/`
- Cannot grant permissions the user doesn't have
- Custom roles are tenant-scoped
- Role names must be unique within tenant

---

## List Roles

**GET** `/api/roles`

Retrieves a paginated list of roles within the tenant.

### Authentication

Required. Bearer token with `ROLE:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page (max 100) |
| search | string | - | Search by role name |
| isSystem | boolean | - | Filter by system/custom roles |
| isActive | boolean | - | Filter by active status |
| sortBy | string | createdAt | Sort field: `name`, `createdAt` |
| sortOrder | string | desc | `asc` or `desc` |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of role objects |
| pagination.page | number | Current page |
| pagination.limit | number | Results per page |
| pagination.total | number | Total results |
| pagination.totalPages | number | Total pages |

### Role Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Role ID |
| name | string | Role name |
| description | string | Role description |
| permissions | array | Assigned permissions |
| isSystem | boolean | System role flag |
| isActive | boolean | Active status |
| usersCount | number | Number of users with this role |
| createdAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Get Role

**GET** `/api/roles/:id`

Retrieves a specific role's details.

### Authentication

Required. Bearer token with `ROLE:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Role ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Role ID |
| name | string | Role name |
| description | string | Role description |
| permissions | array | Assigned permissions |
| isSystem | boolean | System role flag |
| isActive | boolean | Active status |
| usersCount | number | Number of users with this role |
| tenantId | string | Tenant ID |
| createdAt | string | ISO 8601 timestamp |
| updatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | ROLE_NOT_FOUND | Role not found |

---

## Update Role

**PATCH** `/api/roles/:id`

Updates a custom role's information.

### Authentication

Required. Bearer token with `ROLE:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Role ID |

### Request Body

All fields optional:

| Field | Type | Description |
|-------|------|-------------|
| name | string | Role name (1-50 characters) |
| description | string | Role description (max 255 characters) |
| permissions | array | New permission set (replaces existing) |

### Response

**Status: 200 OK**

Returns updated role object.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid field values |
| 400 | INVALID_PERMISSION | Invalid permission format |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | SYSTEM_ROLE | Cannot modify system roles |
| 403 | PERMISSION_DENIED | Cannot grant permissions you don't have |
| 404 | ROLE_NOT_FOUND | Role not found |
| 409 | ROLE_EXISTS | Role name already in use |

### Business Rules

- System roles (`isSystem: true`) cannot be modified
- Cannot grant permissions the user doesn't have
- Permission changes take effect on next token refresh for affected users
- Role name must remain unique within tenant

---

## Delete Role

**DELETE** `/api/roles/:id`

Deactivates a custom role (soft delete).

### Authentication

Required. Bearer token with `ROLE:DELETE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Role ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Role ID |
| name | string | Role name |
| isActive | boolean | `false` |
| deactivatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | ROLE_IN_USE | Role is assigned to active users |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | SYSTEM_ROLE | Cannot delete system roles |
| 404 | ROLE_NOT_FOUND | Role not found |

### Business Rules

- Soft delete: role data retained, marked as inactive
- System roles (`isSystem: true`) cannot be deleted
- Cannot delete roles assigned to active users
- Reassign users to different roles before deletion
- Deactivated roles can be reactivated by admin

---

## Role Hierarchy

Roles have a hierarchy level that determines authority:

| Level | Roles | Can Manage |
|-------|-------|------------|
| 0 | SUPER_ADMIN | All roles |
| 1 | HOSPITAL_ADMIN | Levels 2-3 |
| 2 | DOCTOR, NURSE, PHARMACIST | Level 3 |
| 3 | RECEPTIONIST | None |

### Hierarchy Rules

- Users can only create/modify roles at or below their level
- Cannot grant permissions that exceed their own authority
- SUPER_ADMIN can manage all roles including HOSPITAL_ADMIN
- Custom roles inherit the creator's hierarchy level

---

## Permission Inheritance

The `MANAGE` action implies all other actions on a resource:

| If User Has | Can Perform |
|-------------|-------------|
| `PATIENT:MANAGE` | `PATIENT:CREATE`, `PATIENT:READ`, `PATIENT:UPDATE`, `PATIENT:DELETE` |
| `ROLE:MANAGE` | `ROLE:CREATE`, `ROLE:READ`, `ROLE:UPDATE`, `ROLE:DELETE` |

---

## Default Role Permissions

### SUPER_ADMIN

All `MANAGE` permissions for all resources.

### HOSPITAL_ADMIN

- All `MANAGE` permissions except `TENANT:MANAGE`
- `ROLE:CREATE`, `ROLE:READ`, `ROLE:UPDATE`, `ROLE:DELETE`
- `TENANT:READ`, `TENANT:UPDATE`
- `SECURITY:READ`

### DOCTOR

- `PATIENT:CREATE`, `PATIENT:READ`, `PATIENT:UPDATE`
- `PRESCRIPTION:CREATE`, `PRESCRIPTION:READ`, `PRESCRIPTION:UPDATE`
- `DIAGNOSIS:CREATE`, `DIAGNOSIS:READ`
- `VITALS:READ`
- `APPOINTMENT:READ`, `APPOINTMENT:UPDATE`
- `ADMISSION:CREATE`, `ADMISSION:READ`, `ADMISSION:UPDATE`
- `DASHBOARD:VIEW`

### NURSE

- `PATIENT:READ`, `PATIENT:UPDATE`
- `VITALS:CREATE`, `VITALS:READ`, `VITALS:UPDATE`
- `PRESCRIPTION:READ`
- `APPOINTMENT:READ`
- `ADMISSION:READ`, `ADMISSION:UPDATE`
- `DASHBOARD:VIEW`

### PHARMACIST

- `PRESCRIPTION:READ`
- `DISPENSING:CREATE`, `DISPENSING:READ`, `DISPENSING:UPDATE`
- `INVENTORY:READ`, `INVENTORY:UPDATE`
- `PATIENT:READ`
- `DASHBOARD:VIEW`

### RECEPTIONIST

- `PATIENT:CREATE`, `PATIENT:READ`
- `APPOINTMENT:CREATE`, `APPOINTMENT:READ`, `APPOINTMENT:UPDATE`, `APPOINTMENT:DELETE`
- `ADMISSION:CREATE`, `ADMISSION:READ`
- `DASHBOARD:VIEW`
- `QUEUE:MANAGE`
