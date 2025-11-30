---
title: User Management API
description: API reference for user registration, profile management, and password operations.
---

## Overview

The User Management API handles user lifecycle operations including creation, updates, and password management. Only hospital administrators can create and manage users within their tenant.

---

## Create User

**POST** `/api/users`

Creates a new user within the hospital tenant.

### Authentication

Required. Bearer token with `USER:CREATE` permission. `HOSPITAL_ADMIN` role required.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | Yes | First name |
| lastName | string | Yes | Last name |
| email | string | Yes | Email address |
| phone | string | Yes | Phone number |
| department | string | Yes | Department assignment |
| roles | array | Yes | Array of role IDs to assign |
| specialization | string | No | Medical specialization (for doctors) |
| shift | string | No | Work shift assignment |

### Response

**Status: 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | string | User ID |
| username | string | Auto-generated: `{firstName}.{lastName}@{hospitalDomain}` |
| email | string | Email address |
| firstName | string | First name |
| lastName | string | Last name |
| department | string | Department |
| roles | array | Assigned roles |
| status | string | `ACTIVE` |
| message | string | Welcome email sent notification |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid required fields |
| 400 | INVALID_ROLE | One or more role IDs are invalid |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 409 | EMAIL_EXISTS | Email already in use within tenant |

### Business Rules

- Username auto-generated: `{firstName}.{lastName}@{hospitalDomain}`
- System generates temporary password
- Welcome email sent with temporary credentials
- User must change password on first login
- Users can only be created within the admin's tenant

---

## List Users

**GET** `/api/users`

Retrieves a paginated list of users within the tenant.

### Authentication

Required. Bearer token with `USER:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page (max 100) |
| department | string | - | Filter by department |
| role | string | - | Filter by role ID |
| status | string | - | Filter by status |
| search | string | - | Search by name or email |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | `asc` or `desc` |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Array of user objects |
| pagination.page | number | Current page |
| pagination.limit | number | Results per page |
| pagination.total | number | Total results |
| pagination.totalPages | number | Total pages |

### User Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | User ID |
| username | string | Username |
| email | string | Email address |
| firstName | string | First name |
| lastName | string | Last name |
| department | string | Department |
| roles | array | Assigned roles |
| status | string | User status |
| createdAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Get User

**GET** `/api/users/:id`

Retrieves a specific user's details.

### Authentication

Required. Bearer token with `USER:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | User ID |
| username | string | Username |
| email | string | Email address |
| firstName | string | First name |
| lastName | string | Last name |
| phone | string | Phone number |
| department | string | Department |
| specialization | string | Medical specialization |
| shift | string | Work shift |
| roles | array | Assigned roles with permissions |
| status | string | User status |
| lastLogin | string | Last login timestamp |
| createdAt | string | ISO 8601 timestamp |
| updatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | User not found |

---

## Update User

**PATCH** `/api/users/:id`

Updates user information.

### Authentication

Required. Bearer token with `USER:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

### Request Body

All fields optional:

| Field | Type | Description |
|-------|------|-------------|
| firstName | string | First name |
| lastName | string | Last name |
| phone | string | Phone number |
| department | string | Department |
| roles | array | Role IDs (admin only) |
| specialization | string | Medical specialization |
| shift | string | Work shift |

### Response

**Status: 200 OK**

Returns updated user object.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid field values |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | User not found |

### Business Rules

- Users can update their own profile (limited fields)
- Only `HOSPITAL_ADMIN` can update roles
- Email and username cannot be changed
- Role changes take effect on next token refresh

---

## Deactivate User

**DELETE** `/api/users/:id`

Deactivates a user account (soft delete).

### Authentication

Required. Bearer token with `USER:DELETE` permission. `HOSPITAL_ADMIN` role required.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | User ID |
| status | string | `INACTIVE` |
| deactivatedAt | string | ISO 8601 timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | SELF_DEACTIVATION | Cannot deactivate own account |
| 404 | NOT_FOUND | User not found |

### Business Rules

- Soft delete: user data retained, access revoked
- All active sessions invalidated immediately
- User cannot deactivate their own account
- Deactivated users can be reactivated by admin

---

## Forgot Password

**POST** `/api/users/forgot-password`

Initiates password reset flow.

### Authentication

None required (public endpoint)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| tenant_id | string | Yes | Hospital tenant ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| message | string | Generic success message |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing required fields |

### Business Rules

- Always returns success (prevents email enumeration)
- Reset token valid for 1 hour
- Email sent with reset link
- Only one active reset token per user
- New request invalidates previous token

---

## Reset Password

**POST** `/api/users/reset-password`

Completes password reset with token.

### Authentication

None required (uses reset token)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Password reset token |
| newPassword | string | Yes | New password |
| confirmPassword | string | Yes | Password confirmation |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| message | string | Success confirmation |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_TOKEN | Token is invalid or malformed |
| 400 | TOKEN_EXPIRED | Reset token has expired |
| 400 | PASSWORD_MISMATCH | Passwords do not match |
| 400 | PASSWORD_POLICY | Password does not meet requirements |
| 400 | PASSWORD_REUSE | Cannot reuse recent passwords |

### Business Rules

- All active sessions invalidated after reset
- Cannot reuse any of last 3 passwords
- Password history maintained

---

## Change Password

**POST** `/api/users/change-password`

Changes the authenticated user's password.

### Authentication

Required. Bearer token.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| currentPassword | string | Yes | Current password |
| newPassword | string | Yes | New password |
| confirmPassword | string | Yes | Password confirmation |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| message | string | Success confirmation |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Passwords do not match or policy violation |
| 400 | PASSWORD_REUSE | Cannot reuse recent passwords |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 401 | INVALID_CREDENTIALS | Current password is incorrect |

### Business Rules

- User must be authenticated
- Must provide correct current password
- Cannot reuse any of last 3 passwords
- All active sessions invalidated after change
- Clears `PASSWORD_EXPIRED` status if set

---

## Force Password Change

**POST** `/api/users/:id/force-password-change`

Forces user to change password on next login.

### Authentication

Required. Bearer token with `USER:MANAGE` permission. `HOSPITAL_ADMIN` role required.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | User ID |
| status | string | `PASSWORD_EXPIRED` |
| message | string | Confirmation message |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | User not found |

### Business Rules

- User status set to `PASSWORD_EXPIRED`
- User redirected to password change screen on next login
- Current sessions remain active until token expires

---

## User Statuses

| Status | Description |
|--------|-------------|
| ACTIVE | Normal active account |
| INACTIVE | Deactivated account |
| LOCKED | Locked due to failed login attempts |
| PASSWORD_EXPIRED | Must change password on next login |

### Status Transitions

| From | To | Trigger |
|------|-----|---------|
| ACTIVE | LOCKED | 5 failed login attempts |
| ACTIVE | PASSWORD_EXPIRED | Admin force or policy expiry |
| ACTIVE | INACTIVE | Admin deactivation |
| LOCKED | ACTIVE | Admin unlock or timeout (30 min) |
| PASSWORD_EXPIRED | ACTIVE | Successful password change |
| INACTIVE | ACTIVE | Admin reactivation |

---

## Password Policy

| Rule | Requirement |
|------|-------------|
| Minimum length | 8 characters |
| Uppercase | At least 1 uppercase letter |
| Lowercase | At least 1 lowercase letter |
| Number | At least 1 digit |
| Special character | At least 1 special character |
| History | Cannot reuse last 3 passwords |
