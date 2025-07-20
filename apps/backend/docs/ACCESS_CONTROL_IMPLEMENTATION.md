# Multi-Tier Access Control Implementation

## Overview

The ParkML platform now implements a comprehensive multi-tier access control
system that provides fine-grained permissions for medical data access based on
user roles, patient relationships, and data sensitivity categories.

## Key Features

### 1. **Multi-Tier Access Levels**

- **PATIENT_FULL**: Complete access to own data
- **CAREGIVER_PROFESSIONAL**: Medical professional access to patient data
- **CAREGIVER_FAMILY**: Limited family caregiver access
- **EMERGENCY_ACCESS**: Temporary emergency access to all data
- **RESEARCH_ANONYMIZED**: Anonymized research data access
- **ANALYTICS_AGGREGATED**: Population health analytics access

### 2. **Data Categories**

- **DEMOGRAPHICS**: Basic patient information
- **MOTOR_SYMPTOMS**: Parkinson's motor symptoms (tremors, rigidity,
  bradykinesia)
- **NON_MOTOR_SYMPTOMS**: Cognitive, mood, sleep symptoms
- **AUTONOMIC_SYMPTOMS**: Blood pressure, bladder/bowel function
- **DAILY_ACTIVITIES**: Activities of daily living assessments
- **MEDICATION_DATA**: Medication information and compliance
- **EMERGENCY_CONTACTS**: Emergency contact information
- **SAFETY_INCIDENTS**: Fall reports and safety events
- **ENVIRONMENTAL_FACTORS**: Environmental triggers and factors

### 3. **Access Control Matrix**

| Role                       | Demographics         | Motor Symptoms       | Non-Motor            | Autonomic            | Daily Activities     | Medication           | Emergency Contacts   | Safety Incidents     | Environmental        |
| -------------------------- | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- |
| **Patient**                | ✅ Full              | ✅ Full              | ✅ Full              | ✅ Full              | ✅ Full              | ✅ Full              | ✅ Full              | ✅ Full              | ✅ Full              |
| **Professional Caregiver** | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      |
| **Family Caregiver**       | ✅ Family            | ✅ Family            | ✅ Family            | ❌                   | ✅ Family            | ❌                   | ✅ Family            | ✅ Family            | ✅ Family            |
| **Clinic Admin**           | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      | ✅ Professional      |
| **Super Admin**            | ✅ Full/Professional | ✅ Full/Professional | ✅ Full/Professional | ✅ Full/Professional | ✅ Full/Professional | ✅ Full/Professional | ✅ Full/Professional | ✅ Full/Professional | ✅ Full/Professional |

## Implementation Components

### 1. **Access Control Engine** (`access-control.ts`)

- Evaluates permissions based on user role, patient relationships, and data
  categories
- Handles emergency access scenarios with time-limited permissions
- Supports proxy re-encryption delegations
- Creates comprehensive audit trails

### 2. **Access Control Middleware** (`access-control-middleware.ts`)

- Express middleware for enforcing access control on API endpoints
- Provides utility functions for checking data category access
- Supports different access patterns (patient-only, emergency, organizational)

### 3. **Demo Endpoints** (`access-control-demo.ts`)

- Comprehensive demonstration of different access levels
- Shows granular permission enforcement
- Provides access summaries and diagnostics

## API Endpoints

### Demo Endpoints (Base: `/api/access-control-demo`)

1. **Motor Symptoms Access**

   ```
   GET /motor-symptoms/:patientId
   ```

   - Requires: Family caregiver access or higher
   - Demonstrates basic symptom data access

2. **Autonomic Symptoms Access**

   ```
   GET /autonomic-symptoms/:patientId
   ```

   - Requires: Professional caregiver access
   - Shows sensitive medical data protection

3. **Patient Data Access**

   ```
   GET /patient-data/:patientId
   ```

   - Requires: Patient-only access
   - Demonstrates full data access for patients

4. **Emergency Access**

   ```
   GET /emergency-access/:emergencyAccessId
   ```

   - Requires: Active emergency access record
   - Shows temporary emergency permissions

5. **Administrative Access**

   ```
   GET /admin-access/:patientId
   ```

   - Requires: Clinic admin or super admin role
   - Demonstrates organizational access control

6. **Multi-Category Access**

   ```
   GET /multi-category/:patientId
   ```

   - Shows granular category-level permissions
   - Returns detailed access matrix

7. **Access Summary**

   ```
   GET /access-summary
   ```

   - Returns user's available access levels
   - Shows data categories and system overview

## Enhanced Symptom Entries

The symptom entries endpoints (`/api/symptom-entries`) now use the new access
control system:

- **GET /**: List symptom entries with data filtering based on permissions
- **POST /**: Create new entries with access validation
- **GET /:id**: Get specific entry with category-level data filtering

Response includes:

- `accessLevel`: User's current access level
- `accessibleCategories`: Array of accessible data categories
- Data fields are null if not accessible to the user

## Testing Access Control

### 1. **Create Test Users and Patients**

```bash
# Create test organization
curl -X POST http://localhost:5000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Clinic",
    "email": "admin@testclinic.com"
  }'

# Create test patient
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "patient",
    "organizationId": "org_id_here"
  }'

# Create professional caregiver
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123",
    "name": "Dr. Smith",
    "role": "professional_caregiver",
    "organizationId": "org_id_here"
  }'

# Create family caregiver
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "family@example.com",
    "password": "password123",
    "name": "Jane Doe",
    "role": "family_caregiver",
    "organizationId": "org_id_here"
  }'
```

### 2. **Test Access Levels**

```bash
# Test family caregiver access (should have limited access)
curl -X GET http://localhost:5000/api/access-control-demo/multi-category/patient_id \
  -H "Authorization: Bearer family_caregiver_token"

# Test professional caregiver access (should have full access)
curl -X GET http://localhost:5000/api/access-control-demo/autonomic-symptoms/patient_id \
  -H "Authorization: Bearer professional_caregiver_token"

# Test patient access (should have full access to own data)
curl -X GET http://localhost:5000/api/access-control-demo/patient-data/patient_id \
  -H "Authorization: Bearer patient_token"
```

### 3. **Test Emergency Access**

```bash
# Create emergency access record
curl -X POST http://localhost:5000/api/emergency-access \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_id",
    "userId": "emergency_user_id",
    "reason": "Medical emergency - patient unresponsive",
    "accessType": "medical_emergency"
  }'

# Test emergency access
curl -X GET http://localhost:5000/api/access-control-demo/emergency-access/emergency_access_id \
  -H "Authorization: Bearer emergency_user_token"
```

## Audit and Compliance

The access control system creates detailed audit trails including:

- **Operation Type**: encrypt, decrypt, key_generation,
  access_control_evaluation
- **User Context**: User ID, role, organization
- **Patient Context**: Patient ID and organization
- **Data Categories**: Specific categories accessed
- **Access Level**: Level of access granted
- **Success/Failure**: Operation outcome
- **Cryptographic Proof**: Digital signature of audit entry
- **Network Context**: IP address, user agent
- **Timestamp**: Precise timing of access

## Security Features

1. **Defense in Depth**: Multiple layers of access control validation
2. **Principle of Least Privilege**: Users get minimum necessary access
3. **Temporal Access**: Emergency access with automatic expiration
4. **Cryptographic Audit**: Tamper-proof audit trails
5. **Real-time Monitoring**: Immediate access decision logging
6. **Cross-Organizational Isolation**: Strict organizational boundaries

## Integration with Encryption

The access control system is designed to integrate seamlessly with:

1. **Attribute-Based Encryption (ABE)**: Cryptographic policy enforcement
2. **Proxy Re-Encryption**: Patient-controlled access delegation
3. **Homomorphic Encryption**: Privacy-preserving analytics
4. **Emergency Cryptographic Keys**: Secure emergency access mechanisms

## Advanced Cryptographic Features

### Implemented Systems

1. ✅ **Emergency Access Enhancement**: Cryptographic emergency keys with
   multi-signature approval
2. ✅ **Proxy Re-Encryption**: Patient-controlled delegation system implemented
3. ✅ **Homomorphic Analytics**: Privacy-preserving population health insights
4. ✅ **Data Migration**: Secure migration system for existing unencrypted
   records
5. ✅ **Performance Optimization**: Comprehensive performance audit and
   optimization system
6. ✅ **Security Audit**: Automated security assessment and vulnerability
   scanning

### Documentation References

- **[Cryptographic Emergency Access](./CRYPTOGRAPHIC_EMERGENCY_ACCESS.md)**:
  Advanced emergency access with cryptographic features
- **[Performance Audit System](./PERFORMANCE_AUDIT_SYSTEM.md)**: System
  monitoring and security assessment
- **[Data Migration System](./DATA_MIGRATION_SYSTEM.md)**: Secure migration of
  existing data to encrypted format

### Additional API Endpoints

#### Cryptographic Emergency Access

```
POST /api/emergency-access-crypto/request
POST /api/emergency-access-crypto/:requestId/approve
GET  /api/emergency-access-crypto/active
GET  /api/emergency-access-crypto/audit
```

#### Data Migration

```
POST /api/data-migration/start
GET  /api/data-migration/estimate
GET  /api/data-migration/:migrationId
POST /api/data-migration/:migrationId/cancel
```

#### Performance Audit

```
POST /api/performance-audit/run-audit
GET  /api/performance-audit/metrics
GET  /api/performance-audit/recommendations
GET  /api/performance-audit/security-findings
```

#### Homomorphic Analytics

```
GET  /api/homomorphic-analytics/population-insights
POST /api/homomorphic-analytics/custom-query
GET  /api/homomorphic-analytics/privacy-metrics
```

#### Proxy Re-Encryption

```
POST /api/proxy-re-encryption/delegate-access
GET  /api/proxy-re-encryption/delegations
POST /api/proxy-re-encryption/:delegationId/revoke
```

## Configuration

The access control system can be configured through environment variables:

```env
# Access control settings
ACCESS_CONTROL_AUDIT_ENABLED=true
ACCESS_CONTROL_CACHE_TTL=300
ACCESS_CONTROL_EMERGENCY_DURATION=24
ACCESS_CONTROL_ADMIN_TIMEOUT=480
ACCESS_CONTROL_CAREGIVER_TIMEOUT=1440
```

This implementation provides a robust, auditable, and scalable foundation for
medical data access control that can be extended with additional cryptographic
protection mechanisms.
