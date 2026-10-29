CREATE TYPE "EndpointIncidentCategory" AS ENUM (
  'RANSOMWARE_SUSPECTED',
  'DATA_EXFILTRATION_SUSPECTED',
  'WIPER_SUSPECTED',
  'LATERAL_MOVEMENT',
  'EXPLOITATION',
  'OTHER'
);
CREATE TYPE "EndpointIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "EndpointIncidentStatus" AS ENUM ('OPEN', 'CONTAINED', 'MONITORING', 'RESOLVED', 'FALSE_POSITIVE');
CREATE TYPE "ContainmentAction" AS ENUM ('QUARANTINE', 'RELEASE');
CREATE TYPE "ContainmentCommandStatus" AS ENUM ('PENDING', 'DELIVERED', 'APPLIED', 'FAILED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "EndpointIncident" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "reportedById" TEXT NOT NULL,
  "category" "EndpointIncidentCategory" NOT NULL,
  "severity" "EndpointIncidentSeverity" NOT NULL,
  "status" "EndpointIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "firstObservedAt" TIMESTAMP(3) NOT NULL,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reportingDeadlineAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "EndpointIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContainmentCommand" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "incidentId" TEXT,
  "requestedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "action" "ContainmentAction" NOT NULL,
  "status" "ContainmentCommandStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "result" TEXT,
  CONSTRAINT "ContainmentCommand_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EndpointIncident_organizationId_status_reportedAt_idx"
  ON "EndpointIncident"("organizationId", "status", "reportedAt");
CREATE UNIQUE INDEX "EndpointIncident_organizationId_id_key"
  ON "EndpointIncident"("organizationId", "id");
CREATE INDEX "EndpointIncident_organizationId_reportingDeadlineAt_idx"
  ON "EndpointIncident"("organizationId", "reportingDeadlineAt");
CREATE INDEX "EndpointIncident_deviceId_reportedAt_idx"
  ON "EndpointIncident"("deviceId", "reportedAt");
CREATE INDEX "ContainmentCommand_organizationId_status_requestedAt_idx"
  ON "ContainmentCommand"("organizationId", "status", "requestedAt");
CREATE INDEX "ContainmentCommand_deviceId_status_requestedAt_idx"
  ON "ContainmentCommand"("deviceId", "status", "requestedAt");
CREATE INDEX "ContainmentCommand_incidentId_requestedAt_idx"
  ON "ContainmentCommand"("incidentId", "requestedAt");

ALTER TABLE "EndpointIncident"
  ADD CONSTRAINT "EndpointIncident_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndpointIncident"
  ADD CONSTRAINT "EndpointIncident_organizationId_deviceId_fkey"
  FOREIGN KEY ("organizationId", "deviceId") REFERENCES "EndpointDevice"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndpointIncident"
  ADD CONSTRAINT "EndpointIncident_reportedById_fkey"
  FOREIGN KEY ("reportedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContainmentCommand"
  ADD CONSTRAINT "ContainmentCommand_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContainmentCommand"
  ADD CONSTRAINT "ContainmentCommand_organizationId_deviceId_fkey"
  FOREIGN KEY ("organizationId", "deviceId") REFERENCES "EndpointDevice"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContainmentCommand"
  ADD CONSTRAINT "ContainmentCommand_organizationId_incidentId_fkey"
  FOREIGN KEY ("organizationId", "incidentId") REFERENCES "EndpointIncident"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContainmentCommand"
  ADD CONSTRAINT "ContainmentCommand_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContainmentCommand"
  ADD CONSTRAINT "ContainmentCommand_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
