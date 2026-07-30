'use client'

import { useAuth } from '@/hooks/useAuth'
import { useSession } from 'next-auth/react'
import {
  Shield, LogOut, Settings, UserCircle, ChevronDown, Key,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

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

export default function UserBar() {
  const { user, role, roleMeta, isAuthenticated, signOut } = useAuth()
  const { status } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <span className="text-xs text-muted-foreground">Loading session...</span>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Link href="/login">
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
          <Key className="h-3 w-3" />
          Sign In
        </Button>
      </Link>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-2 transition-colors hover:bg-muted/50"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
          <UserCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-xs font-medium text-foreground leading-tight">{user.name || user.email}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{user.organization || 'Platform'}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex ${roleColor(role)}`}>
          {role}
        </Badge>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <Card className="absolute right-0 top-full z-50 mt-2 w-72 border-border bg-card shadow-xl">
          <CardContent className="p-0">
            {/* User Info */}
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${roleColor(role)}`}>{role}</Badge>
                    <span className="text-[10px] text-muted-foreground">{user.actorType || 'Internal'}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Permission Summary */}
            <div className="p-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Access Level</p>
              <p className="text-xs text-muted-foreground">{roleMeta?.description || 'Read-only access'}</p>
            </div>

            <Separator className="bg-border" />

            {/* Actions */}
            <div className="p-2">
              {(role === 'Admin' || role === 'Manager') && (
                <Link href="/admin/users" onClick={() => setOpen(false)}>
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors">
                    <Settings className="h-3.5 w-3.5" />
                    User Management
                  </button>
                </Link>
              )}
              <button
                onClick={() => { setOpen(false); signOut() }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}