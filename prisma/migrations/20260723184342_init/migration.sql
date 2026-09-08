-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'tenant_owner', 'tenant_member');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('found', 'contacted', 'demo_sent', 'negotiation', 'won', 'lost');

-- CreateEnum
CREATE TYPE "WebsiteHealth" AS ENUM ('unknown', 'no_website', 'green', 'yellow', 'red');

-- CreateEnum
CREATE TYPE "SearchMode" AS ENUM ('interactive', 'sweep');

-- CreateEnum
CREATE TYPE "SearchStatus" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('queued', 'generating', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('search', 'action');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('monthly_grant', 'admin_grant', 'plan_change', 'search_spend', 'action_spend', 'refund');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('api', 'scraper', 'import');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "planId" TEXT NOT NULL,
    "privateFreeGrant" BOOLEAN NOT NULL DEFAULT false,
    "grantExpiresAt" TIMESTAMP(3),
    "creditOverrideSearch" INTEGER,
    "creditOverrideAction" INTEGER,
    "maxSavedLeadsOverride" INTEGER,
    "searchCreditBalance" INTEGER NOT NULL DEFAULT 0,
    "actionCreditBalance" INTEGER NOT NULL DEFAULT 0,
    "retentionDays" INTEGER,
    "nicheProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'tenant_owner',
    "tenantId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "searchCreditsMonthly" INTEGER NOT NULL,
    "actionCreditsMonthly" INTEGER NOT NULL,
    "maxSavedLeads" INTEGER NOT NULL,
    "priceMonthlyTRY" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchSource" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "enabledGlobally" BOOLEAN NOT NULL DEFAULT true,
    "tosNotes" TEXT,
    "rateLimitPerSec" DOUBLE PRECISION,
    "credentialsEnc" TEXT,
    "config" JSONB,

    CONSTRAINT "SearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanSource" (
    "planId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanSource_pkey" PRIMARY KEY ("planId","sourceId")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "SearchMode" NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "status" "SearchStatus" NOT NULL DEFAULT 'queued',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "creditCost" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sourceCode" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "websiteHealth" "WebsiteHealth" NOT NULL DEFAULT 'unknown',
    "healthCheckedAt" TIMESTAMP(3),
    "healthDetail" JSONB,
    "score" DOUBLE PRECISION,
    "raw" JSONB,

    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "stage" "LeadStage" NOT NULL DEFAULT 'found',
    "websiteHealth" "WebsiteHealth" NOT NULL DEFAULT 'unknown',
    "healthCheckedAt" TIMESTAMP(3),
    "healthDetail" JSONB,
    "dataSource" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "searchId" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'queued',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "jobId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedSite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "SiteStatus" NOT NULL DEFAULT 'queued',
    "url" TEXT,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amountTRY" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'manual',
    "note" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "CreditType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "periodKey" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "bbox" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SearchSource_code_key" ON "SearchSource"("code");

-- CreateIndex
CREATE INDEX "Search_tenantId_createdAt_idx" ON "Search"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchResult_searchId_idx" ON "SearchResult"("searchId");

-- CreateIndex
CREATE INDEX "SearchResult_tenantId_idx" ON "SearchResult"("tenantId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_stage_idx" ON "Lead"("tenantId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tenantId_sourceRecordId_dataSource_key" ON "Lead"("tenantId", "sourceRecordId", "dataSource");

-- CreateIndex
CREATE INDEX "LeadNote_leadId_idx" ON "LeadNote"("leadId");

-- CreateIndex
CREATE INDEX "Action_tenantId_createdAt_idx" ON "Action"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedSite_actionId_key" ON "GeneratedSite"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedSite_slug_key" ON "GeneratedSite"("slug");

-- CreateIndex
CREATE INDEX "GeneratedSite_tenantId_idx" ON "GeneratedSite"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_createdAt_idx" ON "Payment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedger_tenantId_createdAt_idx" ON "CreditLedger"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLedger_tenantId_type_reason_periodKey_key" ON "CreditLedger"("tenantId", "type", "reason", "periodKey");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeocodeCache_query_key" ON "GeocodeCache"("query");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSource" ADD CONSTRAINT "PlanSource_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSource" ADD CONSTRAINT "PlanSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SearchSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedSite" ADD CONSTRAINT "GeneratedSite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedSite" ADD CONSTRAINT "GeneratedSite_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedSite" ADD CONSTRAINT "GeneratedSite_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
