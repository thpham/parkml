-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_caregiver_assignments" (
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
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "caregiver_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "caregiver_assignments_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "caregiver_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_caregiver_assignments" ("assigned_by", "caregiver_id", "caregiver_type", "created_at", "end_date", "id", "notes", "patient_id", "permissions", "start_date", "status", "updated_at") SELECT "assigned_by", "caregiver_id", "caregiver_type", "created_at", "end_date", "id", "notes", "patient_id", "permissions", "start_date", "status", "updated_at" FROM "caregiver_assignments";
DROP TABLE "caregiver_assignments";
ALTER TABLE "new_caregiver_assignments" RENAME TO "caregiver_assignments";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
