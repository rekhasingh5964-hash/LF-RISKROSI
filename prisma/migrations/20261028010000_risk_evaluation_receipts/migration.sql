ALTER TYPE "ConsentStatus" ADD VALUE 'RESTRICTED';

CREATE TYPE "StatutoryBreachType" AS ENUM (
  'DPDP_SEC8_CROSS_BORDER_VIOLATION',
  'DPDP_SEC9_CHILD_DATA_PROTECTION',
  'DPDP_SEC5_DEFECTIVE_NOTICE',
  'DPDP_SEC12_RETENTION_BREACH'
);

ALTER TABLE "ConsentArtifact"
  ADD COLUMN "receiptSignature" TEXT,
  ADD COLUMN "revocationNotes" TEXT;

CREATE UNIQUE INDEX "Risk_organizationId_id_key" ON "Risk"("organizationId", "id");

CREATE TABLE "RiskEvaluationRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "riskId" TEXT NOT NULL,
  "calculatedScore" DOUBLE PRECISION NOT NULL,
  "statutoryOverride" BOOLEAN NOT NULL DEFAULT false,
  "triggeredBreaches" "StatutoryBreachType"[] NOT NULL DEFAULT ARRAY[]::"StatutoryBreachType"[],
  "vectorPayloadJson" JSONB NOT NULL,
  "engineEvaluator" TEXT NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskEvaluationRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RiskEvaluationRecord_organizationId_riskId_evaluatedAt_idx"
  ON "RiskEvaluationRecord"("organizationId", "riskId", "evaluatedAt");
CREATE INDEX "RiskEvaluationRecord_organizationId_evaluatedAt_idx"
  ON "RiskEvaluationRecord"("organizationId", "evaluatedAt");

ALTER TABLE "RiskEvaluationRecord"
  ADD CONSTRAINT "RiskEvaluationRecord_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskEvaluationRecord"
  ADD CONSTRAINT "RiskEvaluationRecord_organizationId_riskId_fkey"
  FOREIGN KEY ("organizationId", "riskId") REFERENCES "Risk"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
