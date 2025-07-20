# Emergency Access System Documentation

## Overview

The Emergency Access System provides a secure, auditable mechanism for
healthcare professionals to access patient data during emergency situations when
normal access permissions are insufficient. This system ensures patient care is
never compromised while maintaining strict security controls and comprehensive
audit trails.

## Features

### Core Functionality

- **Request Emergency Access**: Healthcare professionals can request temporary
  access to patient data
- **Automatic Expiration**: Access automatically expires after a specified
  duration
- **Comprehensive Auditing**: Every emergency access request, use, and
  expiration is fully logged
- **Role-Based Permissions**: Different user roles have different emergency
  access capabilities
- **Organization Boundaries**: Access is restricted by organization membership
- **Real-time Cleanup**: Automated service to clean up expired access records

### Enhanced Cryptographic Features

- **Multi-Signature Approval Workflows**: Configurable approval requirements
  based on urgency level
- **Cryptographic Emergency Keys**: Time-bounded cryptographic keys for secure
  emergency access
- **Digital Signature Authentication**: Cryptographic verification of approvals
- **Enhanced Urgency Levels**: Critical, high, and medium urgency with different
  approval thresholds
- **Tamper-Proof Audit Trails**: Cryptographically signed audit entries for
  compliance

### Security Features

- **Justification Required**: Every emergency access request must include a
  detailed reason
- **Time-Limited Access**: Access is automatically granted for a limited time
  period
- **Audit Trails**: Complete audit logging of all emergency access activities
- **Automatic Revocation**: Expired access is automatically revoked
- **Manual Revocation**: Administrators can manually revoke emergency access
- **Access Monitoring**: Real-time monitoring of emergency access usage

## API Endpoints

### Emergency Access Management

#### POST `/api/emergency-access/request`

Request emergency access to patient data.

**Authentication**: Required **Authorization**: `professional_caregiver`,
`clinic_admin`, `super_admin`

**Request Body**:

```json
{
  "patientId": "patient_123",
  "reason": "Patient unconscious in ER, need immediate access to medical history",
  "accessType": "medical_emergency", // medical_emergency, technical_support, data_recovery, audit_investigation
  "duration": 24 // hours, default: 24
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "emergency_access_123",
    "patientId": "patient_123",
    "reason": "Patient unconscious in ER, need immediate access to medical history",
    "accessType": "medical_emergency",
    "startTime": "2024-01-15T14:30:00Z",
    "endTime": "2024-01-16T14:30:00Z",
    "isActive": true,
    "user": {
      "id": "user_123",
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@hospital.com",
      "role": "professional_caregiver"
    },
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

#### GET `/api/emergency-access`

Get emergency access records (with pagination and filtering).

**Authentication**: Required **Authorization**: `clinic_admin`, `super_admin`

**Query Parameters**:

- `page`: Page number (default: 1)
- `limit`: Records per page (default: 50)
- `patientId`: Filter by patient ID
- `userId`: Filter by user ID
- `isActive`: Filter by active status (true/false)
- `startDate`: Filter by creation date (ISO 8601)
- `endDate`: Filter by creation date (ISO 8601)

#### GET `/api/emergency-access/:id`

Get emergency access record by ID.

**Authentication**: Required **Authorization**: `clinic_admin`, `super_admin`

#### POST `/api/emergency-access/:id/revoke`

Manually revoke emergency access.

**Authentication**: Required **Authorization**: `clinic_admin`, `super_admin`

**Request Body**:

```json
{
  "reason": "Emergency resolved, access no longer needed"
}
```

#### GET `/api/emergency-access/check/:patientId`

Check if current user has active emergency access to patient.

**Authentication**: Required **Authorization**: Any authenticated user

**Response**:

```json
{
  "success": true,
  "data": {
    "hasAccess": true,
    "access": {
      "id": "emergency_access_123",
      "reason": "Patient unconscious in ER",
      "accessType": "medical_emergency",
      "startTime": "2024-01-15T14:30:00Z",
      "endTime": "2024-01-16T14:30:00Z",
      "createdAt": "2024-01-15T14:30:00Z"
    }
  }
}
```

### Statistics and Management

#### GET `/api/emergency-access/stats/summary`

Get emergency access statistics summary.

**Authentication**: Required **Authorization**: `clinic_admin`, `super_admin`

**Response**:

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalAccess": 145,
      "activeAccess": 3,
      "expiredAccess": 142
    },
    "accessByType": {
      "medical_emergency": 120,
      "technical_support": 15,
      "data_recovery": 8,
      "audit_investigation": 2
    },
    "topUsers": [
      {
        "user": {
          "id": "user_123",
          "name": "Dr. Sarah Johnson",
          "email": "sarah.johnson@hospital.com",
          "role": "professional_caregiver"
        },
        "count": 12
      }
    ]
  }
}
```

#### GET `/api/emergency-access/stats/system`

Get system-wide emergency access statistics.

**Authentication**: Required **Authorization**: `clinic_admin`, `super_admin`

#### POST `/api/emergency-access/cleanup`

Manually trigger cleanup of expired emergency access records.

**Authentication**: Required **Authorization**: `clinic_admin`, `super_admin`

## Emergency Access Types

### Medical Emergency

- **Code**: `medical_emergency`
- **Description**: Immediate patient care situations
- **Typical Duration**: 24 hours
- **Common Scenarios**: Unconscious patients, urgent medical decisions

### Technical Support

- **Code**: `technical_support`
- **Description**: System troubleshooting and technical issues
- **Typical Duration**: 4 hours
- **Common Scenarios**: Data recovery, system debugging

### Data Recovery

- **Code**: `data_recovery`
- **Description**: Recovery of lost or corrupted patient data
- **Typical Duration**: 8 hours
- **Common Scenarios**: Database issues, backup restoration

### Audit Investigation

- **Code**: `audit_investigation`
- **Description**: Compliance and audit-related access
- **Typical Duration**: 48 hours
- **Common Scenarios**: Regulatory investigations, compliance audits

## Authorization Model

### Access Permissions by Role

#### Super Admin

- Can request emergency access to any patient
- Can view all emergency access records
- Can revoke any emergency access
- Can access system-wide statistics

#### Clinic Admin

- Can request emergency access to patients in their organization
- Can view emergency access records for their organization
- Can revoke emergency access within their organization
- Can access organization-specific statistics

#### Professional Caregiver

- Can request emergency access to patients in their organization
- Can view their own emergency access records
- Cannot revoke emergency access
- Cannot access statistics

#### Family Caregiver

- Cannot request emergency access
- Cannot view emergency access records
- Cannot revoke emergency access
- Cannot access statistics

#### Patient

- Cannot request emergency access
- Cannot view emergency access records
- Cannot revoke emergency access
- Cannot access statistics

## Integration with Patient Data Access

The emergency access system is integrated with the patient data access
authorization middleware. When a user attempts to access patient data and normal
authorization fails, the system automatically checks for active emergency
access.

### Access Flow

1. User requests patient data
2. Normal authorization check (role-based, assignment-based)
3. If normal authorization fails, check for emergency access
4. If emergency access exists and is active, grant access
5. Add emergency access headers to response
6. Log emergency access usage

### Emergency Access Headers

When emergency access is used, the following headers are added to the response:

- `X-Emergency-Access: true`
- `X-Emergency-Reason: [reason]`
- `X-Emergency-Expires: [ISO 8601 datetime]`

## Audit Logging

All emergency access activities are comprehensively logged:

### Actions Logged

- `REQUEST_EMERGENCY_ACCESS`: Emergency access requested
- `REVOKE_EMERGENCY_ACCESS`: Emergency access manually revoked
- `EXPIRE_EMERGENCY_ACCESS`: Emergency access automatically expired
- `ACCESS_PATIENT_DATA`: Patient data accessed via emergency access

### Audit Log Fields

- `userId`: User who performed the action
- `organizationId`: Organization context
- `action`: Action performed
- `resource`: Resource affected (`emergency_access`)
- `resourceId`: Emergency access record ID
- `details`: JSON with additional context
- `ipAddress`: Client IP address
- `userAgent`: Client user agent
- `createdAt`: Timestamp of action

## Automated Cleanup Service

The system includes an automated cleanup service that:

### Cleanup Tasks

- **Expired Access Cleanup**: Runs every 5 minutes

  - Marks expired emergency access as inactive
  - Creates audit log entries for expired access
  - Provides cleanup statistics

- **Expiration Alerts**: Runs every 30 minutes
  - Identifies access that will expire soon (default: 2 hours)
  - Logs warnings for soon-to-expire access
  - Can be extended to send email notifications

### Service Initialization

The cleanup service is automatically initialized when the server starts:

- Immediate cleanup run on startup
- Scheduled cleanup every 5 minutes
- Scheduled expiration alerts every 30 minutes

## Security Considerations

### Access Control

- Emergency access is limited to healthcare professionals
- Access is restricted by organization boundaries
- All access requires justification
- Access is time-limited and automatically expires

### Audit Requirements

- Complete audit trail of all emergency access activities
- Tamper-proof audit logs with timestamps
- Real-time monitoring of emergency access usage
- Automatic logging of access expiration

### Compliance

- Supports HIPAA compliance requirements
- Provides audit trails for regulatory reviews
- Maintains principle of least privilege
- Implements emergency access safeguards

## Monitoring and Alerting

### Real-time Monitoring

- Emergency access usage is logged in real-time
- Console logging for all emergency access activities
- HTTP headers indicate emergency access usage

### Alerting Capabilities

- Alerts for soon-to-expire access
- Logging of unusual access patterns
- Integration points for external monitoring systems

## Configuration

### Environment Variables

- `JWT_SECRET`: Secret for JWT token validation
- `DATABASE_URL`: Database connection string

### Default Settings

- Default access duration: 24 hours
- Cleanup interval: 5 minutes
- Alert threshold: 2 hours before expiration
- Alert interval: 30 minutes

## Best Practices

### For Healthcare Professionals

1. Only request emergency access when absolutely necessary
2. Provide detailed, specific reasons for access requests
3. Use minimum necessary access duration
4. Document patient care context in reason field

### For Administrators

1. Regularly review emergency access logs
2. Monitor for unusual access patterns
3. Set up automated alerts for high-frequency usage
4. Maintain organization-specific access policies

### For System Administrators

1. Monitor cleanup service performance
2. Set up external monitoring for emergency access APIs
3. Regularly review audit logs for compliance
4. Maintain backup and recovery procedures for audit data

## Testing

### Unit Tests

- Emergency access request validation
- Authorization logic testing
- Cleanup service functionality
- Audit logging verification

### Integration Tests

- End-to-end emergency access flow
- Patient data access with emergency access
- Cleanup service integration
- Audit log integration

### Security Tests

- Authorization boundary testing
- Access control validation
- Audit trail verification
- Time-based access expiration

## Deployment

### Database Requirements

- Emergency access tables (already in schema)
- Audit log tables (already in schema)
- Proper indexing for performance

### API Deployment

- Emergency access routes registration
- Cleanup service initialization
- Monitoring endpoint setup
- Health check integration

### Monitoring Setup

- Log aggregation for emergency access events
- Alerting for system failures
- Performance monitoring for cleanup service
- Compliance reporting setup

## Enhanced Emergency Access System

For comprehensive cryptographic emergency access features including
multi-signature approval workflows, cryptographic keys, and enhanced security
measures, see:
**[Cryptographic Emergency Access System Documentation](./CRYPTOGRAPHIC_EMERGENCY_ACCESS.md)**

## System Monitoring and Performance

For system performance monitoring, security auditing, and optimization
recommendations, see:
**[Performance Audit System Documentation](./PERFORMANCE_AUDIT_SYSTEM.md)**

## Future Enhancements

### Planned Features

- Hardware Security Module (HSM) integration for key management
- Mobile app integration for emergency access approvals
- Advanced analytics and machine learning for anomaly detection
- Integration with hospital emergency systems
- Real-time notification systems for emergency access events

### Potential Improvements

- Risk-based access duration recommendations
- Biometric authentication for emergency approvals
- Blockchain-based audit trails for enhanced security
- Integration with external emergency response systems
- Advanced threat detection and response

## Conclusion

The Emergency Access System provides a comprehensive, secure, and auditable
solution for emergency patient data access. It balances the critical need for
emergency medical care with strict security and compliance requirements,
ensuring that patient data remains protected while enabling life-saving medical
interventions.

---

_This documentation is maintained as part of the ParkML system documentation.
For updates and additional information, please refer to the system documentation
repository._
