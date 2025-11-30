---
title: Health & Monitoring API
description: API reference for health checks, Prometheus metrics, and high availability monitoring.
---

## Overview

The Health & Monitoring API provides system health checks, dependency status, Prometheus metrics, and SLA tracking. These endpoints support high availability architecture, Kubernetes deployments, and operational monitoring.

---

## Health Check

**GET** `/health`

Comprehensive health check including all dependencies.

### Authentication

Not required.

### Response

**Status: 200 OK** (all healthy) or **503 Service Unavailable** (degraded)

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.2.3",
  "uptime": 864000,
  "checks": {
    "mongodb": {
      "status": "healthy",
      "latency": 5,
      "message": "Connected to primary"
    },
    "redis": {
      "status": "healthy",
      "latency": 2,
      "message": "Connected"
    },
    "email": {
      "status": "healthy",
      "latency": 150,
      "message": "SMTP connection verified"
    }
  }
}
```

### Health Status Values

| Status | HTTP Code | Description |
|--------|-----------|-------------|
| healthy | 200 | All systems operational |
| degraded | 200 | Some non-critical systems impaired |
| unhealthy | 503 | Critical systems unavailable |

### Check Object

| Field | Type | Description |
|-------|------|-------------|
| status | string | `healthy`, `degraded`, or `unhealthy` |
| latency | number | Response time in milliseconds |
| message | string | Human-readable status message |

---

## Liveness Probe

**GET** `/health/live`

Kubernetes liveness probe. Indicates if the application is running.

### Authentication

Not required.

### Response

**Status: 200 OK**

```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Use Case

- Kubernetes uses this to determine if the pod should be restarted
- Returns 200 if the Node.js process is responsive
- Does not check external dependencies

---

## Readiness Probe

**GET** `/health/ready`

Kubernetes readiness probe. Indicates if the application can accept traffic.

### Authentication

Not required.

### Response

**Status: 200 OK** (ready) or **503 Service Unavailable** (not ready)

```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "mongodb": "ready",
    "redis": "ready"
  }
}
```

### Use Case

- Kubernetes uses this to determine if the pod should receive traffic
- Returns 200 only if critical dependencies (MongoDB, Redis) are available
- Pod is removed from service during startup or when dependencies are down

---

## Prometheus Metrics

**GET** `/metrics`

Prometheus-compatible metrics endpoint.

### Authentication

Not required (should be protected at infrastructure level).

### Response

**Content-Type: text/plain**

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/patients",status="200"} 15420
http_requests_total{method="POST",path="/api/auth/token",status="200"} 3250
http_requests_total{method="POST",path="/api/auth/token",status="401"} 45

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 14000
http_request_duration_seconds_bucket{le="0.5"} 15200
http_request_duration_seconds_bucket{le="1"} 15400
http_request_duration_seconds_bucket{le="+Inf"} 15420
http_request_duration_seconds_sum 2150.5
http_request_duration_seconds_count 15420

# HELP nodejs_heap_size_bytes Node.js heap size
# TYPE nodejs_heap_size_bytes gauge
nodejs_heap_size_bytes{type="used"} 52428800
nodejs_heap_size_bytes{type="total"} 104857600

# HELP mongodb_connections_active Active MongoDB connections
# TYPE mongodb_connections_active gauge
mongodb_connections_active 25

# HELP redis_connections_active Active Redis connections
# TYPE redis_connections_active gauge
redis_connections_active 10

# HELP app_active_sessions Active user sessions
# TYPE app_active_sessions gauge
app_active_sessions{tenant="hospital-1"} 45
app_active_sessions{tenant="hospital-2"} 32
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| http_requests_total | counter | Total HTTP requests by method, path, status |
| http_request_duration_seconds | histogram | Request latency distribution |
| nodejs_heap_size_bytes | gauge | Node.js memory usage |
| nodejs_eventloop_lag_seconds | gauge | Event loop lag |
| mongodb_connections_active | gauge | Active MongoDB connections |
| mongodb_query_duration_seconds | histogram | MongoDB query latency |
| redis_connections_active | gauge | Active Redis connections |
| redis_command_duration_seconds | histogram | Redis command latency |
| app_active_sessions | gauge | Active sessions by tenant |
| app_api_errors_total | counter | API errors by type |
| app_auth_attempts_total | counter | Auth attempts by result |

---

## SLA Status

**GET** `/api/sla/status`

Current SLA metrics and uptime percentage.

### Authentication

Required. Bearer token with `MONITORING:READ` permission.

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "target": 99.9,
    "current": {
      "period": "30d",
      "uptime": 99.95,
      "downtimeMinutes": 21.6,
      "incidents": 2
    },
    "metrics": {
      "availability": {
        "last24h": 100,
        "last7d": 99.98,
        "last30d": 99.95
      },
      "latency": {
        "p50": 45,
        "p95": 180,
        "p99": 350
      },
      "errorRate": {
        "last24h": 0.02,
        "last7d": 0.03,
        "last30d": 0.025
      }
    },
    "lastIncident": {
      "timestamp": "2024-01-10T14:30:00Z",
      "duration": 12,
      "type": "partial_outage",
      "resolved": true
    }
  }
}
```

### SLA Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Availability | Percentage of time service is operational | 99.9% |
| P50 Latency | Median response time | < 100ms |
| P95 Latency | 95th percentile response time | < 500ms |
| P99 Latency | 99th percentile response time | < 1000ms |
| Error Rate | Percentage of 5xx responses | < 0.1% |

---

## SLA History

**GET** `/api/sla/history`

Historical SLA data for reporting.

### Authentication

Required. Bearer token with `MONITORING:READ` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | `daily`, `weekly`, `monthly` (default: daily) |
| startDate | string | No | Start date (ISO 8601) |
| endDate | string | No | End date (ISO 8601) |

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "period": "daily",
    "history": [
      {
        "date": "2024-01-15",
        "uptime": 100,
        "p95Latency": 175,
        "errorRate": 0.01,
        "requests": 125000
      },
      {
        "date": "2024-01-14",
        "uptime": 99.98,
        "p95Latency": 182,
        "errorRate": 0.02,
        "requests": 118000
      }
    ]
  }
}
```

---

## Incidents

**GET** `/api/sla/incidents`

List service incidents.

### Authentication

Required. Bearer token with `MONITORING:READ` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | `active`, `resolved`, `all` (default: all) |
| startDate | string | No | Start date |
| endDate | string | No | End date |

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": "incident-uuid",
      "type": "partial_outage",
      "title": "Elevated API latency",
      "description": "Database connection pool exhaustion",
      "severity": "medium",
      "startTime": "2024-01-10T14:30:00Z",
      "endTime": "2024-01-10T14:42:00Z",
      "duration": 12,
      "affectedServices": ["api", "authentication"],
      "status": "resolved",
      "resolution": "Increased connection pool size"
    }
  ]
}
```

### Incident Types

| Type | Description |
|------|-------------|
| full_outage | Complete service unavailability |
| partial_outage | Some features unavailable |
| degraded_performance | Elevated latency or error rates |
| scheduled_maintenance | Planned downtime |

---

## Alerting Configuration

**GET** `/api/monitoring/alerts`

Get current alerting configuration.

### Authentication

Required. Bearer token with `MONITORING:MANAGE` permission.

### Response

**Status: 200 OK**

```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "type": "pagerduty",
        "enabled": true,
        "config": {
          "serviceKey": "***hidden***"
        }
      },
      {
        "type": "slack",
        "enabled": true,
        "config": {
          "webhookUrl": "***hidden***",
          "channel": "#alerts"
        }
      }
    ],
    "rules": [
      {
        "name": "high_error_rate",
        "condition": "error_rate > 1%",
        "duration": "5m",
        "severity": "critical",
        "enabled": true
      },
      {
        "name": "high_latency",
        "condition": "p95_latency > 1000ms",
        "duration": "5m",
        "severity": "warning",
        "enabled": true
      }
    ]
  }
}
```

---

## Kubernetes Deployment

### Example Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hms-api
spec:
  template:
    spec:
      containers:
      - name: api
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
```

---

## Permissions

| Permission | Description |
|------------|-------------|
| MONITORING:READ | View SLA status and incidents |
| MONITORING:MANAGE | Configure alerting rules |
