# Enhanced User Management System - Database Schema

## Overview
This document outlines the enhanced database schema for the ParkML user management system, supporting multi-clinic organizations, different caregiver types, patient invitations, and emergency access.

## Enhanced Database Schema

```prisma
// ParkML Enhanced Prisma Schema
// Parkinson's Disease Monitoring Platform Database Schema with Advanced User Management

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Organizations/Clinics table - Multi-clinic support
model Organization {
  id          String   @id @default(cuid())
  name        String
  address     String?
  phone       String?
  email       String?
  settings    String   // JSON stored as string for org-specific settings
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relationships
  users       User[]
  patients    Patient[]
  auditLogs   AuditLog[]

  @@map("organizations")
}

// Enhanced Users table - Authentication and user management
model User {
  id             String       @id @default(cuid())
  email          String       @unique
  passwordHash   String       @map("password_hash")
  name           String
  role           Role
  organizationId String?      @map("organization_id")
  isActive       Boolean      @default(true) @map("is_active")
  lastLoginAt    DateTime?    @map("last_login_at")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  // Relationships
  organization                Organization?                @relation(fields: [organizationId], references: [id])
  patient                     Patient?
  caregiverAssignments        CaregiverAssignment[]
  sentInvitations             Invitation[]                 @relation("InvitationSender")
  receivedInvitations         Invitation[]                 @relation("InvitationReceiver")
  symptomEntries              SymptomEntry[]
  emergencyAccess             EmergencyAccess[]
  auditLogs                   AuditLog[]

  @@map("users")
}

// Enhanced Patients table - Patient information
model Patient {
  id              String   @id @default(cuid())
  userId          String   @unique @map("user_id")
  organizationId  String   @map("organization_id")
  name            String
  dateOfBirth     DateTime @map("date_of_birth")
  diagnosisDate   DateTime @map("diagnosis_date")
  emergencyContact String?  @map("emergency_contact") // JSON stored as string
  privacySettings String   @map("privacy_settings") // JSON stored as string
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relationships
  user                User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization        Organization          @relation(fields: [organizationId], references: [id])
  caregiverAssignments CaregiverAssignment[]
  symptomEntries      SymptomEntry[]
  weeklySummaries     WeeklySummary[]

  @@map("patients")
}

// Enhanced Caregiver Assignment table - Replaces junction tables
model CaregiverAssignment {
  id              String           @id @default(cuid())
  patientId       String           @map("patient_id")
  caregiverId     String           @map("caregiver_id")
  caregiverType   CaregiverType    @map("caregiver_type")
  assignedBy      String           @map("assigned_by") // User ID who made the assignment
  status          AssignmentStatus @default(pending)
  permissions     String           @map("permissions") // JSON stored as string
  startDate       DateTime?        @map("start_date")
  endDate         DateTime?        @map("end_date")
  notes           String?
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  // Relationships
  patient   Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  caregiver User    @relation(fields: [caregiverId], references: [id], onDelete: Cascade)

  @@map("caregiver_assignments")
}

// Invitation system for user management
model Invitation {
  id           String           @id @default(cuid())
  email        String
  role         Role
  invitedBy    String           @map("invited_by")
  invitedUser  String?          @map("invited_user") // Set when user accepts invitation
  patientId    String?          @map("patient_id") // For caregiver invitations
  caregiverType CaregiverType?  @map("caregiver_type")
  status       InvitationStatus @default(pending)
  token        String           @unique // For secure invitation links
  expiresAt    DateTime         @map("expires_at")
  acceptedAt   DateTime?        @map("accepted_at")
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

  // Relationships
  sender       User  @relation("InvitationSender", fields: [invitedBy], references: [id])
  receiver     User? @relation("InvitationReceiver", fields: [invitedUser], references: [id])

  @@map("invitations")
}

// Emergency access system
model EmergencyAccess {
  id          String              @id @default(cuid())
  userId      String              @map("user_id")
  patientId   String              @map("patient_id")
  reason      String              // Emergency reason/justification
  accessType  EmergencyAccessType @map("access_type")
  startTime   DateTime            @map("start_time")
  endTime     DateTime?           @map("end_time")
  isActive    Boolean             @default(true) @map("is_active")
  approvedBy  String?             @map("approved_by") // For future approval workflow
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  // Relationships
  user User @relation(fields: [userId], references: [id])

  @@map("emergency_access")
}

// Audit logging system
model AuditLog {
  id             String     @id @default(cuid())
  userId         String     @map("user_id")
  organizationId String     @map("organization_id")
  action         String     // Action performed (CREATE, UPDATE, DELETE, ACCESS)
  resource       String     // Resource affected (user, patient, symptom_entry, etc.)
  resourceId     String     @map("resource_id")
  details        String     // JSON stored as string with action details
  ipAddress      String?    @map("ip_address")
  userAgent      String?    @map("user_agent")
  createdAt      DateTime   @default(now()) @map("created_at")

  // Relationships
  user         User         @relation(fields: [userId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id])

  @@map("audit_logs")
}

// Symptom entries table - Enhanced with audit support
model SymptomEntry {
  id                   String   @id @default(cuid())
  patientId            String   @map("patient_id")
  entryDate            DateTime @map("entry_date")
  completedBy          String   @map("completed_by")
  motorSymptoms        String   @map("motor_symptoms") // JSON stored as string
  nonMotorSymptoms     String   @map("non_motor_symptoms") // JSON stored as string
  autonomicSymptoms    String   @map("autonomic_symptoms") // JSON stored as string
  dailyActivities      String   @map("daily_activities") // JSON stored as string
  environmentalFactors String   @map("environmental_factors") // JSON stored as string
  safetyIncidents      String   @map("safety_incidents") // JSON stored as string
  notes                String?
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  // Relationships
  patient         Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  completedByUser User    @relation(fields: [completedBy], references: [id])

  @@map("symptom_entries")
}

// Weekly summaries table - Unchanged
model WeeklySummary {
  id                      String              @id @default(cuid())
  patientId               String              @map("patient_id")
  weekStartDate           DateTime            @map("week_start_date")
  weekEndDate             DateTime            @map("week_end_date")
  bestDay                 String?             @map("best_day")
  worstDay                String?             @map("worst_day")
  overallProgression      ProgressionType?    @map("overall_progression")
  newSymptoms             String?             @map("new_symptoms")
  functionalChanges       String              @map("functional_changes") // JSON stored as string
  medicationEffectiveness String             @map("medication_effectiveness") // JSON stored as string
  caregiverConcerns       String              @map("caregiver_concerns") // JSON stored as string
  notes                   String?
  createdAt               DateTime            @default(now()) @map("created_at")
  updatedAt               DateTime            @updatedAt @map("updated_at")

  // Relationships
  patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@map("weekly_summaries")
}

// Enhanced Enums
enum Role {
  super_admin
  clinic_admin
  professional_caregiver
  family_caregiver
  patient
}

enum CaregiverType {
  professional
  family
}

enum AssignmentStatus {
  pending
  active
  inactive
  declined
}

enum InvitationStatus {
  pending
  accepted
  declined
  expired
}

enum EmergencyAccessType {
  medical_emergency
  technical_support
  data_recovery
  audit_investigation
}

enum ProgressionType {
  better
  same
  worse
}
```

## Key Features of Enhanced Schema

### 1. **Multi-Clinic Support**
- `Organization` model for managing multiple clinics
- Users and patients belong to specific organizations
- Organization-specific settings and configurations

### 2. **Enhanced User Roles**
- `super_admin`: Platform-wide administration
- `clinic_admin`: Clinic-specific administration
- `professional_caregiver`: Healthcare staff
- `family_caregiver`: Family members/friends
- `patient`: Data owners

### 3. **Flexible Caregiver Assignment**
- `CaregiverAssignment` model replaces simple junction tables
- Supports different caregiver types (professional/family)
- Assignment status tracking (pending, active, inactive, declined)
- Permission-based access control
- Time-limited assignments

### 4. **Invitation System**
- `Invitation` model for user onboarding
- Secure token-based invitation links
- Role-specific invitations
- Expiration and status tracking

### 5. **Emergency Access**
- `EmergencyAccess` model for audit-compliant emergency data access
- Reason tracking and time limits
- Different emergency access types
- Approval workflow support

### 6. **Comprehensive Audit System**
- `AuditLog` model for all system actions
- User action tracking
- Resource-specific audit trails
- IP address and user agent logging

### 7. **Enhanced Privacy Controls**
- Patient-specific privacy settings
- Granular permission controls in caregiver assignments
- Emergency contact management

## Migration Strategy

1. **Phase 1**: Add new tables (Organization, CaregiverAssignment, Invitation, EmergencyAccess, AuditLog)
2. **Phase 2**: Migrate existing data from junction tables to new CaregiverAssignment model
3. **Phase 3**: Update application code to use new schema
4. **Phase 4**: Remove old junction tables

## Benefits

- **Scalability**: Supports multiple organizations/clinics
- **Security**: Comprehensive audit trails and emergency access controls
- **Flexibility**: Different caregiver types and assignment statuses
- **Compliance**: Full audit logging for healthcare regulations
- **User Experience**: Proper invitation and onboarding workflows
- **Privacy**: Granular permission controls and patient consent management