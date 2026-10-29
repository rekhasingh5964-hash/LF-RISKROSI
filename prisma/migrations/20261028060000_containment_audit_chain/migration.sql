CREATE TABLE "ContainmentAuditRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "incidentId" TEXT,
  "commandId" TEXT,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "previousHash" TEXT,
  "eventHash" TEXT NOT NULL,
  "signature" TEXT NOT NULL,
  "keyVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContainmentAuditRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContainmentAuditRecord_organizationId_createdAt_idx"
  ON "ContainmentAuditRecord"("organizationId", "createdAt");
CREATE INDEX "ContainmentAuditRecord_incidentId_createdAt_idx"
  ON "ContainmentAuditRecord"("incidentId", "createdAt");
CREATE INDEX "ContainmentAuditRecord_commandId_createdAt_idx"
  ON "ContainmentAuditRecord"("commandId", "createdAt");

ALTER TABLE "ContainmentAuditRecord"
  ADD CONSTRAINT "ContainmentAuditRecord_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
