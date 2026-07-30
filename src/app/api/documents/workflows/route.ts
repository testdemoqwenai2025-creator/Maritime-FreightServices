import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth/session'
import { hasPermission, isValidWorkflowTransition, WORKFLOW_STEPS, type WorkflowStep } from '@/lib/auth/rbac'
import { logAudit } from '@/lib/auth/audit'

const prisma = new PrismaClient()

/**
 * GET /api/documents/workflows — List document workflows with filtering
 * Query params: step, priority, type, assignedTo, shipmentId, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!hasPermission(user.role, 'workflows', 'view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const step = searchParams.get('step')
    const priority = searchParams.get('priority')
    const workflowType = searchParams.get('type')
    const assignedTo = searchParams.get('assignedTo')
    const shipmentId = searchParams.get('shipmentId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (step) where.currentStep = step
    if (priority) where.priority = priority
    if (workflowType) where.workflowType = workflowType
    if (assignedTo) where.assignedToId = assignedTo

    // If filtering by shipment, join through document
    if (shipmentId) {
      where.document = { shipmentId }
    }

    // Non-admin users can only see workflows assigned to them or unassigned
    if (user.role !== 'Admin' && user.role !== 'Manager') {
      where.OR = [
        { assignedToId: user.id },
        { assignedToId: null },
      ]
    }

    const [workflows, total] = await Promise.all([
      prisma.documentWorkflow.findMany({
        where,
        include: {
          document: {
            include: {
              shipment: {
                include: {
                  originPort: { select: { name: true, countryCode: true } },
                  destPort: { select: { name: true, countryCode: true } },
                },
              },
            },
          },
          assignedTo: { select: { id: true, name: true, email: true, role: true, organization: true } },
          actions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              performer: { select: { id: true, name: true, role: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.documentWorkflow.count({ where }),
    ])

    // Check SLA breaches
    const now = new Date()
    const slaBreachedIds = workflows
      .filter(w => w.slaDeadline && w.slaDeadline < now && w.currentStep !== 'Approved' && w.currentStep !== 'Archived')
      .map(w => w.id)

    // Auto-update breached workflows
    if (slaBreachedIds.length > 0) {
      await prisma.documentWorkflow.updateMany({
        where: { id: { in: slaBreachedIds }, slaBreached: false },
        data: { slaBreached: true },
      })
      workflows.forEach(w => {
        if (slaBreachedIds.includes(w.id)) w.slaBreached = true
      })
    }

    // Step distribution for dashboard
    const stepDistribution = await prisma.documentWorkflow.groupBy({
      by: ['currentStep'],
      _count: true,
    })

    await logAudit({
      userId: user.id,
      userRole: user.role,
      userOrg: user.organization ?? undefined,
      action: 'workflow.list',
      resource: 'DocumentWorkflow',
    })

    return NextResponse.json({
      workflows,
      total,
      limit,
      offset,
      stepDistribution: stepDistribution.map(s => ({
        step: s.currentStep,
        count: s._count,
      })),
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const err = error as { statusCode: number; message: string }
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[Workflows GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/workflows — Create a new document workflow
 * Body: { documentId, workflowType?, priority?, assignedToId?, slaDeadline? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!hasPermission(user.role, 'workflows', 'create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { documentId, workflowType, priority, assignedToId, slaDeadline } = body

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    // Check document exists
    const document = await prisma.shipmentDocument.findUnique({
      where: { id: documentId },
    })
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check no existing workflow for this document
    const existing = await prisma.documentWorkflow.findUnique({
      where: { documentId },
    })
    if (existing) {
      return NextResponse.json({ error: 'Workflow already exists for this document' }, { status: 409 })
    }

    const sla = slaDeadline ? new Date(slaDeadline) : null
    // Default SLA: 48 hours from now if not specified
    const defaultSla = new Date(Date.now() + 48 * 60 * 60 * 1000)

    const workflow = await prisma.documentWorkflow.create({
      data: {
        documentId,
        workflowType: workflowType || 'Standard',
        priority: priority || 'Normal',
        assignedToId: assignedToId || null,
        slaDeadline: sla || defaultSla,
      },
      include: {
        document: { include: { shipment: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    // Create initial action
    await prisma.documentWorkflowAction.create({
      data: {
        workflowId: workflow.id,
        action: 'Submitted',
        fromStep: 'Draft',
        toStep: 'Submitted',
        performedBy: user.id,
        actorRole: user.role,
        comment: 'Workflow created and submitted',
      },
    })

    // Update document status
    await prisma.shipmentDocument.update({
      where: { id: documentId },
      data: { status: 'Pending' },
    })

    await logAudit({
      userId: user.id,
      userRole: user.role,
      userOrg: user.organization ?? undefined,
      action: 'workflow.create',
      resource: 'DocumentWorkflow',
      resourceId: workflow.id,
      details: { documentId, workflowType, priority },
    })

    return NextResponse.json({ workflow }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const err = error as { statusCode: number; message: string }
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[Workflows POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
