/**
 * Phase 6 Seed Script — Demo users, document workflows, and audit logs
 * Run: bun run scripts/seed-phase6.ts
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Phase 6: Digital Supply Chain...')

  // ─── 1. Demo Users ──────────────────────────────────────────────
  console.log('  Creating demo users...')

  const users = [
    { email: 'admin@maritime.io', name: 'Platform Admin', password: 'admin123', role: 'Admin', organization: 'Maritime Platform', actorType: 'Internal' },
    { email: 'manager@globalship.com', name: 'Sarah Chen', password: 'manager123', role: 'Manager', organization: 'Global Shipping Co', actorType: 'Internal' },
    { email: 'customs@customs.gov', name: 'James Okonkwo', password: 'customs123', role: 'Customs', organization: 'Port Customs Authority', actorType: 'CustomsBroker' },
    { email: 'ops@maersk.com', name: 'Lars Nielsen', password: 'carrier123', role: 'Carrier', organization: 'Maersk Line', actorType: 'Carrier' },
    { email: 'terminal@rotterdam.nl', name: 'Anna de Vries', password: 'terminal123', role: 'Terminal', organization: 'Rotterdam Port Authority', actorType: 'TerminalOperator' },
    { email: 'shipper@trading.com', name: 'Wei Zhang', password: 'shipper123', role: 'Shipper', organization: 'Pacific Trading Ltd', actorType: 'Shipper' },
  ]

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      const passwordHash = await hashPassword(u.password)
      const { password: _pw, ...userData } = u
      await prisma.user.create({
        data: { ...userData, passwordHash },
      })
      console.log(`    Created user: ${u.email} (${u.role})`)
    } else {
      console.log(`    User exists: ${u.email}`)
    }
  }

  // ─── 2. Document Workflows ──────────────────────────────────────
  console.log('  Creating document workflows...')

  // Get some existing documents to create workflows for
  const documents = await prisma.shipmentDocument.findMany({ take: 20 })
  const allUsers = await prisma.user.findMany()
  const adminUser = allUsers.find(u => u.role === 'Admin')!
  const managerUser = allUsers.find(u => u.role === 'Manager')!
  const customsUser = allUsers.find(u => u.role === 'Customs')!

  const workflowConfigs = [
    { type: 'Standard', priority: 'Normal', steps: ['Submitted', 'UnderReview', 'Approved'], assignTo: managerUser },
    { type: 'Compliance', priority: 'High', steps: ['Submitted', 'UnderReview'], assignTo: customsUser },
    { type: 'Expedited', priority: 'Urgent', steps: ['Submitted', 'UnderReview', 'Approved'], assignTo: managerUser },
    { type: 'Financial', priority: 'Normal', steps: ['Submitted'], assignTo: null },
    { type: 'Standard', priority: 'Low', steps: ['Submitted', 'UnderReview', 'Rejected'], assignTo: adminUser },
    { type: 'Compliance', priority: 'High', steps: ['Submitted', 'UnderReview', 'Approved', 'Archived'], assignTo: customsUser },
    { type: 'Standard', priority: 'Normal', steps: ['Submitted', 'UnderReview'], assignTo: null },
    { type: 'Expedited', priority: 'Urgent', steps: ['Submitted', 'UnderReview', 'Approved'], assignTo: adminUser },
  ]

  for (let i = 0; i < Math.min(documents.length, workflowConfigs.length); i++) {
    const doc = documents[i]
    const config = workflowConfigs[i]

    // Check if workflow already exists
    const existing = await prisma.documentWorkflow.findUnique({ where: { documentId: doc.id } })
    if (existing) {
      console.log(`    Workflow exists for document ${doc.id}`)
      continue
    }

    // Determine required role based on workflow type
    const requiredRole = config.type === 'Compliance' ? 'Customs' : config.type === 'Financial' ? 'Manager' : 'Admin'

    // Create the workflow
    const slaDeadline = new Date(Date.now() + (config.priority === 'Urgent' ? 4 : config.priority === 'High' ? 24 : 48) * 60 * 60 * 1000)

    const workflow = await prisma.documentWorkflow.create({
      data: {
        documentId: doc.id,
        workflowType: config.type,
        priority: config.priority,
        currentStep: config.steps[config.steps.length - 1], // final step
        requiredRole,
        assignedToId: config.assignTo?.id || null,
        submittedAt: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
        reviewedAt: config.steps.includes('UnderReview') || config.steps.includes('Approved')
          ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null,
        completedAt: config.steps.includes('Approved') || config.steps.includes('Archived')
          ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : null,
        slaDeadline,
        slaBreached: config.priority === 'Low' && Math.random() > 0.5, // some low-priority ones breached
        rejectionReason: config.steps.includes('Rejected') ? 'Missing certificate of origin. Please resubmit with complete documentation.' : null,
      },
    })

    // Create action history for each step transition
    let prevStep = 'Draft'
    const actors = [adminUser, config.assignTo, customsUser].filter(Boolean) as typeof allUsers

    for (const step of config.steps) {
      const actor = actors[Math.floor(Math.random() * actors.length)]
      const actionName = step === 'Approved' ? 'Approved' : step === 'Rejected' ? 'Rejected' : step === 'Archived' ? 'Archived' : step === 'UnderReview' ? 'Reviewed' : 'Submitted'

      await prisma.documentWorkflowAction.create({
        data: {
          workflowId: workflow.id,
          action: actionName,
          fromStep: prevStep,
          toStep: step,
          performedBy: actor.id,
          actorRole: actor.role,
          comment: step === 'Rejected' ? 'Missing certificate of origin' : step === 'Approved' ? 'All documents in order' : null,
          createdAt: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
        },
      })
      prevStep = step
    }

    // Update document status based on final step
    const finalStep = config.steps[config.steps.length - 1]
    await prisma.shipmentDocument.update({
      where: { id: doc.id },
      data: { status: finalStep === 'Approved' || finalStep === 'Archived' ? 'Approved' : finalStep === 'Rejected' ? 'Rejected' : 'Pending' },
    })

    console.log(`    Created workflow: ${doc.docType} → ${finalStep} (${config.type}/${config.priority})`)
  }

  // ─── 3. Sample Audit Logs ────────────────────────────────────────
  console.log('  Creating audit logs...')

  const auditEntries = [
    { userId: adminUser.id, userRole: 'Admin', action: 'login', resource: 'Auth' },
    { userId: managerUser.id, userRole: 'Manager', action: 'login', resource: 'Auth' },
    { userId: adminUser.id, userRole: 'Admin', action: 'user.create', resource: 'User', details: { email: 'shipper@trading.com' } },
    { userId: customsUser.id, userRole: 'Customs', action: 'workflow.approve', resource: 'DocumentWorkflow' },
    { userId: adminUser.id, userRole: 'Admin', action: 'workflow.list', resource: 'DocumentWorkflow' },
    { userId: managerUser.id, userRole: 'Manager', action: 'shipment.view', resource: 'Shipment' },
  ]

  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        ...entry,
        userOrg: allUsers.find(u => u.id === entry.userId)?.organization || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0 (Phase 6 Seed)',
      },
    })
  }
  console.log('    Created 6 audit log entries')

  console.log('Phase 6 seeding complete!')
  console.log(`  Users: ${allUsers.length}`)
  console.log(`  Workflows: ${workflowConfigs.length}`)
  console.log(`  Audit logs: 6`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
