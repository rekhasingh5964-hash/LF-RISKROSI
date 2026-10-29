import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { serializeCsv } from '@/lib/csv'
import { errorResponse } from '@/lib/http'
import { observeApiResponse } from '@/lib/api-observability'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
const EXPORT_ROW_LIMIT = 1000

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all') return errorResponse('Select a single tenant for evidence export', 400)

  const organizationId = scope.tenantId
  const [incidents, telemetry, audit] = await Promise.all([
    prisma.endpointIncident.findMany({
      where: { organizationId },
      select: {
        id: true, deviceId: true, category: true, severity: true, status: true,
        summary: true, firstObservedAt: true, reportedAt: true,
        reportingDeadlineAt: true, resolvedAt: true,
      },
      orderBy: { reportedAt: 'desc' },
      take: EXPORT_ROW_LIMIT,
    }),
    prisma.endpointTelemetryEvent.findMany({
      where: { organizationId },
      select: {
        id: true, deviceId: true, eventId: true, eventType: true,
        occurredAt: true, receivedAt: true, expiresAt: true, details: true,
      },
      orderBy: { receivedAt: 'desc' },
      take: EXPORT_ROW_LIMIT,
    }),
    prisma.containmentAuditRecord.findMany({
      where: { organizationId },
      select: {
        id: true, incidentId: true, commandId: true, actorId: true,
        action: true, payload: true, previousHash: true, eventHash: true,
        signature: true, keyVersion: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: EXPORT_ROW_LIMIT,
    }),
  ])
  const rows = [
    ...incidents.map((record) => ({
      recordType: 'INCIDENT',
      recordId: record.id,
      deviceId: record.deviceId,
      event: record.category,
      severity: record.severity,
      status: record.status,
      summary: record.summary,
      occurredAt: record.firstObservedAt.toISOString(),
      recordedAt: record.reportedAt.toISOString(),
      expiresAt: '',
      actorId: '',
      payload: '',
      previousHash: '',
      eventHash: '',
      signature: '',
      keyVersion: '',
      deadlineAt: record.reportingDeadlineAt.toISOString(),
      resolvedAt: record.resolvedAt?.toISOString() || '',
    })),
    ...telemetry.map((record) => ({
      recordType: 'TELEMETRY',
      recordId: record.id,
      deviceId: record.deviceId,
      event: record.eventType,
      severity: '',
      status: '',
      summary: '',
      occurredAt: record.occurredAt.toISOString(),
      recordedAt: record.receivedAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
      actorId: '',
      payload: JSON.stringify(record.details),
      previousHash: '',
      eventHash: '',
      signature: '',
      keyVersion: '',
      deadlineAt: '',
      resolvedAt: '',
    })),
    ...audit.map((record) => ({
      recordType: 'CONTAINMENT_AUDIT',
      recordId: record.id,
      deviceId: '',
      event: record.action,
      severity: '',
      status: '',
      summary: '',
      occurredAt: record.createdAt.toISOString(),
      recordedAt: record.createdAt.toISOString(),
      expiresAt: '',
      actorId: record.actorId,
      payload: JSON.stringify(record.payload),
      previousHash: record.previousHash || '',
      eventHash: record.eventHash,
      signature: record.signature,
      keyVersion: record.keyVersion,
      deadlineAt: '',
      resolvedAt: '',
    })),
  ]
  rows.sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
  const csv = serializeCsv([
    'recordType', 'recordId', 'deviceId', 'event', 'severity', 'status', 'summary',
    'occurredAt', 'recordedAt', 'expiresAt', 'actorId', 'payload', 'previousHash',
    'eventHash', 'signature', 'keyVersion', 'deadlineAt', 'resolvedAt',
  ], rows)
  const response = new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lumera-smb-incident-evidence.csv"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
  return observeApiResponse(response, await headers())
}
