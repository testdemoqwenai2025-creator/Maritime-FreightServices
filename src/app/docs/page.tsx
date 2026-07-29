'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Play, Copy, Check, ExternalLink, ChevronDown,
  ChevronRight, Server, Globe, BarChart3, Search, Ship,
  Anchor, Container, Radio, FileText, Shield, Zap, Database,
  Route, Users, BookOpen
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ApiSpec {
  info: { title: string; version: string; description: string }
  servers: { url: string; description: string }[]
  paths: Record<string, Record<string, { summary: string; description: string; parameters?: Array<{ name: string; in: string; required?: boolean; schema: Record<string, unknown>; description: string }> }>>
  tags: Array<{ name: string; description: string }>
}

const tagIcons: Record<string, React.ElementType> = {
  UI: Globe, System: Server, Analytics: BarChart3, Search: Search,
  Fleet: Ship, Infrastructure: Anchor, Logistics: Container,
  Documents: FileText, Events: Radio, Trade: Route,
  Commercial: BookOpen, 'Real-time': Radio,
}

const tagColors: Record<string, string> = {
  UI: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  System: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Analytics: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Search: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Fleet: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Infrastructure: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Logistics: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  Documents: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Events: 'bg-red-500/20 text-red-400 border-red-500/30',
  Trade: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  Commercial: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'Real-time': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

const pathTagMap: Record<string, string[]> = {
  '/': ['UI'], '/about': ['UI'], '/api': ['System'], '/api/health': ['System'],
  '/api/dashboard': ['Analytics'], '/api/search': ['Search'], '/api/vessels': ['Fleet'],
  '/api/vessels/stream': ['Real-time'], '/api/ports': ['Infrastructure'],
  '/api/shipments': ['Logistics'], '/api/containers': ['Logistics'],
  '/api/documents': ['Documents'], '/api/events': ['Events'], '/api/carriers': ['Fleet'],
  '/api/trade-routes': ['Trade'], '/api/cargo-types': ['Trade'],
  '/api/charters': ['Commercial'], '/api/bookings': ['Commercial'], '/api/trade-data': ['Analytics'],
  '/api/docs': ['System'],
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<ApiSpec | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [tryResponses, setTryResponses] = useState<Record<string, string>>({})
  const [tryLoading, setTryLoading] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/docs').then(r => r.json()).then(setSpec).catch(() => {})
  }, [])

  const toggle = (path: string) => setExpanded(prev => ({ ...prev, [path]: !prev[path] }))
  const copyUrl = (path: string) => {
    navigator.clipboard.writeText(path)
    setCopied(path)
    setTimeout(() => setCopied(null), 2000)
  }

  const tryEndpoint = async (path: string) => {
    setTryLoading(prev => ({ ...prev, [path]: true }))
    try {
      const res = await fetch(path)
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        setTryResponses(prev => ({ ...prev, [path]: JSON.stringify(data, null, 2).substring(0, 2000) }))
      } catch {
        setTryResponses(prev => ({ ...prev, [path]: text.substring(0, 500) || '(empty response)' }))
      }
    } catch (err) {
      setTryResponses(prev => ({ ...prev, [path]: `Error: ${err}` }))
    }
    setTryLoading(prev => ({ ...prev, [path]: false }))
  }

  if (!spec) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  const pathsByTag: Record<string, Array<{ path: string; method: string; summary: string; description: string; parameters?: ApiSpec['paths'][string]['get']['parameters'] }>> = {}

  Object.entries(spec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, detail]) => {
      const tags = pathTagMap[path] || ['System']
      tags.forEach(tag => {
        if (!pathsByTag[tag]) pathsByTag[tag] = []
        pathsByTag[tag].push({ path, method: method.toUpperCase(), summary: detail.summary, description: detail.description, parameters: detail.parameters })
      })
    })
  })

  const filteredTags = Object.entries(pathsByTag).filter(([tag]) =>
    !filter || tag.toLowerCase().includes(filter.toLowerCase()) ||
    pathsByTag[tag].some(p => p.path.toLowerCase().includes(filter.toLowerCase()) || p.summary.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">API Documentation</h1>
            <p className="text-muted-foreground">OpenAPI 3.0 — {spec.info.version}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Badge variant="outline" className="border-border bg-secondary text-secondary-foreground">
              {Object.keys(spec.paths).length} endpoints
            </Badge>
            <Badge variant="outline" className="border-border bg-secondary text-secondary-foreground">
              {spec.tags.length} categories
            </Badge>
          </div>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter endpoints by path, tag, or description..."
            className="pl-10 bg-muted border-border"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        <div className="space-y-6">
          {filteredTags.map(([tag, endpoints]) => {
            const Icon = tagIcons[tag] || Server
            const color = tagColors[tag] || 'bg-secondary text-secondary-foreground border-border'
            const tagInfo = spec.tags.find(t => t.name === tag)

            return (
              <Card key={tag} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    <Badge variant="outline" className={`border ${color}`}>{tag}</Badge>
                    <span className="ml-2 text-sm font-normal text-muted-foreground">{tagInfo?.description}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {endpoints.map(ep => {
                    const isExpanded = expanded[ep.path]
                    const isSse = ep.path.includes('/stream')
                    const methodColor = isSse ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'

                    return (
                      <div key={ep.path} className="rounded-lg border border-border bg-muted/20">
                        <button
                          onClick={() => toggle(ep.path)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                          <Badge variant="outline" className={`h-5 px-1.5 text-[10px] font-mono border ${methodColor}`}>{isSse ? 'SSE' : ep.method}</Badge>
                          <code className="flex-1 text-sm font-mono text-foreground/80">{ep.path}</code>
                          <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-xs">{ep.summary}</span>
                          <button
                            onClick={e => { e.stopPropagation(); copyUrl(ep.path) }}
                            className="ml-2 p-1 hover:bg-muted rounded transition-colors"
                          >
                            {copied === ep.path ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-sm text-muted-foreground">{ep.description}</p>

                            {ep.parameters && ep.parameters.length > 0 && (
                              <div>
                                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Parameters</p>
                                <div className="space-y-1">
                                  {ep.parameters.map(p => (
                                    <div key={p.name} className="flex items-center gap-2 text-xs">
                                      <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono border-border">{p.in}</Badge>
                                      <code className="font-mono text-foreground">{p.name}</code>
                                      {p.required && <span className="text-red-400">*</span>}
                                      <span className="text-muted-foreground">— {p.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!isSse && (
                              <div className="flex gap-2 pt-1">
                                <Button size="sm" variant="outline" className="h-7 text-xs border-border" onClick={() => tryEndpoint(ep.path)} disabled={tryLoading[ep.path]}>
                                  {tryLoading[ep.path] ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-foreground mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                                  Try it
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open(ep.path, '_blank')}>
                                  <ExternalLink className="h-3 w-3 mr-1" /> Open
                                </Button>
                              </div>
                            )}

                            {tryResponses[ep.path] && (
                              <div className="rounded bg-background border border-border p-2 max-h-60 overflow-y-auto">
                                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Response</p>
                                <pre className="text-xs font-mono text-foreground/70 whitespace-pre-wrap">{tryResponses[ep.path]}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground/60 px-2">
          <span>OpenAPI 3.0 Spec available at <code className="font-mono">/api/docs</code></span>
          <span>Maritime & Freight Analytics Platform v{spec.info.version}</span>
        </div>
      </div>
    </div>
  )
}
