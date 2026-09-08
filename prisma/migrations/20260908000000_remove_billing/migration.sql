-- Remove the commercial (SaaS) layer: plans, payments and credit metering.
-- A self-hosted install has no billing, so every workspace is unlimited.

-- Drop billing tables.
DROP TABLE IF EXISTS "CreditLedger";
DROP TABLE IF EXISTS "Payment";
DROP TABLE IF EXISTS "PlanSource";

-- Tenant no longer belongs to a plan and no longer carries credit balances.
ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_planId_fkey";
ALTER TABLE "Tenant"
  DROP COLUMN IF EXISTS "planId",
  DROP COLUMN IF EXISTS "privateFreeGrant",
  DROP COLUMN IF EXISTS "grantExpiresAt",
  DROP COLUMN IF EXISTS "creditOverrideSearch",
  DROP COLUMN IF EXISTS "creditOverrideAction",
  DROP COLUMN IF EXISTS "maxSavedLeadsOverride",
  DROP COLUMN IF EXISTS "searchCreditBalance",
  DROP COLUMN IF EXISTS "actionCreditBalance";

DROP TABLE IF EXISTS "Plan";

-- Enums only the billing tables used.
DROP TYPE IF EXISTS "CreditType";
DROP TYPE IF EXISTS "LedgerReason";
