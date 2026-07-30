'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  FileText, CheckCircle2, XCircle, Clock, AlertTriangle,
  ArrowRight, User, Building, RefreshCw, Filter,
  ChevronRight, Send, Archive, RotateCcw, UserPlus,
  MessageSquare, Eye, Shield, Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ─── Types ──────────────────────────────────────────────────────────

interface WorkflowAction {
  id: string
  action: string
  fromStep: string
  toStep: string
  performedBy: string
  actorRole: string | null
  comment: string | null
  createdAt: string
  performer?: { id: string; name: string | null; role: string; organization: string | null }
}

interface AssignedUser {
  id: string
  name: string | null
  email: string
  role: string
  organization: string | null
}

interface ShipmentBrief {
  id: string
  billOfLading: string | null
  status: string
  originPort: { name: string; countryCode: string }
  destPort: { name: string; countryCode: string }
  vessel?: { name: string; mmsi: number; flagCountry: string | null }
}

interface DocumentBrief {
  id: string
  docType: string
  docName: string
  docRef: string | null
  status: string
  shipment: ShipmentBrief
}

interface Workflow {
  id: string
  documentId: string
  workflowType: string
  currentStep: string
  priority: string
  requiredRole: string | null
  assignedToId: string | null
  submittedAt: string | null
  reviewedAt: string | null
  completedAt: string | null
  slaDeadline: string | null
  slaBreached: boolean
  rejectionReason: string | null
  remarks: string | null
  document: DocumentBrief
  assignedTo: AssignedUser | null
  actions: WorkflowAction[]
}

interface StepDist { step: string; count: number }

// ─── Helpers ────────────────────────────────────────────────────────

function stepColor(step: string): string {
  switch (step) {
    case 'Draft': return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    case 'Submitted': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'UnderReview': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'Approved': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'Rejected': return 'bg-red-500/10 text-red-400 border-red-500/30'
    case 'Archived': return 'bg-muted text-muted-foreground border-border'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

function priorityColor(p: string): string {
  switch (p) {
    case 'Urgent': return 'bg-red-500/10 text-red-400 border-red-500/30'
    case 'High': return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
    case 'Low': return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    default: return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  }
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ───────────────────────────────────────────────

export default function DocumentWorkflowPanel() {
  const { data: session } = useSession()
  const userRole = (session?.user as Record<string, unknown>)?.role as string || 'Viewer'
  const userName = (session?.user as Record<string, unknown>)?.name as string || 'User'

  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [stepDist, setStepDist] = useState<StepDist[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStep, setFilterStep] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const fetchWorkflows = useCallback(async () => {
 setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStep !== 'all') params.set('step', filterStep)
      params.set('limit', '50')
      const res = await fetch(`/api/documents/workflows?${params}`)
      if (res.ok) {
        const data = await res.json()
        setWorkflows(data.workflows || [])
        setTotal(data.total || 0)
        setStepDist(data.stepDistribution || [])
      }
    } catch (e) {
      console.error('Failed to fetch workflows:', e)
    } finally {
      setLoading(false)
    }
  }, [filterStep])

  useEffect(() => { fetchWorkflows() }, [fetchWorkflows])

  async function handleAction(workflowId: string, action: string) {
    setActionLoading(workflowId)
    try {
      const res = await fetch(`/api/documents/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: comment || undefined }),
      })
      if (res.ok) {
        setComment('')
        setExpandedId(null)
        fetchWorkflows()
      } else {
        const err = await res.json()
        alert(err.error || 'Action failed')
      }
    } catch (e) {
      console.error('Action failed:', e)
    } finally {
      setActionLoading(null)
    }
  }

  const canApprove = ['Admin', 'Manager', 'Customs'].includes(userRole)
  const canCreate = ['Admin', 'Manager', 'Shipper', 'Carrier'].includes(userRole)

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {userName}
            <Badge variant="outline" className="ml-2 text-[10px]">{userRole}</Badge>
          </p>
          <p className="text-xs text-muted-foreground">
            {(session?.user as Record<string, unknown>)?.organization || 'Maritime Platform'}
            {' | '}{canApprove ? 'Can approve documents' : 'View-only access'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWorkflows}>
          <RefreshCw className={`mr-1.5 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-6 gap-2">
        {['Submitted', 'UnderReview', 'Approved', 'Rejected', 'Archived', 'Draft'].map(step => {
          const dist = stepDist.find(s => s.step === step)
          const count = dist?.count || 0
          return (
            <button
              key={step}
              onClick={() => setFilterStep(filterStep === step ? 'all' : step)}
              className={`rounded-lg border p-2 text-center transition-colors ${
                filterStep === step
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card/50 hover:bg-muted/50'
              }`}
            >
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-[10px] text-muted-foreground">{step}</p>
            </button>
          )
        })}
      </div>

      {/* Workflow List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <span className="ml-3 text-sm text-muted-foreground">Loading workflows...</span>
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/70">
          <FileText className="mb-2 h-8 w-8" />
          <p className="text-sm">No document workflows found</p>
          <p className="text-xs">Create workflows from the Documents tab or submit new documents</p>
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {workflows.map(wf => {
              const expanded = expandedId === wf.id
              return (
                <Card key={wf.id} className={`border-border transition-colors ${wf.slaBreached ? 'border-red-500/30' : ''}`}>
                  <CardContent className="p-4">
                    {/* Header Row */}
                    <div
                      className="flex cursor-pointer items-center gap-3"
                      onClick={() => setExpandedId(expanded ? null : wf.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{wf.document.docType}</span>
                          <Badge variant="outline" className={`text-[10px] ${stepColor(wf.currentStep)}`}>
                            {wf.currentStep}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${priorityColor(wf.priority)}`}>
                            {wf.priority}
                          </Badge>
                          {wf.slaBreached && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
                              <AlertTriangle className="mr-1 h-2.5 w-2.5" />SLA
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          {wf.document.docName}
                          {wf.document.shipment.billOfLading && ` | B/L: ${wf.document.shipment.billOfLading}`}
                          {' | '}{wf.document.shipment.originPort.name} → {wf.document.shipment.destPort.name}
                        </p>
                      </div>
                      <div className="hidden items-center gap-3 sm:flex">
                        {wf.assignedTo && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {wf.assignedTo.name}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {wf.submittedAt ? timeAgo(wf.submittedAt) : '—'}
                        </span>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expanded && (
                      <div className="mt-4 space-y-4 border-t border-border pt-4">
                        {/* Shipment Info */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Route</p>
                            <p className="font-medium text-foreground">
                              {wf.document.shipment.originPort.name} ({wf.document.shipment.originPort.countryCode})
                              <ArrowRight className="mx-1 inline h-3 w-3" />
                              {wf.document.shipment.destPort.name} ({wf.document.shipment.destPort.countryCode})
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Vessel</p>
                            <p className="font-medium text-foreground">
                              {wf.document.shipment.vessel?.name || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Workflow Type</p>
                            <p className="font-medium text-foreground">{wf.workflowType}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Required Role</p>
                            <p className="font-medium text-foreground">{wf.requiredRole || 'Admin'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">SLA Deadline</p>
                            <p className={`font-medium ${wf.slaBreached ? 'text-red-400' : 'text-foreground'}`}>
                              {formatDate(wf.slaDeadline)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Assigned To</p>
                            <p className="font-medium text-foreground">
                              {wf.assignedTo ? `${wf.assignedTo.name} (${wf.assignedTo.role})` : 'Unassigned'}
                            </p>
                          </div>
                        </div>

                        {/* Action History Timeline */}
                        <div>
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Action History</p>
                          <div className="space-y-2">
                            {wf.actions.map((act, i) => (
                              <div key={act.id} className="flex items-start gap-3 rounded-lg bg-muted/30 p-2.5">
                                <div className="mt-0.5">
                                  {act.toStep === 'Approved' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                                  ) : act.toStep === 'Rejected' ? (
                                    <XCircle className="h-4 w-4 text-red-400" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-blue-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground">
                                    <span className="font-medium">{act.action}</span>
                                    <span className="text-muted-foreground"> {act.fromStep} → {act.toStep}</span>
                                  </p>
                                  {act.comment && (
                                    <p className="mt-0.5 text-xs text-muted-foreground italic">"{act.comment}"</p>
                                  )}
                                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    {act.performer?.name || 'System'} ({act.actorRole || '—'})
                                    {' | '}{timeAgo(act.createdAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 border-t border-border pt-3">
                          <Input
                            placeholder="Add a comment..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            className="flex-1 h-8 text-xs"
                          />
                          {wf.currentStep === 'Submitted' && canApprove && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleAction(wf.id, 'approve')}
                              disabled={actionLoading === wf.id}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3 text-green-400" />
                              Approve
                            </Button>
                          )}
                          {(wf.currentStep === 'Submitted' || wf.currentStep === 'UnderReview') && canApprove && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => handleAction(wf.id, 'reject')}
                              disabled={actionLoading === wf.id}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          )}
                          {wf.currentStep === 'Rejected' && canCreate && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleAction(wf.id, 'resubmit')}
                              disabled={actionLoading === wf.id}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Resubmit
                            </Button>
                          )}
                          {wf.currentStep === 'Approved' && canApprove && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleAction(wf.id, 'archive')}
                              disabled={actionLoading === wf.id}
                            >
                              <Archive className="mr-1 h-3 w-3" />
                              Archive
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <p className="py-4 text-center text-xs text-muted-foreground">
            Showing {workflows.length} of {total} workflows
          </p>
        </ScrollArea>
      )}
    </div>
  )
}
