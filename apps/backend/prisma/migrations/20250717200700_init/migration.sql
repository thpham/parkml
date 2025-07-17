-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "diagnosis_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patient_caregivers" (
    "patient_id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("patient_id", "caregiver_id"),
    CONSTRAINT "patient_caregivers_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_caregivers_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patient_healthcare_providers" (
    "patient_id" TEXT NOT NULL,
    "healthcare_provider_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("patient_id", "healthcare_provider_id"),
    CONSTRAINT "patient_healthcare_providers_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_healthcare_providers_healthcare_provider_id_fkey" FOREIGN KEY ("healthcare_provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "symptom_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "entry_date" DATETIME NOT NULL,
    "completed_by" TEXT NOT NULL,
    "motor_symptoms" TEXT NOT NULL,
    "non_motor_symptoms" TEXT NOT NULL,
    "autonomic_symptoms" TEXT NOT NULL,
    "daily_activities" TEXT NOT NULL,
    "environmental_factors" TEXT NOT NULL,
    "safety_incidents" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "symptom_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "symptom_entries_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weekly_summaries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "week_start_date" DATETIME NOT NULL,
    "week_end_date" DATETIME NOT NULL,
    "best_day" TEXT,
    "worst_day" TEXT,
    "overall_progression" TEXT,
    "new_symptoms" TEXT,
    "functional_changes" TEXT NOT NULL,
    "medication_effectiveness" TEXT NOT NULL,
    "caregiver_concerns" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "weekly_summaries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");
