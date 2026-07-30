'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import {
  ArrowLeft, Users, Plus, Shield, Trash2, RefreshCw, UserCircle,
  CheckCircle2, XCircle, Clock, Search, Building, Mail,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ROLES, ROLE_META } from '@/lib/auth/rbac'
import type { Role } from '@/lib/auth/rbac'

// ─── Types ──────────────────────────────────────────────────────────

interface UserRecord {
  id: string
  email: string
  name: string | null
  role: string
  organization: string | null
  actorType: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

// ─── Helpers ────────────────────────────────────────────────────────

function roleColor(role: string): string {
  switch (role) {
    case 'Admin': return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'Manager': return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    case 'Customs': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'Carrier': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'Terminal': return 'bg-green-500/15 text-green-400 border-green-500/30'
    case 'Shipper': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
    default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30'
  }
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Main Component ───────────────────────────────────────────────

export default function UserManagementPage() {
  const { user, role, can, meetsRole } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<string>('Viewer')
  const [formOrg, setFormOrg] = useState('')
  const [formActor, setFormActor] = useState('Internal')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      } else if (res.status === 401) {
        router.push('/login')
      }
    } catch (e) {
      console.error('Failed to fetch users:', e)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Gate: only Admin/Manager can access
  if (!meetsRole('Manager')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="border-border max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <Shield className="h-10 w-10 text-red-400" />
            <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground text-center">You need Manager or Admin role to access user management.</p>
            <Link href="/"><Button variant="outline" size="sm">Back to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filtered = users.filter(u =>
    !filter ||
    u.email.toLowerCase().includes(filter.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(filter.toLowerCase()) ||
    u.role.toLowerCase().includes(filter.toLowerCase()) ||
    (u.organization || '').toLowerCase().includes(filter.toLowerCase())
  )

  const roleCounts: Record<string, number> = {}
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1 })

  async function handleCreate() {
    setCreateLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail,
          name: formName || undefined,
          password: formPassword,
          role: formRole,
          organization: formOrg || undefined,
          actorType: formActor,
        }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setFormEmail(''); setFormName(''); setFormPassword(''); setFormOrg('')
        setFormRole('Viewer'); setFormActor('Internal')
        fetchUsers()
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to create user')
      }
    } catch (e) {
      setError('Network error')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage platform users, roles, and access control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {role === 'Admin' && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New User
              </Button>
            )}
          </div>
        </div>

        {/* Role Distribution */}
        <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {ROLES.map(r => {
            const meta = ROLE_META[r as Role]
            const count = roleCounts[r] || 0
            return (
              <div key={r} className="rounded-lg border border-border bg-card/50 p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{count}</p>
                <Badge variant="outline" className={`text-[10px] ${roleColor(r)}`}>{r}</Badge>
              </div>
            )
          })}
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, role, or organization..."
            className="pl-10 bg-muted border-border"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        {/* Users Table */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground">User</TableHead>
                    <TableHead className="text-xs text-muted-foreground hidden sm:table-cell">Organization</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Role</TableHead>
                    <TableHead className="text-xs text-muted-foreground hidden md:table-cell">Actor Type</TableHead>
                    <TableHead className="text-xs text-muted-foreground hidden lg:table-cell">Status</TableHead>
                    <TableHead className="text-xs text-muted-foreground hidden lg:table-cell">Last Login</TableHead>
                    <TableHead className="text-xs text-muted-foreground hidden lg:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{u.name || u.email}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" />{u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {u.organization && <Building className="h-3 w-3" />}
                          {u.organization || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${roleColor(u.role)}`}>{u.role}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{u.actorType || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {u.isActive ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                            <CheckCircle2 className="mr-1 h-2.5 w-2.5" />Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
                            <XCircle className="mr-1 h-2.5 w-2.5" />Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {u.lastLoginAt ? timeAgo(u.lastLoginAt) : <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Never</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {filtered.length} of {users.length} users
              </p>
              <Badge variant="outline" className="border-border text-[10px]">
                {role} access
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="border-border bg-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create New User
              </DialogTitle>
              <DialogDescription>Add a new user to the platform with a specific role and organization.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email *</Label>
                  <Input
                    type="email" placeholder="user@company.com"
                    value={formEmail} onChange={e => setFormEmail(e.target.value)}
                    className="bg-muted/50 text-sm" required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Password *</Label>
                  <Input
                    type="password" placeholder="Min 8 chars"
                    value={formPassword} onChange={e => setFormPassword(e.target.value)}
                    className="bg-muted/50 text-sm" required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={formName} onChange={e => setFormName(e.target.value)}
                  className="bg-muted/50 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Role *</Label>
                  <Select value={formRole} onValueChange={setFormRole}>
                    <SelectTrigger className="bg-muted/50 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r} value={r}>{r} — {ROLE_META[r as Role].description.split(' ').slice(0, 3).join(' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Actor Type</Label>
                  <Select value={formActor} onValueChange={setFormActor}>
                    <SelectTrigger className="bg-muted/50 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Internal">Internal</SelectItem>
                      <SelectItem value="Shipper">Shipper</SelectItem>
                      <SelectItem value="Carrier">Carrier</SelectItem>
                      <SelectItem value="CustomsBroker">Customs Broker</SelectItem>
                      <SelectItem value="TerminalOperator">Terminal Operator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Organization</Label>
                <Input
                  placeholder="Company name"
                  value={formOrg} onChange={e => setFormOrg(e.target.value)}
                  className="bg-muted/50 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={createLoading || !formEmail || !formPassword}>
                  {createLoading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Create User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
