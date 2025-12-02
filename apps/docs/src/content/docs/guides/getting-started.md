---
title: Getting Started
description: Quick start guide to begin using useHely.
---

## Overview

useHely is a multi-tenant SaaS platform for healthcare organizations. Whether you're running a hospital, clinic, or solo practice, this guide walks you through the initial setup process.

## Choose Your Organization Type

useHely supports three organization types with different registration flows:

| Type | Best For | Registration |
|------|----------|--------------|
| **Hospital** | Large facilities with multiple departments | Email verification required |
| **Clinic** | Medical clinics with team members | Instant activation |
| **Solo Practice** | Individual practitioners | Instant activation + Doctor role |

## Registration

### Option A: Hospital Registration

For hospitals requiring license verification:

1. Navigate to the registration page
2. Select **Hospital** as organization type
3. Provide the following information:
   - Hospital name
   - Address (street, city, state, postal code, country)
   - Contact email and phone
   - **Hospital license number** (required)
   - Administrator email and phone

4. Submit the registration form
5. Check your admin email inbox for a verification link
6. Click the verification link within 24 hours
7. Your hospital status changes from `PENDING` to `VERIFIED`
8. Receive admin credentials via email

### Option B: Clinic or Solo Practice (Self-Service)

For clinics and solo practices with instant activation:

1. Navigate to the registration page
2. Select **Clinic** or **Solo Practice** as organization type
3. Provide the following information:
   - Organization name
   - Address (street, city, state, postal code, country)
   - Contact email and phone
   - Administrator email and phone
   - No license number required

4. Submit the registration form
5. Your organization is **immediately activated**
6. Receive admin credentials via email
7. Log in and start using useHely right away

> **Note:** Solo Practice admins automatically receive both Administrator and Doctor roles, allowing immediate access to patient care features.

## Initial Configuration

### Configure Departments

Set up your departments:

1. Navigate to **Settings > Departments**
2. Add departments with:
   - Name and code
   - Department type (Clinical, Administrative, etc.)
   - Operating hours
   - Contact information

### Create Staff Accounts

Add users for your organization:

1. Navigate to **Users > Add User**
2. Provide user details:
   - Name and contact information
   - Department assignment
   - Role assignment (Doctor, Nurse, Pharmacist, etc.)
3. User receives welcome email with temporary credentials

### Set Up Roles (Optional)

Customize roles beyond the defaults:

1. Navigate to **Settings > Roles**
2. Create custom roles with specific permissions
3. Assign roles to users as needed

## Default Roles

useHely provides pre-configured roles:

| Role | Description |
|------|-------------|
| Admin | Full organization management access |
| Doctor | Patient management, prescriptions |
| Nurse | Patient care, vitals recording |
| Pharmacist | Prescription dispensing |
| Receptionist | Patient registration, appointments |

## Next Steps

Once your organization is configured:

- [Register patients](/api/05-patients)
- [Schedule appointments](/api/08-appointments)
- [Create prescriptions](/api/06-prescriptions)
- [Manage inventory](/api/14-inventory)

## Support

For assistance with setup or configuration:

- Review the [API Reference](/api/01-hospital) documentation
- Contact support at info@usehely.com
