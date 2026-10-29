ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

CREATE TABLE "GlobalContainmentPolicy" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "controlPlaneHostname" TEXT NOT NULL DEFAULT '',
  "pinnedControlPlaneIps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowedManagementCidrs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updatedById" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalContainmentPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GlobalContainmentPolicy_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "GlobalContainmentPolicy_updatedById_idx"
  ON "GlobalContainmentPolicy"("updatedById");
