CREATE TYPE "EndpointTelemetryType" AS ENUM (
  'AGENT_STARTED',
  'HEARTBEAT_FAILED',
  'HEARTBEAT_RESTORED'
);

CREATE UNIQUE INDEX "EndpointDevice_organizationId_id_key"
  ON "EndpointDevice"("organizationId", "id");

CREATE TABLE "EndpointTelemetryEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" "EndpointTelemetryType" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "details" JSONB NOT NULL,
  CONSTRAINT "EndpointTelemetryEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EndpointTelemetryEvent_deviceId_eventId_key"
  ON "EndpointTelemetryEvent"("deviceId", "eventId");
CREATE INDEX "EndpointTelemetryEvent_organizationId_receivedAt_idx"
  ON "EndpointTelemetryEvent"("organizationId", "receivedAt");
CREATE INDEX "EndpointTelemetryEvent_organizationId_expiresAt_idx"
  ON "EndpointTelemetryEvent"("organizationId", "expiresAt");
CREATE INDEX "EndpointTelemetryEvent_deviceId_receivedAt_idx"
  ON "EndpointTelemetryEvent"("deviceId", "receivedAt");

ALTER TABLE "EndpointTelemetryEvent"
  ADD CONSTRAINT "EndpointTelemetryEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndpointTelemetryEvent"
  ADD CONSTRAINT "EndpointTelemetryEvent_organizationId_deviceId_fkey"
  FOREIGN KEY ("organizationId", "deviceId")
  REFERENCES "EndpointDevice"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
