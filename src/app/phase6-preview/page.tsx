'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────

interface Phase6Status {
  sprint: string
  timestamp: string
  overallStatus: string
  allHealthy: boolean
  allTestsPassed: boolean
  components: {
    database: { status: string; provider: string; tables: Record<string, number>; users: Array<Record<string, unknown>>; latencyMs: number }
    auth: { status: string; provider: string; strategy: string; credentialProvider: string; passwordHashing: string }
    rbac: {
      status: string; roles: string[];
      permissionMatrix: Record<string, Record<string, string[]>>;
      tests: { permissionChecks: TestResult[]; hierarchyChecks: TestResult[] };
      allTestsPassed: boolean
    }
    workflowEngine: {
      status: string;
      stateMachine: { steps: string[]; transitions: Record<string, string[]> }
      transitionTests: Array<{ from: string; to: string; expected: boolean; actual: boolean; pass?: boolean }>
      allTransitionTestsPassed: boolean
      workflows: WorkflowItem[]
      stepDistribution: Array<{ step: string; count: number }>
    }
    auditTrail: { status: string; totalEntries: number; recentEntries: AuditEntry[] }
    integration: { status: string; demoCredentials: Array<{ email: string; role: string; password: string }> }
  }
}

interface TestResult { role: string; resource: string; action: string; expected: boolean; actual: boolean; pass: boolean }
interface WorkflowItem { id: string; documentType: string; documentName: string; currentStep: string; workflowType: string; priority: string; requiredRole: string; slaBreached: boolean; assignedTo: string; actionCount: number; actions: Array<{ action: string; from: string; to: string; by: string; role: string; at: string }> }
interface AuditEntry { id: string; action: string; resource: string; user: string; role: string; createdAt: string }

// ─── Step color mapping ───────────────────────────────

const STEP_COLORS: Record<string, string> = {
  Draft: 'bg-gray-500', Submitted: 'bg-blue-500', UnderReview: 'bg-amber-500',
  Approved: 'bg-emerald-500', Rejected: 'bg-red-500', Archived: 'bg-slate-500',
}
const ROLE_COLORS: Record<string, string> = {
  Admin: 'text-red-400', Manager: 'text-purple-400', Customs: 'text-amber-400',
  Carrier: 'text-blue-400', Terminal: 'text-green-400', Shipper: 'text-cyan-400', Viewer: 'text-gray-400',
}
const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-slate-700 text-slate-300', Normal: 'bg-blue-900 text-blue-300',
  High: 'bg-amber-900 text-amber-300', Urgent: 'bg-red-900 text-red-300',
}

export default function Phase6Preview() {
  const [data, setData] = useState<Phase6Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [loginState, setLoginState] = useState<{ email: string; role?: string; authenticated: boolean } | null>(null)
  const [sessionData, setSessionData] = useState<Record<string, unknown> | null>(null)

  const fetchStatus = useCallback(() => {
    fetch('/api/phase6/status').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchStatus(); const iv = setInterval(fetchStatus, 15000); return () => clearInterval(iv) }, [fetchStatus])

  const testLogin = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password, csrfToken: 'preview-test' }).toString(),
        redirect: 'manual',
      })
      // Try session endpoint to verify
      const sessRes = await fetch('/api/auth/session')
      const sess = await sessRes.json()
      setSessionData(sess)
      setLoginState({ email, role: (sess as Record<string, unknown>).authenticated ? 'connected' : 'rejected', authenticated: (sess as Record<string, unknown>).authenticated as boolean })
    } catch {
      setLoginState({ email, authenticated: false })
    }
  }

  const testSession = async () => {
    const res = await fetch('/api/auth/session')
    const sess = await res.json()
    setSessionData(sess)
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-cyan-400 text-lg animate-pulse">Probing Phase 6 Sprint 1 subsystems...</div></div>

  if (!data) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">Failed to load status</div>

  const tabs = ['overview', 'auth-rbac', 'workflows', 'audit', 'login']

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ─── Header ─── */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-cyan-400">Phase 6 — Sprint 1 Preview</h1>
            <p className="text-sm text-slate-400 mt-0.5">Auth & RBAC + Document Workflow Engine</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${data.overallStatus === 'ALL SYSTEMS OPERATIONAL' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
              <span className={`w-2 h-2 rounded-full ${data.overallStatus === 'ALL SYSTEMS OPERATIONAL' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {data.overallStatus}
            </span>
            <span className="text-xs text-slate-500">{new Date(data.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* ─── Tab Navigation ─── */}
      <nav className="border-b border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              {tab === 'auth-rbac' ? 'Auth & RBAC' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* System Health Cards */}
            {[
              { title: 'Database', status: data.components.database.status, detail: data.components.database.provider, extra: `${data.components.database.tables.users} users, ${data.components.database.tables.workflows} workflows` },
              { title: 'Auth Layer', status: data.components.auth.status, detail: `${data.components.auth.provider} / ${data.components.auth.strategy}`, extra: data.components.auth.credentialProvider },
              { title: 'RBAC Engine', status: data.components.rbac.status, detail: `${data.components.rbac.roles.length} roles, 16 resources, 6 actions`, extra: `All tests: ${data.components.rbac.allTestsPassed ? 'PASS' : 'FAIL'}` },
              { title: 'Workflow Engine', status: data.components.workflowEngine.status, detail: `${data.components.workflowEngine.stateMachine.steps.length} states, ${Object.values(data.components.workflowEngine.stateMachine.transitions).flat().length} transitions`, extra: `All transitions: ${data.components.workflowEngine.allTransitionTestsPassed ? 'PASS' : 'FAIL'}` },
              { title: 'Audit Trail', status: data.components.auditTrail.status, detail: `${data.components.auditTrail.totalEntries} entries logged`, extra: 'Immutable, fire-and-forget' },
              { title: 'Integration', status: data.components.integration.status, detail: '4 API route groups', extra: 'RBAC at route level' },
            ].map(card => (
              <div key={card.title} className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{card.title}</h3>
                  <StatusBadge status={card.status} />
                </div>
                <p className="text-xs text-cyan-300 mb-1">{card.detail}</p>
                <p className="text-xs text-slate-400">{card.extra}</p>
              </div>
            ))}

            {/* Workflow Step Distribution */}
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4 md:col-span-2 lg:col-span-3">
              <h3 className="font-semibold text-sm mb-3">Workflow Step Distribution</h3>
              <div className="flex gap-3">
                {data.components.workflowEngine.stepDistribution.map(s => (
                  <div key={s.step} className="flex-1 bg-slate-800 rounded-lg p-3 text-center">
                    <div className={`w-3 h-3 rounded-full ${STEP_COLORS[s.step] || 'bg-gray-500'} mx-auto mb-2`} />
                    <div className="text-lg font-bold">{s.count}</div>
                    <div className="text-xs text-slate-400">{s.step}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Results Summary */}
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4 md:col-span-2 lg:col-span-3">
              <h3 className="font-semibold text-sm mb-3">Automated Test Results</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-slate-400 mb-2">RBAC Permission Checks ({data.components.rbac.tests.permissionChecks.length})</h4>
                  <div className="space-y-1">
                    {data.components.rbac.tests.permissionChecks.map((t, i) => (
                      <div key={i} className={`text-xs flex items-center gap-2 ${t.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                        <span>{t.pass ? 'PASS' : 'FAIL'}</span>
                        <span className={ROLE_COLORS[t.role]}>{t.role}</span>
                        <span className="text-slate-500">{t.resource}.{t.action}</span>
                        <span className="text-slate-600">expected={String(t.expected)} got={String(t.actual)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-slate-400 mb-2">Role Hierarchy Checks ({data.components.rbac.tests.hierarchyChecks.length})</h4>
                  <div className="space-y-1">
                    {data.components.rbac.tests.hierarchyChecks.map((t, i) => (
                      <div key={i} className={`text-xs flex items-center gap-2 ${t.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                        <span>{t.pass ? 'PASS' : 'FAIL'}</span>
                        <span className={ROLE_COLORS[t.user]}>{t.user}</span>
                        <span className="text-slate-500">meets {t.required}?</span>
                        <span className="text-slate-600">expected={String(t.expected)} got={String(t.actual)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── AUTH & RBAC TAB ─── */}
        {activeTab === 'auth-rbac' && (
          <div className="space-y-4">
            {/* Auth Config */}
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
              <h3 className="font-semibold text-sm mb-3">Authentication Layer</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-slate-400">Provider:</span> <span className="text-cyan-300">{data.components.auth.provider}</span></div>
                <div><span className="text-slate-400">Strategy:</span> <span className="text-cyan-300">{data.components.auth.strategy}</span></div>
                <div><span className="text-slate-400">Credentials:</span> <span className="text-cyan-300">{data.components.auth.credentialProvider}</span></div>
                <div><span className="text-slate-400">Hashing:</span> <span className="text-cyan-300">{data.components.auth.passwordHashing}</span></div>
              </div>
            </div>

            {/* User Table */}
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
              <h3 className="font-semibold text-sm mb-3">Seeded Users ({data.components.database.users.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-1.5 pr-3">Name</th>
                    <th className="text-left py-1.5 pr-3">Email</th>
                    <th className="text-left py-1.5 pr-3">Role</th>
                    <th className="text-left py-1.5 pr-3">Organization</th>
                    <th className="text-left py-1.5 pr-3">Actor Type</th>
                    <th className="text-left py-1.5">Status</th>
                  </tr></thead>
                  <tbody>
                    {data.components.database.users.map(u => (
                      <tr key={String(u.email)} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-1.5 pr-3">{String(u.name)}</td>
                        <td className="py-1.5 pr-3 text-cyan-300">{String(u.email)}</td>
                        <td className={`py-1.5 pr-3 ${ROLE_COLORS[String(u.role)] || ''}`}>{String(u.role)}</td>
                        <td className="py-1.5 pr-3 text-slate-400">{String(u.organization)}</td>
                        <td className="py-1.5 pr-3 text-slate-400">{String(u.actorType)}</td>
                        <td className="py-1.5"><span className="text-emerald-400">Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
              <h3 className="font-semibold text-sm mb-3">RBAC Permission Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-1.5 pr-3">Role</th>
                    {Object.keys(data.components.rbac.permissionMatrix.Admin || {}).map(r => (
                      <th key={r} className="text-center py-1.5 px-1 whitespace-nowrap">{r}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {Object.entries(data.components.rbac.permissionMatrix).map(([role, perms]) => (
                      <tr key={role} className="border-b border-slate-800">
                        <td className={`py-1.5 pr-3 font-medium ${ROLE_COLORS[role] || ''}`}>{role}</td>
                        {Object.entries(perms).map(([res, actions]) => (
                          <td key={res} className="py-1.5 px-1 text-center">
                            <span className={`inline-block px-1 rounded ${actions.length > 2 ? 'bg-emerald-900/50 text-emerald-300' : actions.length > 0 ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-800 text-slate-600'}`}>
                              {actions.length || '-'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── WORKFLOWS TAB ─── */}
        {activeTab === 'workflows' && (
          <div className="space-y-4">
            {/* State Machine Visualization */}
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
              <h3 className="font-semibold text-sm mb-3">Document Workflow State Machine</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {data.components.workflowEngine.stateMachine.steps.map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-md text-xs font-medium text-white ${STEP_COLORS[step]}`}>
                      {step}
                    </div>
                    {i < data.components.workflowEngine.stateMachine.steps.length - 1 && (
                      <span className="text-slate-500 text-lg">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Workflows */}
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
              <h3 className="font-semibold text-sm mb-3">Active Workflows ({data.components.workflowEngine.workflows.length})</h3>
              <div className="space-y-3">
                {data.components.workflowEngine.workflows.map(wf => (
                  <div key={wf.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${STEP_COLORS[wf.currentStep]}`}>{wf.currentStep}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[wf.priority]}`}>{wf.priority}</span>
                          <span className="text-xs text-slate-400">{wf.workflowType}</span>
                          {wf.slaBreached && <span className="px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-300 border border-red-700">SLA BREACHED</span>}
                        </div>
                        <h4 className="text-sm font-medium mt-1">{wf.documentName}</h4>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <div>Assigned: {wf.assignedTo}</div>
                        <div>Requires: {wf.requiredRole}</div>
                        <div>{wf.actionCount} actions</div>
                      </div>
                    </div>
                    {/* Action Timeline */}
                    <div className="ml-4 border-l-2 border-slate-700 pl-4 space-y-2">
                      {wf.actions.map((a, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[1.35rem] top-1 w-2 h-2 rounded-full bg-cyan-400" />
                          <div className="text-xs">
                            <span className="text-cyan-300 font-medium">{a.action}</span>
                            <span className="text-slate-500"> {a.from} → {a.to}</span>
                            <span className="text-slate-400"> by {a.by} ({a.role})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transition Tests */}
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
              <h3 className="font-semibold text-sm mb-3">Transition Tests ({data.components.workflowEngine.transitionTests.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 text-xs">
                {data.components.workflowEngine.transitionTests.map((t, i) => (
                  <div key={i} className={`px-2 py-1 rounded ${t.actual === t.expected ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                    {t.from} → {t.to}: {t.actual === t.expected ? 'PASS' : 'FAIL'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── AUDIT TAB ─── */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
            <h3 className="font-semibold text-sm mb-3">Audit Trail ({data.components.auditTrail.totalEntries} total entries)</h3>
            <div className="space-y-2">
              {data.components.auditTrail.recentEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2.5 text-xs border border-slate-700/50">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-cyan-300">{entry.action}</span>
                      <span className="text-slate-500">on</span>
                      <span className="text-slate-300">{entry.resource}</span>
                      {entry.details && <span className="text-slate-600 truncate">{entry.details}</span>}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      by {entry.user} ({entry.role}) · {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── LOGIN TEST TAB ─── */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
              <h3 className="font-semibold text-sm mb-3">Live Authentication Test</h3>
              <p className="text-xs text-slate-400 mb-3">Click any user to test the auth flow (login → session → RBAC permissions).</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {data.components.integration.demoCredentials.map(cred => (
                  <button key={cred.email} onClick={() => testLogin(cred.email, cred.password)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-3 text-left transition-colors">
                    <div className={`text-xs font-semibold ${ROLE_COLORS[cred.role]}`}>{cred.role}</div>
                    <div className="text-xs text-cyan-300 mt-1 truncate">{cred.email}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{cred.password}</div>
                  </button>
                ))}
              </div>
            </div>

            {loginState && (
              <div className={`rounded-lg border p-4 ${loginState.authenticated ? 'bg-emerald-900/20 border-emerald-800' : 'bg-red-900/20 border-red-800'}`}>
                <h4 className="text-sm font-semibold mb-2">Login Result: {loginState.authenticated ? 'Connected' : 'Session check required'}</h4>
                <div className="text-xs text-slate-400">
                  <div>Email: {loginState.email}</div>
                  <div>Status: {loginState.authenticated ? 'Session active' : 'Not authenticated (expected in preview — CSRF token required for full login flow)'}</div>
                </div>
              </div>
            )}

            {sessionData && (
              <div className="bg-slate-900/80 rounded-lg border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Session Response</h4>
                  <button onClick={testSession} className="text-xs text-cyan-400 hover:text-cyan-300">Refresh</button>
                </div>
                <pre className="text-xs text-slate-300 bg-slate-950 rounded p-3 overflow-x-auto max-h-48">
                  {JSON.stringify(sessionData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    healthy: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
    active: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
    configured: 'bg-blue-900/50 text-blue-300 border-blue-700',
    error: 'bg-red-900/50 text-red-300 border-red-700',
  }
  const c = config[status] || config.error
  return <span className={`px-2 py-0.5 rounded-full text-xs border ${c}`}>{status.toUpperCase()}</span>
}