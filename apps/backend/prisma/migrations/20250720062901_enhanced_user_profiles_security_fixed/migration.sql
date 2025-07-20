-- CreateTable
CREATE TABLE "performance_audits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audit_id" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overall_score" INTEGER NOT NULL,
    "metrics" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "security_findings" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "two_factor_auth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "backup_codes" TEXT,
    "recovery_codes_used" TEXT NOT NULL DEFAULT '[]',
    "qr_code_url" TEXT,
    "setup_completed_at" DATETIME,
    "last_used_at" DATETIME,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "two_factor_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "passkeys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_type" TEXT,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "is_backup_eligible" BOOLEAN NOT NULL DEFAULT false,
    "is_backup_device" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "security_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL DEFAULT 'low',
    "details" TEXT NOT NULL DEFAULT '{}',
    "session_id" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "device_fingerprint" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failure_reason" TEXT,
    "attempted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "date_format" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "time_format" TEXT NOT NULL DEFAULT '12h',
    "accessibility_high_contrast" BOOLEAN NOT NULL DEFAULT false,
    "accessibility_large_text" BOOLEAN NOT NULL DEFAULT false,
    "accessibility_screen_reader" BOOLEAN NOT NULL DEFAULT false,
    "accessibility_keyboard_navigation" BOOLEAN NOT NULL DEFAULT false,
    "privacy_analytics" BOOLEAN NOT NULL DEFAULT true,
    "privacy_marketing" BOOLEAN NOT NULL DEFAULT false,
    "privacy_data_sharing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "email_security_alerts" BOOLEAN NOT NULL DEFAULT true,
    "email_login_notifications" BOOLEAN NOT NULL DEFAULT true,
    "email_password_changes" BOOLEAN NOT NULL DEFAULT true,
    "email_account_changes" BOOLEAN NOT NULL DEFAULT true,
    "email_weekly_summary" BOOLEAN NOT NULL DEFAULT true,
    "email_system_updates" BOOLEAN NOT NULL DEFAULT false,
    "sms_security_alerts" BOOLEAN NOT NULL DEFAULT false,
    "sms_login_notifications" BOOLEAN NOT NULL DEFAULT false,
    "sms_emergency_alerts" BOOLEAN NOT NULL DEFAULT false,
    "push_security_alerts" BOOLEAN NOT NULL DEFAULT true,
    "push_login_notifications" BOOLEAN NOT NULL DEFAULT false,
    "push_symptom_reminders" BOOLEAN NOT NULL DEFAULT true,
    "push_medication_reminders" BOOLEAN NOT NULL DEFAULT true,
    "in_app_security_alerts" BOOLEAN NOT NULL DEFAULT true,
    "in_app_system_notifications" BOOLEAN NOT NULL DEFAULT true,
    "frequency_daily_digest" BOOLEAN NOT NULL DEFAULT false,
    "frequency_weekly_summary" BOOLEAN NOT NULL DEFAULT true,
    "frequency_monthly_report" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "phone" TEXT,
    "date_of_birth" DATETIME,
    "address_street" TEXT,
    "address_city" TEXT,
    "address_postal_code" TEXT,
    "address_country" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relationship" TEXT,
    "medical_allergies" TEXT,
    "medical_medications" TEXT,
    "medical_emergency_notes" TEXT,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "notification_settings" TEXT NOT NULL DEFAULT '{}',
    "two_factor_secret" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_backup_codes" TEXT,
    "password_changed_at" DATETIME,
    "security_score" INTEGER NOT NULL DEFAULT 65,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("created_at", "email", "encryption_metadata", "id", "is_active", "last_login_at", "name", "organization_id", "password_hash", "role", "updated_at") SELECT "created_at", "email", "encryption_metadata", "id", "is_active", "last_login_at", "name", "organization_id", "password_hash", "role", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "performance_audits_audit_id_key" ON "performance_audits"("audit_id");

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_auth_user_id_key" ON "two_factor_auth"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "passkeys_credential_id_key" ON "passkeys"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_user_id_key" ON "notification_settings"("user_id");
