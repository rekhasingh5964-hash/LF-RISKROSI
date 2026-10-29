ALTER TABLE "ContainmentCommand"
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "commandSignature" TEXT;

ALTER TABLE "EndpointDevice"
  ADD COLUMN "commandKeyFingerprint" TEXT;

CREATE UNIQUE INDEX "ContainmentCommand_one_active_per_device_key"
  ON "ContainmentCommand"("deviceId")
  WHERE "status" IN ('PENDING', 'APPROVED', 'DELIVERED');
