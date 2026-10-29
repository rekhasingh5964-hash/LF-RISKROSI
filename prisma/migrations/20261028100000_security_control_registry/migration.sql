CREATE TABLE "SecurityControlConfiguration" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "controlId" TEXT NOT NULL,
  "enabledCapabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityControlConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SecurityControlConfiguration_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SecurityControlConfiguration_organizationId_controlId_key"
  ON "SecurityControlConfiguration"("organizationId", "controlId");

CREATE INDEX "SecurityControlConfiguration_organizationId_idx"
  ON "SecurityControlConfiguration"("organizationId");
