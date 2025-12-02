---
title: Billing API
description: API reference for SaaS subscription management, checkout, and billing portal.
---

## Overview

The Billing API manages SaaS subscriptions using Dodo Payments as the Merchant of Record. It handles subscription lifecycle, checkout links, customer portal access, and webhook events.

---

## Get Plans

**GET** `/api/billing/plans`

Retrieves available subscription plans (public endpoint for pricing page).

### Authentication

None required.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| plans | array | Available plans |

### Plan Object

| Field | Type | Description |
|-------|------|-------------|
| name | string | Plan name |
| tier | string | Pricing tier |
| features | array | Included features |
| limits | object | Resource limits |

### Limits Object

| Field | Type | Description |
|-------|------|-------------|
| maxUsers | number | Max users (-1 = unlimited) |
| maxPatients | number | Max patients (-1 = unlimited) |

---

## Get Subscription

**GET** `/api/billing/subscription`

Retrieves current subscription details for the tenant.

### Authentication

Required. Bearer token with `SUBSCRIPTION:READ` permission.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Subscription ID (null if FREE) |
| tenantId | string | Tenant ID |
| status | string | Subscription status |
| plan | string | Current plan tier |
| billingCycle | string | `MONTHLY` or `YEARLY` |
| currentPeriodStart | string | Period start (ISO 8601) |
| currentPeriodEnd | string | Period end (ISO 8601) |
| cancelAtPeriodEnd | boolean | Scheduled for cancellation |
| trialEndsAt | string | Trial end date (ISO 8601) |
| dodoCustomerId | string | Dodo customer ID |
| dodoSubscriptionId | string | Dodo subscription ID |
| usage | object | Current usage stats |
| features | array | Available features |

### Usage Object

| Field | Type | Description |
|-------|------|-------------|
| users | object | User usage details |
| patients | object | Patient usage details |

### Usage Details Object

| Field | Type | Description |
|-------|------|-------------|
| current | number | Current count |
| max | number | Maximum allowed |
| unlimited | boolean | True if unlimited |

### Subscription Status Values

| Status | Description |
|--------|-------------|
| PENDING | Awaiting payment |
| ACTIVE | Active subscription |
| ON_HOLD | Payment failed (grace period) |
| CANCELLED | Cancelled by user |
| EXPIRED | Grace period expired |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Create Checkout Link

**GET** `/api/billing/checkout`

Creates a Dodo Payments checkout link for subscription.

### Authentication

Required. Bearer token with `BILLING:MANAGE` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| productId | string | - | Specific Dodo product ID |
| plan | string | - | Plan tier (`STARTER`, `PROFESSIONAL`) |
| cycle | string | MONTHLY | Billing cycle (`MONTHLY`, `YEARLY`) |

Either `productId` or `plan` must be provided.

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| checkoutUrl | string | Dodo checkout URL |
| productId | string | Product ID |
| plan | string | Plan tier |
| cycle | string | Billing cycle |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing plan or productId |
| 400 | CHECKOUT_FAILED | Checkout link creation failed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- Hospital admin or higher can create checkout links
- Existing active subscription prevents new checkout
- Returns redirect URL to Dodo payment page

---

## Get Customer Portal

**GET** `/api/billing/portal`

Retrieves Dodo customer portal link for managing subscription.

### Authentication

Required. Bearer token with `BILLING:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| sendEmail | boolean | false | Send portal link via email |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| portalUrl | string | Customer portal URL |
| expiresAt | string | Link expiration (ISO 8601) |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | NO_CUSTOMER_ACCOUNT | No Dodo customer exists |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

### Business Rules

- Requires existing Dodo customer ID
- Portal allows: update payment, view invoices, cancel subscription
- Link expires after 24 hours

---

## Webhook

**POST** `/api/billing/webhook`

Handles Dodo Payments webhook events.

### Authentication

Webhook signature validation (not Bearer token).

### Headers

| Header | Description |
|--------|-------------|
| x-dodo-signature | Webhook signature for verification |

### Supported Events

| Event | Action |
|-------|--------|
| subscription.active | Mark subscription active |
| subscription.on_hold | Start grace period |
| subscription.cancelled | Mark cancelled |
| subscription.expired | Mark expired |
| subscription.renewed | Update period dates |
| subscription.plan_changed | Update plan tier |
| customer.created | Store customer ID |
| payment.succeeded | Log successful payment |
| payment.failed | Log failed payment |

### Response

**Status: 200 OK**

```json
{ "received": true }
```

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | WEBHOOK_INVALID_SIGNATURE | Invalid signature |
| 500 | WEBHOOK_PROCESSING_ERROR | Processing failed |

---

## Pricing Tiers

| Tier | Max Users | Max Patients | Features |
|------|-----------|--------------|----------|
| FREE | 2 | 100 | OPD, Basic Reports |
| STARTER | 5 | 1,000 | OPD, Basic Reports |
| PROFESSIONAL | 50 | Unlimited | All standard features |
| ENTERPRISE | Unlimited | Unlimited | All features + custom |

### Features by Tier

| Feature | FREE | STARTER | PROFESSIONAL | ENTERPRISE |
|---------|------|---------|--------------|------------|
| OPD | Yes | Yes | Yes | Yes |
| IPD | - | - | Yes | Yes |
| Pharmacy | - | - | Yes | Yes |
| Inventory | - | - | Yes | Yes |
| Basic Reports | Yes | Yes | Yes | Yes |
| Advanced Analytics | - | - | Yes | Yes |
| API Access | - | - | Yes | Yes |
| Custom Roles | - | - | Yes | Yes |
| Multi-Location | - | - | - | Yes |
| Custom Integrations | - | - | - | Yes |
| Dedicated Support | - | - | - | Yes |

---

## Feature Gating

Endpoints are gated based on subscription tier:

| Endpoint | Required Feature |
|----------|------------------|
| POST `/api/patients` | Patient limit check |
| POST `/api/users` | User limit check |
| `/api/inventory/*` | INVENTORY feature |
| `/api/dispensing/*` | PHARMACY feature |

### Feature Gating Response

**Status: 403 Forbidden**

```json
{
  "error": "FEATURE_NOT_AVAILABLE",
  "message": "INVENTORY requires PROFESSIONAL plan or higher",
  "requiredTier": "PROFESSIONAL"
}
```

---

## Grace Period

When payment fails, subscription enters `ON_HOLD` status:

1. **7-day grace period** starts automatically
2. Full access continues during grace period
3. After 7 days, subscription becomes `EXPIRED`
4. Expired subscriptions have restricted access

### Restricted Access

| Action | Allowed |
|--------|---------|
| Read existing data | Yes |
| Create new records | No |
| Export data | Yes |
| Upgrade subscription | Yes |

---

## Billing Permissions

| Permission | Description |
|------------|-------------|
| SUBSCRIPTION:READ | View subscription details |
| BILLING:READ | Access billing portal |
| BILLING:MANAGE | Create checkout, modify subscription |

---

## Error Codes

| Code | Description |
|------|-------------|
| FEATURE_NOT_AVAILABLE | Feature not in current plan |
| USER_LIMIT_REACHED | Cannot add more users |
| PATIENT_LIMIT_REACHED | Cannot add more patients |
| SUBSCRIPTION_REQUIRED | No active subscription |
| SUBSCRIPTION_EXPIRED | Subscription has expired |
| SUBSCRIPTION_ON_HOLD | Payment failed |
| GRACE_PERIOD_EXPIRED | Grace period ended |
| UPGRADE_REQUIRED | Higher tier needed |
| CHECKOUT_FAILED | Checkout creation failed |
| WEBHOOK_INVALID_SIGNATURE | Invalid webhook signature |
| WEBHOOK_PROCESSING_ERROR | Webhook processing failed |
