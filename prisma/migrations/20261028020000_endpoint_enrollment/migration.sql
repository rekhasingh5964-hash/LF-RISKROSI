CREATE TYPE "EndpointOperatingSystem" AS ENUM ('WINDOWS', 'LINUX');

CREATE TABLE "EndpointEnrollmentToken" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EndpointEnrollmentToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EndpointDevice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "operatingSystem" "EndpointOperatingSystem" NOT NULL,
  "architecture" TEXT NOT NULL,
  "agentVersion" TEXT NOT NULL,
  "deviceTokenHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EndpointDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EndpointEnrollmentToken_tokenHash_key" ON "EndpointEnrollmentToken"("tokenHash");
CREATE INDEX "EndpointEnrollmentToken_organizationId_expiresAt_idx" ON "EndpointEnrollmentToken"("organizationId", "expiresAt");
CREATE INDEX "EndpointEnrollmentToken_organizationId_createdAt_idx" ON "EndpointEnrollmentToken"("organizationId", "createdAt");
CREATE UNIQUE INDEX "EndpointDevice_deviceTokenHash_key" ON "EndpointDevice"("deviceTokenHash");
CREATE INDEX "EndpointDevice_organizationId_active_idx" ON "EndpointDevice"("organizationId", "active");
CREATE INDEX "EndpointDevice_organizationId_lastSeenAt_idx" ON "EndpointDevice"("organizationId", "lastSeenAt");

ALTER TABLE "EndpointEnrollmentToken"
  ADD CONSTRAINT "EndpointEnrollmentToken_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndpointDevice"
  ADD CONSTRAINT "EndpointDevice_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
