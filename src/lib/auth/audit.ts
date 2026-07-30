/**
 * Audit Logger — Immutable audit trail for compliance and traceability.
 * Phase 6: Digital Supply Chain
 *
 * Every significant action (login, document submit, approval, data mutation)
 * is recorded with actor context, timestamp, and optional metadata.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AuditEntry {
  userId?: string
  userRole?: string
  userOrg?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit entry. Fire-and-forget — does not block the caller.
 * Returns a promise that resolves when the write completes.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userRole: entry.userRole,
        userOrg: entry.userOrg,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    })
  } catch (error) {
    // Audit logging should never crash the application
    console.error('[AuditLog] Failed to write audit entry:', error)
  }
}

/**
 * Create a shorthand audit logger bound to a specific user session.
 */
export function createAuditLogger(session: {
  userId?: string
  userRole?: string
  userOrg?: string
  ipAddress?: string
  userAgent?: string
}) {
  return function audit(
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ) {
    return logAudit({
      ...session,
      action,
      resource,
      resourceId,
      details,
    })
  }
}
