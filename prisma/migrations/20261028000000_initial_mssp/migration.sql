CREATE TYPE "OrganizationKind" AS ENUM ('PROVIDER', 'CUSTOMER');
CREATE TYPE "UserRole" AS ENUM ('MSSP_ADMIN', 'MSSP_ANALYST', 'TENANT_ADMIN', 'RISK_MANAGER', 'AUDITOR');
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ERASED', 'EXPIRED');
CREATE TYPE "WebhookStatus" AS ENUM ('QUEUED', 'DELIVERED', 'RETRYING', 'FAILED');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL, "parentId" TEXT, "name" TEXT NOT NULL, "industry" TEXT,
  "kind" "OrganizationKind" NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "region" TEXT NOT NULL DEFAULT 'IN-SOUTH-01', "processingPaused" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "User" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL, "passwordSalt" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Risk" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL, "likelihood" INTEGER NOT NULL, "impact" INTEGER NOT NULL, "exposure" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL, "baseScore" INTEGER NOT NULL, "severity" "RiskSeverity" NOT NULL, "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
  "statutoryTrigger" BOOLEAN NOT NULL DEFAULT false, "statutoryReference" TEXT, "statutoryOverride" TEXT,
  "owner" TEXT NOT NULL DEFAULT '', "aleBefore" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "aleAfter" DECIMAL(18,2) NOT NULL DEFAULT 0, "treatmentCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ConsentPurpose" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "code" TEXT NOT NULL, "label" TEXT NOT NULL,
  "description" TEXT NOT NULL, "retentionDays" INTEGER NOT NULL, "lawfulBasis" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentPurpose_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PrivacyNotice" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "purposeId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "language" TEXT NOT NULL, "content" TEXT NOT NULL, "contentHash" TEXT NOT NULL,
  "section" TEXT NOT NULL DEFAULT 'DPDP Act 2023 Section 5', "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PrivacyNotice_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ConsentArtifact" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "purposeId" TEXT NOT NULL, "dataPrincipalRef" TEXT NOT NULL,
  "noticeId" TEXT NOT NULL, "noticeVersion" INTEGER NOT NULL, "language" TEXT NOT NULL, "choices" JSONB NOT NULL,
  "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE', "evidenceHash" TEXT NOT NULL, "signature" TEXT NOT NULL,
  "keyVersion" TEXT NOT NULL, "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3), "erasedAt" TIMESTAMP(3), "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentArtifact_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ConsentAudit" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "consentId" TEXT, "eventType" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "payload" JSONB NOT NULL, "previousHash" TEXT, "eventHash" TEXT NOT NULL,
  "signature" TEXT NOT NULL, "keyVersion" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentAudit_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WebhookEndpoint" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "url" TEXT NOT NULL, "secret" TEXT NOT NULL,
  "events" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "endpointId" TEXT NOT NULL, "consentId" TEXT,
  "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" "WebhookStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0, "responseCode" INTEGER, "lastError" TEXT, "nextAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Organization_parentId_kind_status_idx" ON "Organization"("parentId", "kind", "status");
CREATE INDEX "Organization_region_idx" ON "Organization"("region");
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "Risk_organizationId_status_severity_idx" ON "Risk"("organizationId", "status", "severity");
CREATE INDEX "Risk_organizationId_score_idx" ON "Risk"("organizationId", "score");
CREATE UNIQUE INDEX "ConsentPurpose_organizationId_code_key" ON "ConsentPurpose"("organizationId", "code");
CREATE UNIQUE INDEX "ConsentPurpose_organizationId_id_key" ON "ConsentPurpose"("organizationId", "id");
CREATE INDEX "ConsentPurpose_organizationId_active_idx" ON "ConsentPurpose"("organizationId", "active");
CREATE UNIQUE INDEX "PrivacyNotice_organizationId_purposeId_version_language_key" ON "PrivacyNotice"("organizationId", "purposeId", "version", "language");
CREATE UNIQUE INDEX "PrivacyNotice_organizationId_purposeId_id_key" ON "PrivacyNotice"("organizationId", "purposeId", "id");
CREATE INDEX "PrivacyNotice_organizationId_createdAt_idx" ON "PrivacyNotice"("organizationId", "createdAt");
CREATE INDEX "ConsentArtifact_organizationId_status_retentionExpiresAt_idx" ON "ConsentArtifact"("organizationId", "status", "retentionExpiresAt");
CREATE INDEX "ConsentArtifact_organizationId_dataPrincipalRef_idx" ON "ConsentArtifact"("organizationId", "dataPrincipalRef");
CREATE INDEX "ConsentAudit_organizationId_createdAt_idx" ON "ConsentAudit"("organizationId", "createdAt");
CREATE INDEX "ConsentAudit_consentId_createdAt_idx" ON "ConsentAudit"("consentId", "createdAt");
CREATE INDEX "WebhookEndpoint_organizationId_enabled_idx" ON "WebhookEndpoint"("organizationId", "enabled");
CREATE INDEX "WebhookDelivery_organizationId_status_createdAt_idx" ON "WebhookDelivery"("organizationId", "status", "createdAt");
CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentPurpose" ADD CONSTRAINT "ConsentPurpose_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyNotice" ADD CONSTRAINT "PrivacyNotice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyNotice" ADD CONSTRAINT "PrivacyNotice_organizationId_purposeId_fkey" FOREIGN KEY ("organizationId", "purposeId") REFERENCES "ConsentPurpose"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentArtifact" ADD CONSTRAINT "ConsentArtifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentArtifact" ADD CONSTRAINT "ConsentArtifact_organizationId_purposeId_fkey" FOREIGN KEY ("organizationId", "purposeId") REFERENCES "ConsentPurpose"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentArtifact" ADD CONSTRAINT "ConsentArtifact_organizationId_purposeId_noticeId_fkey" FOREIGN KEY ("organizationId", "purposeId", "noticeId") REFERENCES "PrivacyNotice"("organizationId", "purposeId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentAudit" ADD CONSTRAINT "ConsentAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentAudit" ADD CONSTRAINT "ConsentAudit_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "ConsentArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "ConsentArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
