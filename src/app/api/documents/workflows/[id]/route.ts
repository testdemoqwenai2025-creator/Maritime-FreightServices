import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth/session'
import { hasPermission, isValidWorkflowTransition, meetsRoleRequirement } from '@/lib/auth/rbac'
import { logAudit } from '@/lib/auth/audit'

const prisma = new PrismaClient()

/**
 * GET /api/documents/workflows/[id] — Get single workflow with full action history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!hasPermission(user.role, 'workflows', 'view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const workflow = await prisma.documentWorkflow.findUnique({
      where: { id },
      include: {
        document: {
          include: {
            shipment: {
              include: {
                originPort: { select: { name: true, countryCode: true, unlocode: true } },
                destPort: { select: { name: true, countryCode: true, unlocode: true } },
                vessel: { select: { name: true, mmsi: true, flagCountry: true } },
              },
            },
          },
        },
        assignedTo: { select: { id: true, name: true, email: true, role: true, organization: true } },
        actions: {
          orderBy: { createdAt: 'asc' },
          include: {
            performer: { select: { id: true, name: true, role: true, organization: true } },
          },
        },
      },
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    return NextResponse.json({ workflow })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const err = error as { statusCode: number; message: string }
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[Workflow GET by ID]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/workflows/[id] — Transition workflow step
 * Body: { action: 'approve'|'reject'|'assign'|'resubmit'|'archive', comment?, assignedToId? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!hasPermission(user.role, 'workflows', 'edit')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, comment, assignedToId } = body

    const workflow = await prisma.documentWorkflow.findUnique({
      where: { id },
      include: { document: true },
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const currentStep = workflow.currentStep as string
    let newStep = currentStep
    let actionName = action

    switch (action) {
      case 'approve': {
        if (workflow.requiredRole && !meetsRoleRequirement(user.role, workflow.requiredRole)) {
          return NextResponse.json(
            { error: `Approval requires ${workflow.requiredRole} role or higher` },
            { status: 403 }
          )
        }
        if (!isValidWorkflowTransition(currentStep, 'Approved')) {
          return NextResponse.json({ error: `Cannot approve from ${currentStep}` }, { status: 400 })
        }
        newStep = 'Approved'
        break
      }
      case 'reject': {
        if (!isValidWorkflowTransition(currentStep, 'Rejected')) {
          return NextResponse.json({ error: `Cannot reject from ${currentStep}` }, { status: 400 })
        }
        newStep = 'Rejected'
        break
      }
      case 'resubmit': {
        if (!isValidWorkflowTransition(currentStep, 'Submitted')) {
          return NextResponse.json({ error: `Cannot resubmit from ${currentStep}` }, { status: 400 })
        }
        newStep = 'Submitted'
        actionName = 'Resubmitted'
        break
      }
      case 'archive': {
        if (!isValidWorkflowTransition(currentStep, 'Archived')) {
          return NextResponse.json({ error: `Cannot archive from ${currentStep}` }, { status: 400 })
        }
        newStep = 'Archived'
        break
      }
      case 'assign': {
        if (!assignedToId) {
          return NextResponse.json({ error: 'assignedToId is required for assign action' }, { status: 400 })
        }
        actionName = 'Assigned'
        break
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      currentStep: newStep,
      updatedAt: new Date(),
    }
    if (action === 'assign') updateData.assignedToId = assignedToId
    if (newStep === 'UnderReview') updateData.reviewedAt = new Date()
    if (newStep === 'Approved' || newStep === 'Rejected') updateData.completedAt = new Date()
    if (newStep === 'Rejected' && comment) updateData.rejectionReason = comment

    const updated = await prisma.documentWorkflow.update({
      where: { id },
      data: updateData,
      include: {
        document: true,
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    await prisma.documentWorkflowAction.create({
      data: {
        workflowId: id,
        action: actionName,
        fromStep: currentStep,
        toStep: newStep,
        performedBy: user.id,
        actorRole: user.role,
        comment: comment || undefined,
      },
    })

    if (newStep === 'Approved') {
      await prisma.shipmentDocument.update({
        where: { id: workflow.documentId },
        data: { status: 'Approved' },
      })
    } else if (newStep === 'Rejected') {
      await prisma.shipmentDocument.update({
        where: { id: workflow.documentId },
        data: { status: 'Rejected' },
      })
    }

    await logAudit({
      userId: user.id,
      userRole: user.role,
      userOrg: user.organization ?? undefined,
      action: `workflow.${action}`,
      resource: 'DocumentWorkflow',
      resourceId: id,
      details: { fromStep: currentStep, toStep: newStep, comment },
    })

    return NextResponse.json({ workflow: updated })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const err = error as { statusCode: number; message: string }
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[Workflow PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
