# User Management Workflows

## Overview

This document outlines the complete user management workflows for the enhanced
ParkML system, including user roles, invitation processes, assignment workflows,
emergency access procedures, and the dual consent system for caregiver
assignments.

## 🆕 Latest Updates

- **Dual Consent Workflow**: Implemented two-step consent process (caregiver
  acceptance + patient approval)
- **Role-Based Admin Dashboards**: Separate dashboards for super admins vs
  clinic admins
- **Organization Permissions**: Clinic admins restricted to their organization
  only
- **Patient Consent Dashboard**: New UI for patients to manage caregiver consent
  requests

## 🎯 User Flow Diagrams

### 1. **Super Admin Workflow**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │System Dashboard │───▶│ Manage All      │───▶│ System Reports  │         │
│  │   (Overview)    │    │ Organizations   │    │  (All Clinics)  │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Emergency Access │    │ Manage All Users │   │ System Analytics│         │
│  │ (System-wide)   │    │ (All Orgs)      │    │ (All Metrics)   │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Audit All Access│    │ System Settings │    │ Monitor All     │         │
│  │ (Compliance)    │    │ & Configuration │    │ Assignments     │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. **Clinic Admin Workflow**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLINIC ADMIN WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │Clinic Dashboard │───▶│ Manage Org      │───▶│ Org Reports     │         │
│  │   (Org Only)    │    │ Users Only      │    │ (Org Patients)  │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Emergency Access │    │ Invite Professional │ Org Analytics   │         │
│  │ (Org Patients)  │    │ Caregivers (Org) │    │ (Org Metrics)   │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Access Patient  │    │ Assign Caregivers │   │ Monitor Org     │         │
│  │ Data (Emergency)│    │ (Dual Consent)  │    │ Assignments     │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                   │                                         │
│                                   ▼                                         │
│                          ┌─────────────────┐                               │
│                          │ Caregiver Accept│                               │
│                          │ + Patient Consent│                              │
│                          └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. **Professional Caregiver Workflow**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROFESSIONAL CAREGIVER WORKFLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │Accept Assignment│───▶│ Accept/Decline  │───▶│ View Assigned   │         │
│  │ Notification    │    │ in Dashboard    │    │   Patients      │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                   │                       │                 │
│                                   ▼                       ▼                 │
│                          ┌─────────────────┐    ┌─────────────────┐         │
│                          │ Generate Reports│    │ Set Medical     │         │
│                          │ for Patients    │    │   Reminders     │         │
│                          └─────────────────┘    └─────────────────┘         │
│                                   │                       │                 │
│                                   ▼                       ▼                 │
│                          ┌─────────────────┐    ┌─────────────────┐         │
│                          │ Communicate with│    │ Request Family  │         │
│                          │ Clinic Admin    │    │ Caregiver Info  │         │
│                          └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. **Family Caregiver Workflow**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FAMILY CAREGIVER WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │Accept Invitation│───▶│ Patient Consent │───▶│  View Patient   │         │
│  │  from Patient   │    │   Required      │    │     Data        │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                   │                       │                 │
│                                   ▼                       ▼                 │
│                          ┌─────────────────┐    ┌─────────────────┐         │
│                          │ Help with       │    │ Receive Status  │         │
│                          │ Symptom Entry   │    │ Notifications   │         │
│                          └─────────────────┘    └─────────────────┘         │
│                                   │                       │                 │
│                                   ▼                       ▼                 │
│                          ┌─────────────────┐    ┌─────────────────┐         │
│                          │ Generate Basic  │    │ Communicate with│         │
│                          │    Reports      │    │ Professional    │         │
│                          └─────────────────┘    │   Caregivers    │         │
│                                                 └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5. **Patient Workflow**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PATIENT WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  Track Symptoms │───▶│ Consent Dashboard│───▶│ Manage Privacy  │         │
│  │   (Primary)     │    │ (Notifications) │    │   Settings      │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Invite Family   │    │ Accept/Decline  │    │ Control Data    │         │
│  │  Caregivers     │    │ Caregiver       │    │   Sharing       │         │
│  │                 │    │ Assignments     │    │ Permissions     │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ View Historical │    │ Export Personal │    │ Manage Account  │         │
│  │     Data        │    │      Data       │    │   Settings      │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🆕 Dual Consent Assignment Workflow

The system now implements a comprehensive two-step consent process for all
caregiver assignments:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DUAL CONSENT WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ADMIN CREATES ASSIGNMENT                                               │
│     ┌─────────────────┐                                                    │
│     │ Status: PENDING │ ← Initial state                                    │
│     │ Consent: FALSE  │                                                    │
│     └─────────────────┘                                                    │
│             │                                                              │
│             ▼                                                              │
│  2. CAREGIVER RESPONSE (Step 1)                                           │
│     ┌─────────────────┐    ┌─────────────────┐                            │
│     │ Accept Assignment│───▶│ Status: ACTIVE  │                            │
│     │ in Dashboard    │    │ Consent: FALSE  │ ← Still needs patient consent│
│     └─────────────────┘    └─────────────────┘                            │
│             │                       │                                      │
│             ▼                       ▼                                      │
│  3. PATIENT NOTIFICATION                                                   │
│     ┌─────────────────┐    ┌─────────────────┐                            │
│     │ Real-time Badge │    │ Consent Dashboard│                            │
│     │ Notification    │    │ Shows Details   │                            │
│     └─────────────────┘    └─────────────────┘                            │
│             │                       │                                      │
│             ▼                       ▼                                      │
│  4. PATIENT CONSENT (Step 2)                                              │
│     ┌─────────────────┐    ┌─────────────────┐                            │
│     │ Approve/Decline │───▶│ Status: ACTIVE  │                            │
│     │ Assignment      │    │ Consent: TRUE   │ ← Fully active assignment  │
│     └─────────────────┘    └─────────────────┘                            │
│                                     │                                      │
│                                     ▼                                      │
│  5. FULL ACCESS GRANTED                                                    │
│     ┌─────────────────────────────────────┐                               │
│     │ Caregiver can now access patient    │                               │
│     │ data with approved permissions      │                               │
│     └─────────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Features

- **Real-time Notifications**: Both caregivers and patients see notification
  badges
- **Detailed Review**: Patients can see full caregiver information before
  approving
- **Permission Control**: Patients can approve with specific permission levels
- **Order-Independent Consent**: Patients can provide consent regardless of
  caregiver response order
- **Audit Trail**: All consent decisions are logged with timestamps
- **Revocation Support**: Patients can revoke consent at any time

### Edge Case Handling

The system now properly handles out-of-order consent responses:

- **Scenario 1**: Admin creates → Caregiver accepts → Patient consents ✅
- **Scenario 2**: Admin creates → Patient consents → Caregiver accepts ✅
- **Scenario 3**: Admin creates → Patient declines → Assignment blocked ✅

The consent API automatically detects assignments that need patient consent
regardless of current status (pending or active).

## 🔄 Detailed Workflow Processes

### A. **Professional Caregiver Invitation Process**

```
1. CLINIC ADMIN ACTION
   ├─ Search for existing user by email
   ├─ Create invitation record
   ├─ Send secure invitation email
   └─ Set invitation expiration (7 days)

2. INVITATION EMAIL SENT
   ├─ Secure token link
   ├─ Role information (professional_caregiver)
   ├─ Clinic information
   └─ Expiration date

3. CAREGIVER RESPONSE
   ├─ Click invitation link
   ├─ If existing user: Login and accept
   ├─ If new user: Register with role pre-set
   └─ Invitation status → "accepted"

4. PATIENT ASSIGNMENT
   ├─ Admin assigns caregiver to specific patients
   ├─ Patient receives notification
   ├─ Patient can accept/decline assignment
   └─ If accepted: Caregiver gets access
```

### B. **Family Caregiver Invitation Process**

```
1. PATIENT ACTION
   ├─ Enter family member's email
   ├─ Select caregiver type: "family"
   ├─ Set permission level (view/edit/notify)
   └─ Create invitation record

2. INVITATION EMAIL SENT
   ├─ Personal message from patient
   ├─ Role information (family_caregiver)
   ├─ Relationship to patient
   └─ Expiration date (14 days)

3. FAMILY MEMBER RESPONSE
   ├─ Click invitation link
   ├─ Register as new user
   ├─ Role: family_caregiver
   └─ Automatic assignment to patient (pre-approved)

4. IMMEDIATE ACCESS
   ├─ No additional approval needed
   ├─ Access based on patient's permission settings
   ├─ Patient can modify permissions anytime
   └─ Patient can revoke access anytime
```

### C. **Emergency Access Process**

```
1. EMERGENCY SITUATION
   ├─ Clinic admin identifies emergency
   ├─ Selects emergency access type
   ├─ Provides detailed justification
   └─ Sets access duration (max 24 hours)

2. EMERGENCY ACCESS CREATION
   ├─ Creates EmergencyAccess record
   ├─ Logs in AuditLog with details
   ├─ Notifies patient (if possible)
   └─ Starts access timer

3. EMERGENCY DATA ACCESS
   ├─ Admin can access patient data
   ├─ All actions logged in detail
   ├─ Access is time-limited
   └─ Patient notified of access

4. ACCESS TERMINATION
   ├─ Automatic expiration after time limit
   ├─ Manual termination by admin
   ├─ Final audit log entry
   └─ Patient notification of termination
```

### D. **Patient Consent Management**

```
1. ASSIGNMENT NOTIFICATION
   ├─ Patient receives notification
   ├─ Shows caregiver information
   ├─ Displays proposed permissions
   └─ Provides accept/decline options

2. PATIENT REVIEW
   ├─ Patient reviews caregiver profile
   ├─ Checks permission levels
   ├─ Can modify permissions before accepting
   └─ Makes decision

3. CONSENT RESPONSE
   ├─ Accept: Assignment status → "active"
   ├─ Decline: Assignment status → "declined"
   ├─ Modify: Request permission changes
   └─ Notification sent to assigning party

4. ONGOING CONSENT MANAGEMENT
   ├─ Patient can modify permissions anytime
   ├─ Patient can revoke access anytime
   ├─ Changes logged in audit trail
   └─ All parties notified of changes
```

## 🔒 Security & Privacy Controls

### **Data Access Matrix**

| Role                   | Patient Data        | Other Users          | Organization Management | System Admin         | Emergency Access |
| ---------------------- | ------------------- | -------------------- | ----------------------- | -------------------- | ---------------- |
| Super Admin            | ❌ No Direct Access | ✅ All Users         | ✅ All Organizations    | ✅ Full System       | ✅ With Audit    |
| Clinic Admin           | ❌ No Direct Access | ✅ Organization Only | ❌ No Access            | ✅ Organization Only | ✅ With Audit    |
| Professional Caregiver | ✅ Assigned Only    | ❌ No Access         | ❌ No Access            | ❌ No Access         | ❌ No Access     |
| Family Caregiver       | ✅ Assigned Only    | ❌ No Access         | ❌ No Access            | ❌ No Access         | ❌ No Access     |
| Patient                | ✅ Own Data Only    | ❌ No Access         | ❌ No Access            | ❌ No Access         | ❌ No Access     |

### **Admin Dashboard Features**

| Feature                      | Super Admin             | Clinic Admin               |
| ---------------------------- | ----------------------- | -------------------------- |
| **Dashboard Title**          | "System Administration" | "Clinic Administration"    |
| **Organizations Management** | ✅ Full Access          | ❌ Hidden                  |
| **User Management**          | ✅ All Users            | ✅ Organization Users Only |
| **Patient Analytics**        | ✅ System-wide          | ✅ Organization Only       |
| **Assignment Management**    | ✅ All Assignments      | ✅ Organization Only       |
| **Emergency Access**         | ✅ System-wide          | ✅ Organization Only       |
| **Statistics Scope**         | All organizations       | Single organization        |

### **Permission Levels**

**Family Caregiver Permissions:**

- `view_symptoms`: Can view symptom entries
- `edit_symptoms`: Can help with symptom entry
- `view_reports`: Can generate basic reports
- `receive_notifications`: Gets status updates
- `communicate_professional`: Can message professional caregivers

**Professional Caregiver Permissions:**

- `view_all_symptoms`: Full symptom data access
- `edit_symptoms`: Can help with symptom entry
- `generate_reports`: Can create professional reports
- `set_reminders`: Can set medical reminders
- `communicate_all`: Can message all assigned caregivers
- `emergency_contact`: Can be contacted in emergencies

## 📊 Audit & Compliance

### **Audit Events Tracked**

- User login/logout
- Data access (patient records, symptom entries)
- Permission changes
- User assignments/unassignments
- Emergency access usage
- Data export/download
- Password changes
- Account deactivation

### **Compliance Features**

- **HIPAA Compliance**: Full audit trails for all data access
- **GDPR Compliance**: Data export and deletion capabilities
- **Emergency Access**: Properly documented and time-limited
- **Consent Management**: Patient consent tracking and management
- **Data Minimization**: Role-based access restrictions

## 🚀 Implementation Status

### **✅ Phase 1: Core Foundation** (COMPLETED)

1. ✅ Database schema migration with enhanced user management
2. ✅ Enhanced user authentication with JWT and organization claims
3. ✅ Comprehensive role management (5 roles)
4. ✅ Invitation system foundation

### **✅ Phase 2: Assignment System** (COMPLETED)

1. ✅ Caregiver assignment workflow with dual consent
2. ✅ Patient consent management dashboard
3. ✅ Comprehensive permission system
4. ✅ Full audit logging implementation

### **✅ Phase 3: Multi-Clinic Support** (COMPLETED)

1. ✅ Organization management (super admin only)
2. ✅ Clinic-specific user management (clinic admin restrictions)
3. ✅ Multi-tenant data isolation by organization
4. ✅ Role-based admin dashboards

### **✅ Phase 4: Advanced Features** (COMPLETED)

1. ✅ Emergency access system with automated cleanup
2. ✅ Comprehensive audit system with detailed logging
3. ✅ Advanced permission controls with dual consent
4. ✅ Enhanced user experience with real-time notifications

### **🆕 Current Features (Latest Implementation)**

1. ✅ **Dual Consent Workflow**: Two-step approval process
2. ✅ **Real-time Notifications**: Badge notifications for pending actions
3. ✅ **Role-Based Dashboards**: Separate admin dashboards based on role
4. ✅ **Organization Restrictions**: Clinic admins limited to their organization
5. ✅ **Patient Consent Dashboard**: Comprehensive consent management interface
6. ✅ **Caregiver Dashboard**: Assignment acceptance and management
7. ✅ **Permission-Based UI**: UI elements shown/hidden based on role
   permissions
8. ✅ **Edge Case Resolution**: Fixed out-of-order consent workflow bug

### **🔧 Technical Implementation Details**

#### **Dual Consent Edge Case Fix**

**Problem Identified**: The original consent API only showed assignments with
`status: 'pending'` but caregiver acceptance changed status to `'active'`,
creating a logical contradiction where patients couldn't consent if caregivers
accepted first.

**Solution Implemented**:

- **Consent Query Fix** (`/api/consent/pending`): Now includes both `'pending'`
  and `'active'` assignments that need patient consent
- **Approval Logic Fix** (`/api/consent/approve/:id`): Now accepts consent for
  both pending and active assignments
- **Decline Logic Fix** (`/api/consent/decline/:id`): Now allows declining both
  pending and active assignments

**Code Changes**:

```typescript
// Before: Only pending assignments
status: 'pending',
consentGiven: false

// After: Both pending and active assignments needing consent
status: { in: ['pending', 'active'] },
consentGiven: false
```

This ensures the dual consent workflow is truly order-independent and robust.

This comprehensive workflow system ensures proper user management, maintains
patient privacy, supports healthcare compliance requirements, and provides the
flexibility needed for different caregiver types and multi-clinic operations.
