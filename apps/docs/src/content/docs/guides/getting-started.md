---
title: Getting Started
description: Quick start guide to begin using the Hospital Management System.
---

## Overview

The Hospital Management System (HMS) is a multi-tenant SaaS platform that enables hospitals to digitize their operations. This guide walks you through the initial setup process.

## Hospital Registration

### Step 1: Register Your Hospital

To begin using HMS, register your hospital on the platform:

1. Navigate to the registration page
2. Provide the following information:
   - Hospital name
   - Address (street, city, state, postal code, country)
   - Contact email and phone
   - Hospital license number
   - Administrator email and phone

3. Submit the registration form

### Step 2: Verify Email

After registration:

1. Check your admin email inbox for a verification link
2. Click the verification link within 24 hours
3. Your hospital status will change from `PENDING` to `VERIFIED`

### Step 3: Activate Hospital

Once verified, a platform administrator will review and activate your hospital. Upon activation:

- Your hospital status changes to `ACTIVE`
- You receive admin credentials
- You can begin configuring your hospital

## Initial Configuration

### Configure Departments

Set up your hospital departments:

1. Navigate to **Settings > Departments**
2. Add departments with:
   - Name and code
   - Department type (Clinical, Administrative, etc.)
   - Operating hours
   - Contact information

### Create Staff Accounts

Add users for your hospital:

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

HMS provides pre-configured roles:

| Role | Description |
|------|-------------|
| Hospital Admin | Full hospital management access |
| Doctor | Patient management, prescriptions |
| Nurse | Patient care, vitals recording |
| Pharmacist | Prescription dispensing |
| Receptionist | Patient registration, appointments |

## Next Steps

Once your hospital is configured:

- [Register patients](/api/04-patients)
- [Schedule appointments](/api/07-appointments)
- [Create prescriptions](/api/05-prescriptions)
- [Manage inventory](/api/13-inventory)

## Support

For assistance with setup or configuration:

- Review the [API Reference](/api/01-hospital) documentation
- Contact platform support
