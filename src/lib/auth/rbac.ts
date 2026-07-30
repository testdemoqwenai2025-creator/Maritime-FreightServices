/**
 * RBAC (Role-Based Access Control) for the Maritime Analytics Platform
 * Phase 6: Digital Supply Chain — Multi-party access control
 *
 * Role Hierarchy (highest to lowest privilege):
 *   Admin > Manager > Customs > Carrier > Terminal > Shipper > Viewer
 *
 * Each role has specific permission sets for resources and actions.
 */

// ─── Role Definitions ───────────────────────────────────────────────

export const ROLES = [
  'Admin',
  'Manager',
  'Customs',
  'Carrier',
  'Terminal',
  'Shipper',
  'Viewer',
] as const

export type Role = (typeof ROLES)[number]

// Actor types for multi-party identification
export const ACTOR_TYPES = [
  'Internal',
  'Shipper',
  'Carrier',
  'CustomsBroker',
  'TerminalOperator',
] as const

export type ActorType = (typeof ACTOR_TYPES)[number]

// ─── Permission Matrix ─────────────────────────────────────────────

// Resources that can be controlled
export type Resource =
  | 'dashboard'
  | 'shipments'
  | 'vessels'
  | 'ports'
  | 'containers'
  | 'documents'
  | 'trade-data'
  | 'carriers'
  | 'charters'
  | 'bookings'
  | 'ai-predictions'
  | 'state-machine'
  | 'users'
  | 'audit-log'
  | 'workflows'
  | 'compliance'
  | 'esg'

// Actions that can be performed
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'

// Role hierarchy level (higher number = more privilege)
const ROLE_LEVEL: Record<Role, number> = {
  Admin: 70,
  Manager: 60,
  Customs: 50,
  Carrier: 40,
  Terminal: 35,
  Shipper: 30,
  Viewer: 10,
}

// Full permission matrix: which roles can do what on which resources
const PERMISSIONS: Record<Role, Record<Resource, Action[]>> = {
  Admin: {
    dashboard: ['view', 'export'],
    shipments: ['view', 'create', 'edit', 'delete', 'export'],
    vessels: ['view', 'create', 'edit', 'delete', 'export'],
    ports: ['view', 'create', 'edit', 'delete', 'export'],
    containers: ['view', 'create', 'edit', 'delete', 'export'],
    documents: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
    'trade-data': ['view', 'export'],
    carriers: ['view', 'create', 'edit', 'delete', 'export'],
    charters: ['view', 'create', 'edit', 'delete', 'export'],
    bookings: ['view', 'create', 'edit', 'delete', 'export'],
    'ai-predictions': ['view', 'export'],
    'state-machine': ['view', 'edit'],
    users: ['view', 'create', 'edit', 'delete'],
    'audit-log': ['view', 'export'],
    workflows: ['view', 'create', 'edit', 'delete', 'approve'],
    compliance: ['view', 'edit', 'approve'],
    esg: ['view', 'export'],
  },
  Manager: {
    dashboard: ['view', 'export'],
    shipments: ['view', 'create', 'edit', 'export'],
    vessels: ['view', 'export'],
    ports: ['view', 'export'],
    containers: ['view', 'export'],
    documents: ['view', 'create', 'edit', 'approve', 'export'],
    'trade-data': ['view', 'export'],
    carriers: ['view', 'export'],
    charters: ['view', 'export'],
    bookings: ['view', 'create', 'edit', 'export'],
    'ai-predictions': ['view', 'export'],
    'state-machine': ['view'],
    users: ['view'],
    'audit-log': ['view'],
    workflows: ['view', 'create', 'edit', 'approve'],
    compliance: ['view', 'approve'],
    esg: ['view', 'export'],
  },
  Customs: {
    dashboard: ['view'],
    shipments: ['view'],
    vessels: ['view'],
    ports: ['view'],
    containers: ['view'],
    documents: ['view', 'approve'],
    'trade-data': ['view'],
    carriers: ['view'],
    charters: ['view'],
    bookings: ['view'],
    'ai-predictions': ['view'],
    'state-machine': ['view'],
    users: [],
    'audit-log': ['view'],
    workflows: ['view', 'approve'],
    compliance: ['view', 'approve', 'edit'],
    esg: ['view'],
  },
  Carrier: {
    dashboard: ['view'],
    shipments: ['view', 'create'],
    vessels: ['view'],
    ports: ['view'],
    containers: ['view'],
    documents: ['view', 'create'],
    'trade-data': ['view'],
    carriers: ['view'],
    charters: ['view'],
    bookings: ['view', 'create'],
    'ai-predictions': ['view'],
    'state-machine': ['view'],
    users: [],
    'audit-log': [],
    workflows: ['view', 'create'],
    compliance: ['view'],
    esg: ['view'],
  },
  Terminal: {
    dashboard: ['view'],
    shipments: ['view'],
    vessels: ['view'],
    ports: ['view'],
    containers: ['view'],
    documents: ['view'],
    'trade-data': [],
    carriers: ['view'],
    charters: ['view'],
    bookings: ['view'],
    'ai-predictions': ['view'],
    'state-machine': ['view'],
    users: [],
    'audit-log': [],
    workflows: ['view'],
    compliance: ['view'],
    esg: ['view'],
  },
  Shipper: {
    dashboard: ['view'],
    shipments: ['view', 'create'],
    vessels: ['view'],
    ports: ['view'],
    containers: ['view'],
    documents: ['view', 'create'],
    'trade-data': ['view'],
    carriers: ['view'],
    charters: [],
    bookings: ['view', 'create'],
    'ai-predictions': ['view'],
    'state-machine': ['view'],
    users: [],
    'audit-log': [],
    workflows: ['view', 'create'],
    compliance: ['view'],
    esg: [],
  },
  Viewer: {
    dashboard: ['view'],
    shipments: ['view'],
    vessels: ['view'],
    ports: ['view'],
    containers: ['view'],
    documents: ['view'],
    'trade-data': ['view'],
    carriers: ['view'],
    charters: ['view'],
    bookings: ['view'],
    'ai-predictions': ['view'],
    'state-machine': ['view'],
    users: [],
    'audit-log': [],
    workflows: ['view'],
    compliance: ['view'],
    esg: ['view'],
  },
}

// ─── Permission Check Functions ─────────────────────────────────────

/**
 * Check if a role has permission to perform an action on a resource.
 */
export function hasPermission(
  role: string,
  resource: Resource,
  action: Action
): boolean {
  const rolePerms = PERMISSIONS[role as Role]
  if (!rolePerms) return false
  return rolePerms[resource]?.includes(action) ?? false
}

/**
 * Check if a role meets or exceeds a minimum required role level.
 * Used for workflow approval chains.
 */
export function meetsRoleRequirement(
  userRole: string,
  requiredRole: string
): boolean {
  const userLevel = ROLE_LEVEL[userRole as Role] ?? 0
  const requiredLevel = ROLE_LEVEL[requiredRole as Role] ?? 0
  return userLevel >= requiredLevel
}

/**
 * Get all permissions for a given role.
 */
export function getRolePermissions(role: string): Record<Resource, Action[]> {
  return PERMISSIONS[role as Role] ?? PERMISSIONS.Viewer
}

/**
 * Check if user can access a specific API route based on their role.
 * Maps API path patterns to resources and actions.
 */
export function checkApiAccess(
  role: string,
  method: string,
  pathname: string
): boolean {
  // Admin bypasses all checks
  if (role === 'Admin') return true

  const map = (pattern: string, resource: Resource, action: Action) => {
    if (pathname.match(pattern)) return hasPermission(role, resource, action)
    return null
  }

  // Try specific mappings first
  const checks = [
    () => map('/api/users', 'users', method === 'GET' ? 'view' : 'create'),
    () => map('/api/audit-log', 'audit-log', 'view'),
    () => map('/api/documents/workflows', 'workflows', method === 'GET' ? 'view' : 'create'),
    () => map('/api/shipments/.*/events', 'shipments', method === 'POST' ? 'create' : 'view'),
    () => map('/api/shipments', 'shipments', method === 'GET' ? 'view' : 'create'),
    () => map('/api/vessels', 'vessels', 'view'),
    () => map('/api/ai/', 'ai-predictions', 'view'),
    () => map('/api/state-machine', 'state-machine', 'view'),
    () => map('/api/dashboard', 'dashboard', 'view'),
    () => map('/api/trade-data', 'trade-data', 'view'),
  ]

  for (const check of checks) {
    const result = check()
    if (result !== null) return result
  }

  // Default: allow view, deny mutations for non-admins
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
}

/**
 * Get role display metadata (color, description, icon hint).
 */
export const ROLE_META: Record<Role, { color: string; description: string; actorTypes: ActorType[] }> = {
  Admin: { color: 'red', description: 'Full platform access with user management', actorTypes: ['Internal'] },
  Manager: { color: 'purple', description: 'Operational management with approval authority', actorTypes: ['Internal'] },
  Customs: { color: 'amber', description: 'Customs clearance and compliance approval', actorTypes: ['CustomsBroker'] },
  Carrier: { color: 'blue', description: 'Carrier operations: vessel and booking management', actorTypes: ['Carrier'] },
  Terminal: { color: 'green', description: 'Terminal operations: port and container visibility', actorTypes: ['TerminalOperator'] },
  Shipper: { color: 'cyan', description: 'Shipper operations: shipment and document creation', actorTypes: ['Shipper'] },
  Viewer: { color: 'gray', description: 'Read-only access to all public data', actorTypes: ['Internal', 'Shipper', 'Carrier'] },
}

// ─── Document Workflow Step Machine ────────────────────────────────

export const WORKFLOW_STEPS = ['Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'Archived'] as const
export type WorkflowStep = (typeof WORKFLOW_STEPS)[number]

export const VALID_TRANSITIONS: Record<WorkflowStep, WorkflowStep[]> = {
  Draft: ['Submitted'],
  Submitted: ['UnderReview', 'Rejected'],
  UnderReview: ['Approved', 'Rejected'],
  Approved: ['Archived'],
  Rejected: ['Submitted'], // resubmit
  Archived: [], // terminal
}

export function isValidWorkflowTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from as WorkflowStep]?.includes(to as WorkflowStep) ?? false
}
