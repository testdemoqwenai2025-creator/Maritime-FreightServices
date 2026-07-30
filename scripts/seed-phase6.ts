/**
 * Seed script for Phase 6 Sprint 1 — creates demo users, documents, and workflows.
 * Run: npx tsx scripts/seed-phase6.ts
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Phase 6 Sprint 1 data...')

  // ── 1. Create demo users across all 7 roles ──
  const users = [
    { email: 'admin@maritime.io', name: 'System Admin', role: 'Admin', organization: 'Maritime Platform', actorType: 'Internal', password: 'Admin123!' },
    { email: 'manager@maritime.io', name: 'Operations Manager', role: 'Manager', organization: 'Maritime Platform', actorType: 'Internal', password: 'Manager123!' },
    { email: 'customs@gov.uk', name: 'James Clarke', role: 'Customs', organization: 'HMRC Customs', actorType: 'CustomsBroker', password: 'Customs123!' },
    { email: 'carrier@maersk.com', name: 'Sofia Nielsen', role: 'Carrier', organization: 'Maersk Line', actorType: 'Carrier', password: 'Carrier123!' },
    { email: 'terminal@feligandu.com', name: 'Ahmed Hassan', role: 'Terminal', organization: 'Feligandu Terminal', actorType: 'TerminalOperator', password: 'Terminal123!' },
    { email: 'shipper@acme.com', name: 'Maria Santos', role: 'Shipper', organization: 'ACME Trading Co', actorType: 'Shipper', password: 'Shipper123!' },
    { email: 'viewer@maritime.io', name: 'Guest User', role: 'Viewer', organization: 'External Partner', actorType: 'Internal', password: 'Viewer123!' },
  ]

  const createdUsers: Record<string, { id: string; email: string; role: string }> = {}

  for (const u of users) {
    const passwordHash = await hashPassword(u.password)
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, role: u.role, organization: u.organization, actorType: u.actorType, passwordHash },
      select: { id: true, email: true, role: true },
    })
    createdUsers[u.role] = user
    console.log(`  User: ${u.email} (${u.role})`)
  }

  // ── 2. Ensure we have at least one shipment and document to attach workflows to ──
  const vessel = await prisma.vessel.findFirst() || await prisma.vessel.create({
    data: { name: 'MV Atlantic Star', mmsi: 636091789, vesselType: 'Container Ship', flagCountry: 'Panama', status: 'Active' },
  })

  const originPort = await prisma.port.findFirst() || await prisma.port.create({
    data: { name: 'Shanghai', countryCode: 'CN', region: 'East Asia', latitude: 31.23, longitude: 121.47 },
  })

  const destPort = await prisma.port.findFirst({ where: { id: { not: originPort.id } } }) || await prisma.port.create({
    data: { name: 'Rotterdam', countryCode: 'NL', region: 'Europe', latitude: 51.92, longitude: 4.48 },
  })

  const shipment = await prisma.shipment.findFirst() || await prisma.shipment.create({
    data: {
      vesselId: vessel.id, originPortId: originPort.id, destPortId: destPort.id,
      status: 'In Transit', cargoType: 'Electronics', cargoWeight: 12500, cargoDesc: 'Consumer electronics',
      shipper: 'ACME Trading Co', consignee: 'Euro Retail BV', freightCost: 28500, currency: 'USD',
    },
  })

  // ── 3. Create documents for the shipment ──
  const docTypes = ['BOL', 'Commercial Invoice', 'Packing List', 'Customs Declaration']
  const docs = []

  for (const docType of docTypes) {
    const doc = await prisma.shipmentDocument.upsert({
      where: { id: `${docType}-${shipment.id}` },
      update: {},
      create: {
        id: `${docType}-${shipment.id}`,
        shipmentId: shipment.id,
        vesselId: vessel.id,
        docType,
        docName: `${docType} - ${shipment.bookingRef || 'SHP001'}`,
        status: 'Pending',
        issuedBy: createdUsers.Shipper?.email || 'shipper@acme.com',
        issuedAt: new Date(),
        fileFormat: 'PDF',
      },
    })
    docs.push(doc)
    console.log(`  Document: ${doc.docType} (${doc.status})`)
  }

  // ── 4. Create document workflows with different states ──
  const workflowConfigs = [
    { docIndex: 0, step: 'Approved', workflowType: 'Standard', priority: 'Normal' },
    { docIndex: 1, step: 'UnderReview', workflowType: 'Financial', priority: 'High' },
    { docIndex: 2, step: 'Submitted', workflowType: 'Standard', priority: 'Normal' },
    { docIndex: 3, step: 'Draft', workflowType: 'Compliance', priority: 'Urgent' },
  ]

  for (const config of workflowConfigs) {
    const doc = docs[config.docIndex]
    const slaDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
    if (config.step === 'Draft') slaDeadline.setDate(slaDeadline.getDate() - 1) // Create a breached SLA

    const workflow = await prisma.documentWorkflow.upsert({
      where: { documentId: doc.id },
      update: {},
      create: {
        documentId: doc.id,
        workflowType: config.workflowType,
        currentStep: config.step,
        priority: config.priority,
        requiredRole: config.workflowType === 'Compliance' ? 'Customs' : 'Admin',
        assignedToId: createdUsers.Admin?.id,
        submittedAt: config.step !== 'Draft' ? new Date() : null,
        reviewedAt: ['UnderReview', 'Approved'].includes(config.step) ? new Date() : null,
        completedAt: config.step === 'Approved' ? new Date() : null,
        slaDeadline,
        slaBreached: slaDeadline < new Date(),
      },
    })
    console.log(`  Workflow: ${doc.docType} -> ${config.step} (${config.priority})`)

    // ── 5. Create workflow action history ──
    const transitions: Array<{ action: string; from: string; to: string; by: string }> = []
    if (config.step === 'Approved') {
      transitions.push(
        { action: 'Submitted', from: 'Draft', to: 'Submitted', by: 'Shipper' },
        { action: 'Reviewed', from: 'Submitted', to: 'UnderReview', by: 'Manager' },
        { action: 'Approved', from: 'UnderReview', to: 'Approved', by: 'Admin' },
      )
    } else if (config.step === 'UnderReview') {
      transitions.push(
        { action: 'Submitted', from: 'Draft', to: 'Submitted', by: 'Shipper' },
        { action: 'Reviewed', from: 'Submitted', to: 'UnderReview', by: 'Manager' },
      )
    } else if (config.step === 'Submitted') {
      transitions.push(
        { action: 'Submitted', from: 'Draft', to: 'Submitted', by: 'Shipper' },
      )
    }

    for (const t of transitions) {
      await prisma.documentWorkflowAction.create({
        data: {
          workflowId: workflow.id,
          action: t.action,
          fromStep: t.from,
          toStep: t.to,
          performedBy: createdUsers[t.by]?.id || createdUsers.Admin!.id,
          actorRole: t.by,
          comment: `Auto-seed: ${t.action} transition`,
        },
      })
    }
  }

  // ── 6. Add audit log entries ──
  await prisma.auditLog.createMany({
    data: [
      { userId: createdUsers.Admin?.id, userRole: 'Admin', userOrg: 'Maritime Platform', action: 'user.create', resource: 'User', details: '{"count":7}' },
      { userId: createdUsers.Shipper?.id, userRole: 'Shipper', userOrg: 'ACME Trading Co', action: 'document.submit', resource: 'Document', details: '{"docType":"BOL"}' },
      { userId: createdUsers.Manager?.id, userRole: 'Manager', userOrg: 'Maritime Platform', action: 'workflow.create', resource: 'DocumentWorkflow', details: '{"count":4}' },
    ],
  })

  console.log(`\n  Seed complete! 7 users, ${docs.length} documents, ${workflowConfigs.length} workflows created.`)
  console.log('  Login credentials: email / password as listed above')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
