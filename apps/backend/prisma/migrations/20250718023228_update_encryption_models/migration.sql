-- AlterTable
ALTER TABLE "symptom_entries" ADD COLUMN "encryption_policy" TEXT;
ALTER TABLE "symptom_entries" ADD COLUMN "is_encrypted" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "encryption_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "key_type" TEXT NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "public_key" TEXT,
    "attributes" TEXT NOT NULL,
    "derivation_path" TEXT,
    "expires_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "encryption_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "encryption_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "proxy_re_encryption_delegations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_user_id" TEXT NOT NULL,
    "caregiver_user_id" TEXT NOT NULL,
    "re_encryption_key" TEXT NOT NULL,
    "data_categories" TEXT NOT NULL,
    "access_level" TEXT NOT NULL,
    "reason" TEXT,
    "expires_at" DATETIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" DATETIME,
    CONSTRAINT "proxy_re_encryption_delegations_patient_user_id_fkey" FOREIGN KEY ("patient_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proxy_re_encryption_delegations_caregiver_user_id_fkey" FOREIGN KEY ("caregiver_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "homomorphic_computations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "computation_type" TEXT NOT NULL,
    "organization_id" TEXT,
    "data_categories" TEXT NOT NULL,
    "cohort_criteria" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "encrypted_result" TEXT,
    "error_message" TEXT,
    "computed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "homomorphic_computations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "crypto_audit_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "data_categories" TEXT NOT NULL,
    "access_level" TEXT NOT NULL,
    "encryption_context" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "cryptographic_proof" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_emergency_access" (
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
    CONSTRAINT "emergency_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "emergency_access_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_emergency_access" ("access_type", "approved_by", "created_at", "end_time", "id", "is_active", "patient_id", "reason", "start_time", "updated_at", "user_id") SELECT "access_type", "approved_by", "created_at", "end_time", "id", "is_active", "patient_id", "reason", "start_time", "updated_at", "user_id" FROM "emergency_access";
DROP TABLE "emergency_access";
ALTER TABLE "new_emergency_access" RENAME TO "emergency_access";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
