---
title: Inventory API
description: API reference for pharmacy inventory management, stock tracking, and medicine catalog.
---

## Overview

The Inventory API manages pharmacy stock, medicine catalog, and inventory operations. Pharmacists use this API to track stock levels, manage medicine information, and handle stock adjustments.

---

## List Inventory

**GET** `/api/inventory`

Retrieves pharmacy inventory with stock levels.

### Authentication

Required. Bearer token with `INVENTORY:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Results per page |
| search | string | - | Search by name or code |
| category | string | - | Filter by category |
| status | string | - | Filter by stock status |
| expiringWithin | number | - | Days until expiry |
| sortBy | string | name | Sort field |
| sortOrder | string | asc | `asc` or `desc` |

### Stock Status Filter Values

| Value | Description |
|-------|-------------|
| IN_STOCK | Adequate stock |
| LOW_STOCK | Below reorder level |
| OUT_OF_STOCK | Zero quantity |
| EXPIRING | Expiring soon |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Inventory items |
| pagination | object | Pagination details |
| summary | object | Inventory summary |

### Summary Object

| Field | Type | Description |
|-------|------|-------------|
| totalItems | number | Total unique items |
| inStock | number | Items in stock |
| lowStock | number | Items low on stock |
| outOfStock | number | Out of stock items |
| expiringSoon | number | Expiring within 30 days |

### Inventory Item Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Item ID |
| medicineId | string | Medicine catalog ID |
| name | string | Medicine name |
| genericName | string | Generic name |
| code | string | Item code |
| category | string | Category |
| currentStock | number | Current quantity |
| reorderLevel | number | Reorder threshold |
| unit | string | Unit of measure |
| status | string | Stock status |
| lastRestocked | string | Last restock date |
| expiryDate | string | Earliest expiry |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Get Inventory Item

**GET** `/api/inventory/:id`

Retrieves detailed inventory item information.

### Authentication

Required. Bearer token with `INVENTORY:READ` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Inventory item ID |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Item ID |
| medicine | object | Full medicine details |
| currentStock | number | Current quantity |
| reorderLevel | number | Reorder threshold |
| maxStock | number | Maximum stock level |
| unit | string | Unit of measure |
| location | string | Storage location |
| batches | array | Batch details |
| transactions | array | Recent transactions |
| status | string | Stock status |

### Batch Object

| Field | Type | Description |
|-------|------|-------------|
| batchNumber | string | Batch/lot number |
| quantity | number | Quantity in batch |
| expiryDate | string | Expiry date |
| receivedDate | string | Date received |
| supplier | string | Supplier name |

### Transaction Object

| Field | Type | Description |
|-------|------|-------------|
| type | string | Transaction type |
| quantity | number | Quantity changed |
| reference | string | Reference number |
| performedBy | object | User who performed |
| performedAt | string | Timestamp |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Item not found |

---

## Add Stock

**POST** `/api/inventory/:id/add`

Adds stock to inventory (receiving goods).

### Authentication

Required. Bearer token with `INVENTORY:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Inventory item ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| quantity | number | Yes | Quantity to add |
| batchNumber | string | Yes | Batch/lot number |
| expiryDate | string | Yes | Expiry date |
| purchasePrice | number | No | Purchase price per unit |
| supplier | string | No | Supplier name |
| invoiceNumber | string | No | Supplier invoice |
| notes | string | No | Additional notes |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Item ID |
| previousStock | number | Stock before |
| addedQuantity | number | Quantity added |
| currentStock | number | Stock after |
| batch | object | New batch details |
| transactionId | string | Transaction ID |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing required fields |
| 400 | INVALID_QUANTITY | Quantity must be positive |
| 400 | INVALID_EXPIRY | Expiry date in past |
| 400 | EXCEEDS_MAX_STOCK | Would exceed max stock |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Item not found |

### Business Rules

- Quantity must be positive
- Expiry date must be in future
- Batch number tracked for traceability
- Transaction logged for audit

---

## Adjust Stock

**POST** `/api/inventory/:id/adjust`

Adjusts stock for corrections, damage, or expiry.

### Authentication

Required. Bearer token with `INVENTORY:UPDATE` permission.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Inventory item ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| adjustment | number | Yes | Quantity change (+/-) |
| reason | string | Yes | Adjustment reason |
| batchNumber | string | No | Specific batch |
| notes | string | No | Additional notes |

### Adjustment Reasons

| Reason | Description |
|--------|-------------|
| DAMAGE | Damaged goods |
| EXPIRY | Expired items |
| CORRECTION | Count correction |
| LOSS | Loss or theft |
| RETURN | Returned to supplier |
| OTHER | Other reason |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Item ID |
| previousStock | number | Stock before |
| adjustment | number | Quantity adjusted |
| currentStock | number | Stock after |
| reason | string | Adjustment reason |
| transactionId | string | Transaction ID |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing required fields |
| 400 | INSUFFICIENT_STOCK | Cannot reduce below zero |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Item not found |

### Business Rules

- Cannot reduce stock below zero
- Reason required for audit trail
- Negative adjustments require approval (optional)

---

## Get Low Stock Items

**GET** `/api/inventory/low-stock`

Retrieves items below reorder level.

### Authentication

Required. Bearer token with `INVENTORY:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Results limit |
| category | string | - | Filter by category |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| items | array | Low stock items |
| count | number | Total count |

### Low Stock Item

| Field | Type | Description |
|-------|------|-------------|
| id | string | Item ID |
| name | string | Medicine name |
| currentStock | number | Current quantity |
| reorderLevel | number | Reorder threshold |
| deficit | number | Below threshold by |
| lastDispensed | string | Last dispensing date |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Get Expiring Items

**GET** `/api/inventory/expiring`

Retrieves items expiring soon.

### Authentication

Required. Bearer token with `INVENTORY:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 30 | Days until expiry |
| limit | number | 50 | Results limit |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| items | array | Expiring items |
| count | number | Total count |

### Expiring Item

| Field | Type | Description |
|-------|------|-------------|
| id | string | Item ID |
| name | string | Medicine name |
| batchNumber | string | Batch number |
| quantity | number | Quantity in batch |
| expiryDate | string | Expiry date |
| daysUntilExpiry | number | Days remaining |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Medicine Catalog

### List Medicines

**GET** `/api/inventory/medicines`

Retrieves medicine catalog.

### Authentication

Required. Bearer token with `INVENTORY:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Results per page |
| search | string | - | Search by name |
| category | string | - | Filter by category |
| type | string | - | Filter by type |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Medicine list |
| pagination | object | Pagination details |

### Medicine Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Medicine ID |
| name | string | Brand name |
| genericName | string | Generic name |
| code | string | Medicine code |
| category | string | Category |
| type | string | Type (tablet, syrup, etc.) |
| manufacturer | string | Manufacturer |
| strength | string | Strength/dosage |
| unit | string | Unit of measure |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

### Add Medicine

**POST** `/api/inventory/medicines`

Adds new medicine to catalog.

### Authentication

Required. Bearer token with `INVENTORY:CREATE` permission.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Brand name |
| genericName | string | Yes | Generic name |
| code | string | No | Medicine code |
| category | string | Yes | Category |
| type | string | Yes | Medicine type |
| manufacturer | string | No | Manufacturer |
| strength | string | No | Strength |
| unit | string | Yes | Unit of measure |
| reorderLevel | number | No | Default reorder level |
| maxStock | number | No | Default max stock |
| description | string | No | Description |

### Response

**Status: 201 Created**

Returns created medicine object.

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing required fields |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 409 | CODE_EXISTS | Medicine code exists |

---

## Stock Transactions

**GET** `/api/inventory/transactions`

Retrieves stock transaction history.

### Authentication

Required. Bearer token with `INVENTORY:READ` permission.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Results per page |
| itemId | string | - | Filter by item |
| type | string | - | Filter by type |
| startDate | string | - | From date |
| endDate | string | - | To date |

### Transaction Types

| Type | Description |
|------|-------------|
| RECEIPT | Stock received |
| DISPENSING | Dispensed to patient |
| ADJUSTMENT | Stock adjustment |
| RETURN | Returned to supplier |
| TRANSFER | Internal transfer |

### Response

**Status: 200 OK**

| Field | Type | Description |
|-------|------|-------------|
| data | array | Transaction list |
| pagination | object | Pagination details |

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |

---

## Medicine Categories

| Category | Description |
|----------|-------------|
| ANALGESICS | Pain relievers |
| ANTIBIOTICS | Antibacterial medicines |
| ANTIDIABETICS | Diabetes medicines |
| ANTIHYPERTENSIVES | Blood pressure medicines |
| ANTIHISTAMINES | Allergy medicines |
| CARDIOVASCULAR | Heart medicines |
| GASTROINTESTINAL | Digestive system |
| RESPIRATORY | Respiratory system |
| VITAMINS | Vitamins and supplements |
| TOPICAL | External application |
| INJECTABLE | Injection medicines |
| OTHER | Other categories |

---

## Medicine Types

| Type | Description |
|------|-------------|
| TABLET | Oral tablets |
| CAPSULE | Oral capsules |
| SYRUP | Liquid oral |
| INJECTION | Injectable |
| CREAM | Topical cream |
| OINTMENT | Topical ointment |
| DROPS | Eye/ear drops |
| INHALER | Respiratory inhaler |
| POWDER | Powder form |
| SUSPENSION | Liquid suspension |
