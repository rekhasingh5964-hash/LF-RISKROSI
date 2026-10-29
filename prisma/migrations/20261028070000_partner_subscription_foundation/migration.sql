CREATE TYPE "ProductTier" AS ENUM ('STARTER', 'GROWTH', 'BUSINESS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

CREATE TABLE "ChannelPartner" (
  "id" TEXT NOT NULL,
  "providerOrganizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "marginBasisPoints" INTEGER NOT NULL DEFAULT 2000,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChannelPartner_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChannelPartner_marginBasisPoints_check" CHECK ("marginBasisPoints" BETWEEN 2000 AND 2500)
);

CREATE TABLE "PartnerCustomerAssignment" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "customerOrganizationId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerCustomerAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tier" "ProductTier" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "monthlyAmount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "seatsIncluded" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "renewsAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "billingReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductSubscription_monthlyAmount_check" CHECK ("monthlyAmount" >= 0),
  CONSTRAINT "ProductSubscription_seatsIncluded_check" CHECK ("seatsIncluded" > 0),
  CONSTRAINT "ProductSubscription_currency_check" CHECK ("currency" = 'INR')
);

CREATE UNIQUE INDEX "ChannelPartner_providerOrganizationId_contactEmail_key"
  ON "ChannelPartner"("providerOrganizationId", "contactEmail");
CREATE INDEX "ChannelPartner_providerOrganizationId_active_idx"
  ON "ChannelPartner"("providerOrganizationId", "active");
CREATE UNIQUE INDEX "PartnerCustomerAssignment_customerOrganizationId_key"
  ON "PartnerCustomerAssignment"("customerOrganizationId");
CREATE INDEX "PartnerCustomerAssignment_partnerId_assignedAt_idx"
  ON "PartnerCustomerAssignment"("partnerId", "assignedAt");
CREATE UNIQUE INDEX "ProductSubscription_organizationId_key"
  ON "ProductSubscription"("organizationId");
CREATE INDEX "ProductSubscription_status_renewsAt_idx"
  ON "ProductSubscription"("status", "renewsAt");

ALTER TABLE "ChannelPartner"
  ADD CONSTRAINT "ChannelPartner_providerOrganizationId_fkey"
  FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerCustomerAssignment"
  ADD CONSTRAINT "PartnerCustomerAssignment_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "ChannelPartner"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerCustomerAssignment"
  ADD CONSTRAINT "PartnerCustomerAssignment_customerOrganizationId_fkey"
  FOREIGN KEY ("customerOrganizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSubscription"
  ADD CONSTRAINT "ProductSubscription_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
