---
title: Compliance & Security Overview
description: Technical controls and compliance readiness for HIPAA, GDPR, and SOC 2.
---

## Important Disclaimer

useHely provides **technical controls** that support compliance with healthcare regulations. However, **compliance is a shared responsibility** between the software platform and your organization.

This software is:
- **HIPAA-Ready**: Implements technical safeguards required by HIPAA
- **GDPR-Ready**: Provides data subject rights capabilities required by GDPR
- **SOC 2-Aligned**: Follows security practices mapped to SOC 2 controls

This software is **NOT**:
- HIPAA certified (there is no such certification)
- A substitute for your organization's compliance program
- Sufficient on its own to achieve regulatory compliance

---

## Shared Responsibility Model

Achieving compliance requires both technical controls (provided by useHely) and administrative/organizational measures (your responsibility).

| Area | useHely Provides | Your Organization Must |
|------|------------------|----------------------|
| **Access Control** | RBAC + ABAC, MFA support, session management | Define access policies, manage user accounts, enforce MFA |
| **Encryption** | AES-256-GCM field-level encryption, TLS 1.3 | Manage encryption keys, secure key storage |
| **Audit Logging** | Immutable audit trails, PHI access logging | Review logs, investigate incidents, retain records |
| **Data Rights** | Export, deletion, consent management APIs | Process requests within legal timeframes, notify users |
| **Policies** | Technical enforcement mechanisms | Written policies, staff training, risk assessments |
| **Incident Response** | Security event monitoring, alerting | Incident response plan, breach notification procedures |

---

## HIPAA Technical Safeguards

The HIPAA Security Rule requires covered entities to implement technical safeguards for PHI. Here's how useHely addresses each requirement:

### Access Control (164.312(a)(1))

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Unique User Identification | UUID-based user IDs, email verification | Implemented |
| Emergency Access Procedure | Admin override capabilities | Implemented |
| Automatic Logoff | Configurable session timeout (default: 1 hour) | Implemented |
| Encryption and Decryption | AES-256-GCM field-level encryption | Implemented |

### Audit Controls (164.312(b))

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Hardware/Software Activity | Application-level audit logging | Implemented |
| User Activity | All CRUD operations logged with user context | Implemented |
| PHI Access | Dedicated PHI access logging with hash chain | Implemented |

### Integrity Controls (164.312(c)(1))

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Data Integrity | Cryptographic hash chain on audit logs | Implemented |
| Tamper Detection | Hash verification on log retrieval | Implemented |

### Transmission Security (164.312(e)(1))

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Encryption in Transit | TLS 1.3 enforced on all endpoints | Implemented |
| Integrity Controls | HTTPS with certificate validation | Implemented |

### Person or Entity Authentication (164.312(d))

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Multi-Factor Authentication | TOTP-based MFA (optional per user) | Implemented |
| Password Requirements | Minimum 8 chars, complexity enforced | Implemented |
| Account Lockout | Lock after 5 failed attempts | Implemented |

### Data Retention

| Data Type | Retention Period | Basis |
|-----------|-----------------|-------|
| Audit Logs | 6 years | HIPAA requirement |
| Patient Records | Until deletion requested | Legal/operational |
| Consent Records | 6 years after withdrawal | Legal requirement |

### Your HIPAA Responsibilities

To achieve HIPAA compliance, your organization must also:

1. **Business Associate Agreements (BAAs)**: Execute BAAs with all vendors handling PHI
2. **Risk Assessment**: Conduct annual security risk assessments
3. **Policies & Procedures**: Develop written security policies
4. **Workforce Training**: Train all staff on HIPAA requirements
5. **Incident Response**: Establish breach notification procedures
6. **Physical Safeguards**: Secure physical access to systems
7. **Contingency Planning**: Develop backup and disaster recovery plans

---

## GDPR Data Subject Rights

useHely implements all required GDPR data subject rights through the Compliance API:

### Implemented Rights

| Right | Article | API Endpoint | Description |
|-------|---------|--------------|-------------|
| Right of Access | Art. 15 | `POST /api/compliance/data-export` | Export all personal data |
| Right to Rectification | Art. 16 | `PATCH /api/users/:id` | Update personal data |
| Right to Erasure | Art. 17 | `POST /api/compliance/data-deletion` | Request data deletion |
| Right to Portability | Art. 20 | `GET /api/compliance/data-export/:id/download` | Machine-readable export |
| Right to Withdraw Consent | Art. 7(3) | `PUT /api/compliance/consent/:id/withdraw` | Withdraw consent |

### Data Export Contents

When a user requests their data, the export includes:

| Category | Data Included |
|----------|---------------|
| Profile | Name, email, phone, address |
| Account | Created date, last login, preferences |
| Activity | Login history, actions performed |
| Consent | All consent records with timestamps |
| Related | Any data linked to the user |

### Deletion Process

1. User submits deletion request
2. Verification email sent (48-hour validity)
3. User confirms via email link
4. 30-day grace period (can cancel)
5. Permanent deletion after grace period

### Your GDPR Responsibilities

1. **Data Protection Officer**: Appoint DPO if required
2. **Privacy Notices**: Provide clear privacy information
3. **Lawful Basis**: Document legal basis for processing
4. **Request Handling**: Process DSARs within 30 days
5. **Breach Notification**: Notify authorities within 72 hours
6. **Data Protection Impact Assessments**: Conduct DPIAs for high-risk processing
7. **International Transfers**: Ensure lawful data transfers

---

## SOC 2 Control Mapping

useHely implements controls aligned with SOC 2 Trust Service Criteria:

### Security (Common Criteria)

| Control | Category | Implementation |
|---------|----------|----------------|
| CC6.1 | Logical Access | RBAC + ABAC permission enforcement |
| CC6.2 | Authentication | JWT tokens, password hashing, MFA |
| CC6.3 | Authorization | Permission validation on all endpoints |
| CC6.6 | Multi-Factor Auth | TOTP-based second factor |
| CC6.7 | Privileged Access | Admin action logging, role separation |
| CC7.1 | Configuration Management | Environment-based configuration |
| CC7.2 | Security Monitoring | Security event tracking and alerting |
| CC7.3 | Incident Response | Event logging, notification integration |

### Availability

| Control | Implementation |
|---------|----------------|
| A1.1 | Health check endpoints for monitoring |
| A1.2 | Horizontal scaling support |
| A1.3 | Database replication (MongoDB Atlas) |

### Confidentiality

| Control | Implementation |
|---------|----------------|
| C1.1 | Field-level encryption for sensitive data |
| C1.2 | PII masking in logs |

### Your SOC 2 Responsibilities

SOC 2 certification requires:

1. **Third-Party Audit**: Engage a CPA firm for SOC 2 examination
2. **Control Documentation**: Document all security controls
3. **Continuous Monitoring**: Implement ongoing security monitoring
4. **Vendor Management**: Assess third-party security
5. **Change Management**: Document system changes

---

## Technical Security Features

### Field-Level Encryption

Sensitive PHI/PII fields are encrypted at rest using AES-256-GCM:

| Model | Encrypted Fields |
|-------|------------------|
| Patient | firstName, lastName, phone, email, address, emergencyContact |
| Prescription | diagnosis, notes |
| Vitals | notes, correctionReason |
| Staff | phone |

### Key Management

| Feature | Implementation |
|---------|----------------|
| Algorithm | AES-256-GCM |
| Key Storage | Environment variable (production: AWS KMS/Vault recommended) |
| Key Rotation | Manual rotation with automatic re-encryption |
| Rotation Schedule | Recommended every 90 days |

### Access Control

| Feature | Implementation |
|---------|----------------|
| Role-Based (RBAC) | 6 pre-defined roles with granular permissions |
| Attribute-Based (ABAC) | Fine-grained access based on user/resource attributes |
| Permission Format | `RESOURCE:ACTION` (e.g., `PATIENT:READ`) |
| Default Policy | Deny by default |

### Audit Logging

| Feature | Implementation |
|---------|----------------|
| Log Format | Immutable, append-only |
| Integrity | Cryptographic hash chain |
| PHI Access | Dedicated tracking with full context |
| Retention | 6 years (no auto-deletion) |
| Export | CSV/JSON export for compliance reporting |

### Security Events

Monitored security events:

| Event Type | Severity | Description |
|------------|----------|-------------|
| AUTH_FAILED | Medium | Failed login attempt |
| AUTH_LOCKOUT | High | Account locked after failures |
| PERMISSION_DENIED | Medium | Unauthorized access attempt |
| MFA_FAILED | High | Failed MFA verification |
| SUSPICIOUS_ACTIVITY | High | Unusual access pattern |
| KEY_ROTATION | Low | Encryption key rotated |

---

## Compliance Reporting

### HIPAA Compliance Report

Generate HIPAA compliance reports via API:

```
GET /api/audit/reports/hipaa?startDate=2024-01-01&endDate=2024-12-31
```

Report includes:
- Access control audit summary
- PHI access statistics
- Security event summary
- User activity breakdown

### Audit Log Export

Export audit logs for compliance review:

```
POST /api/audit/export
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "format": "csv"
}
```

---

## Recommendations

### Before Going to Production

1. **Enable MFA** for all administrative accounts
2. **Configure key rotation** schedule (90 days recommended)
3. **Review default roles** and customize permissions
4. **Test data export/deletion** workflows
5. **Set up security event monitoring** and alerting

### Ongoing Compliance

1. **Review audit logs** regularly (weekly recommended)
2. **Rotate encryption keys** per schedule
3. **Update access permissions** when roles change
4. **Process data requests** within legal timeframes
5. **Conduct periodic security reviews**

### For Formal Compliance

If pursuing formal HIPAA compliance or SOC 2 certification:

1. Consult with a compliance specialist
2. Conduct a formal risk assessment
3. Develop comprehensive policies and procedures
4. Implement staff training programs
5. Engage auditors for certification (SOC 2)

---

## Contact

For questions about compliance features or security concerns, contact your organization's compliance officer or IT security team.

For technical issues with compliance APIs, refer to:
- [Audit API Documentation](/api/16-audit/)
- [GDPR Compliance API Documentation](/api/18-compliance/)
- [Security API Documentation](/api/15-security/)
