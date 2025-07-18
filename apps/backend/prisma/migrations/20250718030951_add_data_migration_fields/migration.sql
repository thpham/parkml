-- AlterTable
ALTER TABLE "patients" ADD COLUMN "email" TEXT;
ALTER TABLE "patients" ADD COLUMN "emergency_phone" TEXT;
ALTER TABLE "patients" ADD COLUMN "encryption_metadata" TEXT;

-- CreateTable
CREATE TABLE "data_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "config" TEXT NOT NULL,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "processed_records" INTEGER NOT NULL DEFAULT 0,
    "encrypted_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "last_updated" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_symptom_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "entry_date" DATETIME NOT NULL,
    "completed_by" TEXT NOT NULL,
    "motor_symptoms" TEXT,
    "non_motor_symptoms" TEXT,
    "autonomic_symptoms" TEXT,
    "daily_activities" TEXT,
    "medication_data" TEXT,
    "environmental_factors" TEXT,
    "safety_incidents" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "is_encrypted" BOOLEAN DEFAULT false,
    "encryption_policy" TEXT,
    "encryption_metadata" TEXT,
    CONSTRAINT "symptom_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "symptom_entries_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_symptom_entries" ("autonomic_symptoms", "completed_by", "created_at", "daily_activities", "encryption_policy", "entry_date", "environmental_factors", "id", "is_encrypted", "motor_symptoms", "non_motor_symptoms", "notes", "patient_id", "safety_incidents", "updated_at") SELECT "autonomic_symptoms", "completed_by", "created_at", "daily_activities", "encryption_policy", "entry_date", "environmental_factors", "id", "is_encrypted", "motor_symptoms", "non_motor_symptoms", "notes", "patient_id", "safety_incidents", "updated_at" FROM "symptom_entries";
DROP TABLE "symptom_entries";
ALTER TABLE "new_symptom_entries" RENAME TO "symptom_entries";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "organization_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" DATETIME,
    "encryption_metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("created_at", "email", "id", "is_active", "last_login_at", "name", "organization_id", "password_hash", "role", "updated_at") SELECT "created_at", "email", "id", "is_active", "last_login_at", "name", "organization_id", "password_hash", "role", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
