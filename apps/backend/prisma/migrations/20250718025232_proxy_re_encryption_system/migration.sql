/*
  Warnings:

  - You are about to drop the `proxy_re_encryption_delegations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "proxy_re_encryption_delegations";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "proxy_re_encryption_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "delegator_id" TEXT NOT NULL,
    "delegatee_id" TEXT NOT NULL,
    "data_categories" TEXT NOT NULL,
    "access_level" TEXT NOT NULL,
    "key_data" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "valid_from" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" DATETIME NOT NULL,
    "organization_id" TEXT NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" DATETIME,
    "revoked_by" TEXT,
    "revocation_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "proxy_re_encryption_keys_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proxy_re_encryption_keys_delegatee_id_fkey" FOREIGN KEY ("delegatee_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proxy_re_encryption_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
