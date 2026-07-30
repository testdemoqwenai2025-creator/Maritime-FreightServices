'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Ship, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEMO_ACCOUNTS = [
  { email: 'admin@maritime.io', password: 'admin123', role: 'Admin', org: 'Maritime Platform', color: 'text-red-400' },
  { email: 'manager@globalship.com', password: 'manager123', role: 'Manager', org: 'Global Shipping Co', color: 'text-purple-400' },
  { email: 'customs@customs.gov', password: 'customs123', role: 'Customs', org: 'Port Customs Authority', color: 'text-amber-400' },
  { email: 'ops@maersk.com', password: 'carrier123', role: 'Carrier', org: 'Maersk Line', color: 'text-blue-400' },
  { email: 'terminal@rotterdam.nl', password: 'terminal123', role: 'Terminal', org: 'Rotterdam Port Authority', color: 'text-green-400' },
  { email: 'shipper@trading.com', password: 'shipper123', role: 'Shipper', org: 'Pacific Trading Ltd', color: 'text-cyan-400' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email, password, redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(account: typeof DEMO_ACCOUNTS[0]) {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Title */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Ship className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Maritime Analytics Platform</h1>
          <p className="mt-1 text-sm text-muted-foreground">Phase 6: Digital Supply Chain — Multi-Party Access</p>
        </div>

        {/* Login Card */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="bg-muted/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Demo Accounts</CardTitle>
            <CardDescription className="text-xs">Click to auto-fill credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  <div className={`h-2 w-2 rounded-full ${
                    account.role === 'Admin' ? 'bg-red-400' :
                    account.role === 'Manager' ? 'bg-purple-400' :
                    account.role === 'Customs' ? 'bg-amber-400' :
                    account.role === 'Carrier' ? 'bg-blue-400' :
                    account.role === 'Terminal' ? 'bg-green-400' : 'bg-cyan-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{account.role}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{account.org}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/50">
          Phase 6 — Digital Supply Chain | RBAC + Document Workflow Engine
        </p>
      </div>
    </div>
  )
}
