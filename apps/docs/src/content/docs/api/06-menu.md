---
title: Menu & UI API
description: API reference for role-based menu structure and dynamic UI configuration.
---

## Overview

The Menu & UI API provides dynamic menu structures based on user roles and permissions. The frontend renders menus according to the authenticated user's access rights, ensuring consistent permission enforcement across the application.

---

## Get Menu

**GET** `/api/menu`

Retrieves the role-based menu structure for the authenticated user.

### Authentication

Required. Bearer token.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| menu | array | Array of menu items |
| permissions | array | User's permission list |

### Menu Item Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Menu item ID |
| label | string | Display label |
| icon | string | Icon identifier |
| path | string | Route path |
| permission | string | Required permission |
| children | array | Nested menu items |
| order | number | Sort order |
| visible | boolean | Visibility flag |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |

### Business Rules

- Menu items filtered based on user's roles and permissions
- Hidden items excluded from response
- Children inherit parent visibility rules
- Order determines display sequence

---

## Menu Structure by Role

### HOSPITAL_ADMIN Menu

| Module | Items | Permission |
|--------|-------|------------|
| Dashboard | Overview | DASHBOARD:VIEW |
| Users | All Users, Add User | USER:READ, USER:CREATE |
| Patients | All Patients, Register | PATIENT:READ, PATIENT:CREATE |
| Doctors | All Doctors | DOCTOR:READ |
| Departments | Manage Departments | DEPARTMENT:MANAGE |
| Reports | All Reports | REPORT:VIEW |
| Settings | Hospital Settings | SETTINGS:MANAGE |

### DOCTOR Menu

| Module | Items | Permission |
|--------|-------|------------|
| Dashboard | Overview | DASHBOARD:VIEW |
| Patients | My Patients, OPD Queue | PATIENT:READ |
| Prescriptions | Create, History | PRESCRIPTION:CREATE, PRESCRIPTION:READ |
| Appointments | My Schedule | APPOINTMENT:READ |

### NURSE Menu

| Module | Items | Permission |
|--------|-------|------------|
| Dashboard | Overview | DASHBOARD:VIEW |
| Patients | Ward Patients | PATIENT:READ |
| Vitals | Record Vitals | VITALS:CREATE |
| Prescriptions | View Orders | PRESCRIPTION:READ |

### PHARMACIST Menu

| Module | Items | Permission |
|--------|-------|------------|
| Dashboard | Overview | DASHBOARD:VIEW |
| Prescriptions | Pending, Dispensed | PRESCRIPTION:READ |
| Dispensing | Process | DISPENSING:CREATE |
| Inventory | Stock View | INVENTORY:READ |

### RECEPTIONIST Menu

| Module | Items | Permission |
|--------|-------|------------|
| Dashboard | Overview | DASHBOARD:VIEW |
| Patients | Register, Search | PATIENT:CREATE, PATIENT:READ |
| Appointments | Schedule, Calendar | APPOINTMENT:CREATE, APPOINTMENT:READ |
| Queue | OPD Queue | QUEUE:MANAGE |

---

## Menu Item Schema

### Top-Level Module

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| label | string | Display text |
| icon | string | Icon name from icon set |
| permission | string | Required permission to view |
| children | array | Sub-menu items |
| order | number | Display order (1-100) |

### Child Item

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| label | string | Display text |
| path | string | Route path |
| permission | string | Required permission |
| order | number | Display order |

---

## Permission Format

Permissions follow the pattern: `RESOURCE:ACTION`

### Resources

| Resource | Description |
|----------|-------------|
| DASHBOARD | Dashboard views |
| PATIENT | Patient records |
| PRESCRIPTION | Prescriptions |
| APPOINTMENT | Appointments |
| USER | User management |
| DEPARTMENT | Department settings |
| VITALS | Patient vitals |
| DISPENSING | Pharmacy dispensing |
| INVENTORY | Pharmacy inventory |
| REPORT | Reports |
| SETTINGS | System settings |
| QUEUE | Queue management |

### Actions

| Action | Description |
|--------|-------------|
| VIEW | Read-only access |
| READ | View records |
| CREATE | Create new records |
| UPDATE | Modify records |
| DELETE | Remove records |
| MANAGE | Full control |
| EXPORT | Export data |

---

## Frontend Integration

### Permission Validation

The frontend must implement permission checks:

1. **Route Guards**: Check permission before route navigation
2. **Component Guards**: Conditionally render based on permissions
3. **Action Guards**: Disable/hide buttons based on permissions

### Rendering Rules

| Scenario | Behavior |
|----------|----------|
| No permission for module | Hide entire module |
| No permission for child | Hide specific child item |
| Partial permission | Show accessible items only |
| Empty children | Hide parent module |

### Client-Side Caching

| Data | Cache Duration |
|------|----------------|
| Menu structure | Until logout or token refresh |
| Permissions | Until logout or token refresh |

---

## Backend Validation

While the frontend hides unauthorized menu items, the backend enforces actual access control:

### API-Level Validation

Every API endpoint validates:

1. Token validity
2. Role membership
3. Permission presence
4. ABAC policy (if applicable)

### Error Handling

Unauthorized access attempts return:

| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | POLICY_DENIED | Access denied by policy |

---

## Icon Reference

Standard icon names used in menu:

| Icon | Usage |
|------|-------|
| dashboard | Dashboard |
| people | Patients, Users |
| person | Individual user |
| medical_services | Doctors, Medical |
| local_pharmacy | Pharmacy |
| medication | Prescriptions |
| schedule | Appointments |
| vital_signs | Vitals |
| assignment | Reports |
| settings | Settings |
| business | Departments |
| queue | Queue management |

---

## Hierarchical Permission Inheritance

Higher-level roles inherit lower-level permissions:

```
SUPER_ADMIN
    └── HOSPITAL_ADMIN
            ├── DOCTOR
            ├── NURSE
            ├── PHARMACIST
            └── RECEPTIONIST
```

### Inheritance Rules

- SUPER_ADMIN: All permissions across all tenants
- HOSPITAL_ADMIN: All permissions within tenant
- Staff roles: Explicit permissions only

---

## Dynamic Menu Updates

Menu structure updates when:

| Event | Action |
|-------|--------|
| Role assignment | Menu refreshes on next login |
| Permission change | Menu refreshes on token refresh |
| Custom role update | Affected users see changes on refresh |

### Refresh Triggers

| Trigger | Method |
|---------|--------|
| Login | Full menu load |
| Token refresh | Permission sync |
| Manual refresh | Call GET /api/menu |
