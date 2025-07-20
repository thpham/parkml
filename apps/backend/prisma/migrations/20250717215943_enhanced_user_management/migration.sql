/*
  Migration: Enhanced User Management System

  This migration adds:
  - Organization support for multi-clinic functionality
  - Enhanced caregiver assignment system
  - Invitation system for user management
  - Emergency access system
  - Comprehensive audit logging

  Migration handles existing data by creating a default organization.
*/

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- Create default organization for existing data
INSERT INTO "organizations" ("id", "name", "address", "email", "settings", "is_active", "created_at", "updated_at")
VALUES ('default_org', 'Default Clinic', 'Default Address', 'admin@parkml.org', '{}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE "caregiver_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "caregiver_type" TEXT NOT NULL,
    "assigned_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "caregiver_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "caregiver_assignments_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "invited_user" TEXT,
    "patient_id" TEXT,
    "caregiver_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "accepted_at" DATETIME,
    "message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invitations_invited_user_fkey" FOREIGN KEY ("invited_user") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "emergency_access" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "access_type" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "approved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "emergency_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_patients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "diagnosis_date" DATETIME NOT NULL,
    "emergency_contact" TEXT DEFAULT '{}',
    "privacy_settings" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_patients" ("created_at", "date_of_birth", "diagnosis_date", "id", "name", "updated_at", "user_id", "organization_id") SELECT "created_at", "date_of_birth", "diagnosis_date", "id", "name", "updated_at", "user_id", 'default_org' FROM "patients";
DROP TABLE "patients";
ALTER TABLE "new_patients" RENAME TO "patients";
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("created_at", "email", "id", "name", "password_hash", "role", "updated_at", "organization_id") SELECT "created_at", "email", "id", "name", "password_hash", "role", "updated_at", 'default_org' FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
