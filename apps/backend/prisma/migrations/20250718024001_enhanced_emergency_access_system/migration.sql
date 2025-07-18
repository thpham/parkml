-- AlterTable
ALTER TABLE "crypto_audit_entries" ADD COLUMN "emergency_details" TEXT;

-- CreateTable
CREATE TABLE "emergency_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emergency_access_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "approver_role" TEXT NOT NULL,
    "approval_reason" TEXT NOT NULL,
    "digital_signature" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "emergency_approvals_emergency_access_id_fkey" FOREIGN KEY ("emergency_access_id") REFERENCES "emergency_access" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "emergency_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "justification" TEXT,
    "urgency_level" TEXT,
    "organization_id" TEXT,
    "revoked_at" DATETIME,
    "revoked_by" TEXT,
    "revocation_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "emergency_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "emergency_access_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "emergency_access_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_emergency_access" ("access_type", "approved_by", "created_at", "end_time", "id", "is_active", "patient_id", "reason", "start_time", "updated_at", "user_id") SELECT "access_type", "approved_by", "created_at", "end_time", "id", "is_active", "patient_id", "reason", "start_time", "updated_at", "user_id" FROM "emergency_access";
DROP TABLE "emergency_access";
ALTER TABLE "new_emergency_access" RENAME TO "emergency_access";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "emergency_approvals_emergency_access_id_approver_id_key" ON "emergency_approvals"("emergency_access_id", "approver_id");
