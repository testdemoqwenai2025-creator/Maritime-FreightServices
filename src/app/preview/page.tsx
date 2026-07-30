'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, CheckCircle2, XCircle, Loader2, RefreshCw,
  Database, Server, Shield, Brain, Globe, Layers,
  ArrowDown, AlertTriangle, Zap, Clock, ChevronDown, ChevronRight,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface Check {
  id: string;
  label: string;
  url?: string;
  status: 'pending' | 'ok' | 'fail';
  detail?: string;
  latency?: number;
  data?: unknown;
  layer?: string;
  expanded?: boolean;
}

/* ─── Backend endpoints to probe from the browser ──────────────────── */

const BACKEND_CHECKS = [
  { id: 'systems',    label: 'Unified Systems API',    url: '/api/systems',                 timeout: 5000,  layer: 'api' },
  { id: 'health',     label: 'Health Diagnostics',     url: '/api/health',                  timeout: 5000,  layer: 'api' },
  { id: 'vessels',    label: 'Vessel Registry',         url: '/api/vessels',                 timeout: 5000,  layer: 'api' },
  { id: 'ports',      label: 'Port Directory',          url: '/api/ports',                   timeout: 5000,  layer: 'api' },
  { id: 'shipments',  label: 'Shipment Tracker',        url: '/api/shipments',               timeout: 5000,  layer: 'api' },
  { id: 'containers', label: 'Container Manager',       url: '/api/containers',              timeout: 5000,  layer: 'api' },
  { id: 'analytics',  label: 'Analytics Engine',        url: '/api/analytics',               timeout: 10000, layer: 'api' },
  { id: 'tradedata',  label: 'Trade Data Hub',          url: '/api/trade-data',              timeout: 5000,  layer: 'api' },
  { id: 'statechart',label: 'State Machine Definition', url: '/api/state-machine/definition',timeout: 5000,  layer: 'stateMachine' },
  { id: 'search',     label: 'Search API',              url: '/api/search?q=test',           timeout: 5000,  layer: 'api' },
  { id: 'detailed',   label: 'Deep Health Diagnostic',  url: '/api/health/detailed',         timeout: 8000,  layer: 'api' },
];

/* ─── Layer definitions ────────────────────────────────────────────── */

const LAYER_ORDER = ['browser', 'middleware', 'api', 'stateMachine', 'database', 'server', 'system'] as const;

const LAYERS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  browser:      { label: 'Browser (Client)',        icon: Globe,    desc: 'React rendering, fetch API, sessionStorage' },
  middleware:   { label: 'Middleware Layer',         icon: Shield,   desc: 'Auth, rate-limiting, request transform (.bak)' },
  api:          { label: 'API Routes',              icon: Server,   desc: 'Next.js API route handlers' },
  stateMachine: { label: 'State Machine Engine',    icon: Brain,    desc: 'Event-sourced hierarchical statechart' },
  database:     { label: 'Database (Prisma/SQLite)', icon: Database, desc: 'ORM queries, schema, migrations' },
  server:       { label: 'Server Runtime',           icon: Zap,      desc: 'Node.js, Next.js runtime, file system' },
  system:       { label: 'System Resources',         icon: Activity, desc: 'Memory, CPU, uptime, environment' },
};

/* ─── Helpers ──────────────────────────────────────────────────────── */

async function checkEndpoint(cfg: { url: string; timeout: number }): Promise<Check> {
  const start = performance.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), cfg.timeout);
    const res = await fetch(cfg.url, { signal: ctrl.signal });
    clearTimeout(timer);
    const latency = Math.round(performance.now() - start);
    let data: unknown;
    try { data = await res.json(); } catch { data = null; }
    return {
      id: cfg.url.split('?')[0].replace('/api/', ''),
      label: '',
      url: cfg.url,
      status: res.ok ? 'ok' : 'fail',
      detail: `HTTP ${res.status}`,
      latency,
      data,
    };
  } catch (err) {
    return {
      id: cfg.url.split('?')[0].replace('/api/', ''),
      label: '',
      url: cfg.url,
      status: 'fail',
      detail: err instanceof DOMException && err.name === 'AbortError' ? 'Timeout' : String(err),
      latency: Math.round(performance.now() - start),
    };
  }
}

function runBrowserChecks(): Check[] {
  const checks: Check[] = [
    { id: 'js-runtime', label: 'JavaScript Runtime', status: typeof window !== 'undefined' ? 'ok' : 'fail', detail: typeof window !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'N/A', layer: 'browser' },
    { id: 'fetch-api', label: 'Fetch API', status: typeof fetch === 'function' ? 'ok' : 'fail', detail: 'Available', layer: 'browser' },
  ];
  try { sessionStorage.setItem('_hv', '1'); sessionStorage.removeItem('_hv'); checks.push({ id: 'session-storage', label: 'Session Storage', status: 'ok', detail: 'Read/write verified', layer: 'browser' }); } catch { checks.push({ id: 'session-storage', label: 'Session Storage', status: 'fail', detail: 'Not available', layer: 'browser' }); }
  try { const _p = new PerformanceObserver(() => {}); checks.push({ id: 'performance-api', label: 'Performance API', status: 'ok', detail: 'PerformanceObserver available', layer: 'browser' }); _p.disconnect(); } catch { checks.push({ id: 'performance-api', label: 'Performance API', status: typeof performance !== 'undefined' ? 'ok' : 'fail', detail: 'Limited', layer: 'browser' }); }
  checks.push({ id: 'websocket', label: 'WebSocket Support', status: typeof WebSocket !== 'undefined' ? 'ok' : 'fail', detail: typeof WebSocket !== 'undefined' ? 'Available' : 'N/A', layer: 'browser' });
  return checks;
}

/* ─── Hook: backend health probe ───────────────────────────────────── */

function useBackendHealth() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [summary, setSummary] = useState({ ok: 0, fail: 0 });
  const [running, setRunning] = useState(false);

  const toggleExpand = useCallback((id: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  }, []);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setChecks([]);
    const results: Check[] = [];
    for (const cfg of BACKEND_CHECKS) {
      const result = await checkEndpoint(cfg);
      results.push({ ...result, label: cfg.label, layer: cfg.layer, expanded: false });
      setChecks([...results]);
      setSummary({ ok: results.filter(r => r.status === 'ok').length, fail: results.filter(r => r.status === 'fail').length });
    }
    setRunning(false);
  }, []);

  return { checks, summary, running, runChecks, toggleExpand };
}

/* ─── Layer Diagram ────────────────────────────────────────────────── */

function LayerDiagram({ checks, browserChecks }: { checks: Check[]; browserChecks: Check[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Application Layer Stack</h3>
      <div className="flex flex-col items-center gap-1.5 text-xs">
        {LAYER_ORDER.map((layerId, i) => {
          const layer = LAYERS[layerId];
          if (!layer) return null;
          const isBrowser = layerId === 'browser';
          const apiOk = checks.filter(c => c.layer === layerId && c.status === 'ok').length;
          const apiTotal = checks.filter(c => c.layer === layerId).length;
          const bOk = isBrowser ? browserChecks.filter(c => c.status === 'ok').length : 0;
          const bTotal = isBrowser ? browserChecks.length : 0;
          const total = apiTotal + bTotal;
          const totalOk = apiOk + bOk;

          return (
            <React.Fragment key={layerId}>
              {i > 0 && (
                <div className="flex flex-col items-center py-0.5">
                  <ArrowDown className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-[10px] text-slate-600">HTTP / fetch</span>
                </div>
              )}
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border min-w-[260px] justify-between transition-all duration-500 ${
                total > 0 && totalOk === total ? 'border-green-500/30 bg-green-500/5' :
                totalOk > 0 ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-slate-700/60 bg-slate-800/40'
              }`}>
                <div className="flex items-center gap-2.5">
                  <layer.icon className={`h-4 w-4 ${totalOk === total && total > 0 ? 'text-green-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-slate-200 font-medium text-xs">{layer.label}</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">{layer.desc}</span>
                  </div>
                </div>
                {total > 0 && (
                  <div className="text-right">
                    <span className={`text-xs font-mono font-semibold ${totalOk === total ? 'text-green-400' : 'text-yellow-400'}`}>{totalOk}/{total}</span>
                    {isBrowser && <span className="text-[10px] text-slate-500 block">local</span>}
                    {layerId === 'middleware' && <span className="text-[10px] text-slate-500 block">.bak</span>}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Server-side diagnostics panel ────────────────────────────────── */

function ServerDiagnostics({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Server-Side Deep Diagnostics</h3>
      {Object.entries(data).filter(([, v]) => v && typeof v === 'object').map(([key, value]) => {
        const layer = value as { status?: string; checks?: Array<{ name: string; status: string; detail?: string }>; detail?: string };
        const arr = layer.checks || [];
        const allOk = layer.status === 'ok' || (arr.length > 0 && arr.every(c => c.status === 'ok'));
        return (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              {allOk ? <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" /> : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
              <span className="text-slate-300 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              {arr.length > 0 && <span className="text-[10px] text-slate-500 ml-auto">{arr.filter(c => c.status === 'ok').length}/{arr.length}</span>}
            </div>
            {arr.map((c, i) => (
              <div key={i} className="ml-5 flex items-center gap-2 text-[11px]">
                {c.status === 'ok' ? <CheckCircle2 className="h-2.5 w-2.5 text-green-400/50 shrink-0" /> : <XCircle className="h-2.5 w-2.5 text-red-400/50 shrink-0" />}
                <span className="text-slate-400">{c.name}</span>
                {c.detail && <span className="text-slate-500 ml-auto truncate max-w-[170px]">{c.detail}</span>}
              </div>
            ))}
            {!arr.length && layer.detail && <div className="ml-5 text-[11px] text-slate-500">{layer.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */

export default function PreviewPage() {
  const { checks, summary, running, runChecks, toggleExpand } = useBackendHealth();
  const [browserChecks, setBrowserChecks] = useState<Check[]>([]);
  const [time, setTime] = useState('');
  const [detailedHealth, setDetailedHealth] = useState<Record<string, unknown> | null>(null);

  useEffect(() => { const t = () => setTime(new Date().toLocaleTimeString()); t(); const iv = setInterval(t, 1000); return () => clearInterval(iv); }, []);
  useEffect(() => { setBrowserChecks(runBrowserChecks()); }, []);
  useEffect(() => { runChecks(); }, [runChecks]);
  useEffect(() => { fetch('/api/health/detailed').then(r => r.json()).then(d => setDetailedHealth(d)).catch(() => {}); }, []);

  const allDone = summary.ok + summary.fail === checks.length && checks.length > 0;
  const allBrowserOk = browserChecks.length > 0 && browserChecks.every(c => c.status === 'ok');
  const allOk = allDone && summary.fail === 0 && allBrowserOk;
  const partial = allDone && (summary.fail > 0 || !allBrowserOk);
  const inProgress = !allDone;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-blue-400" />
              Full-Stack Diagnostics
            </h1>
            <p className="text-sm text-slate-400 mt-1">Maritime &amp; Freight Analytics Platform &mdash; Component Connectivity Verification</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="h-3.5 w-3.5" /><span className="font-mono">{time}</span>
            </div>
            <button onClick={runChecks} disabled={running}
              className="mt-2 flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${running ? 'animate-spin' : ''}`} /> Re-run Checks
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`mb-6 p-4 rounded-xl border ${
          allOk ? 'bg-green-500/10 border-green-500/30' :
          partial ? 'bg-yellow-500/10 border-yellow-500/30' :
          inProgress ? 'bg-blue-500/10 border-blue-500/30' :
          'bg-slate-800/50 border-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            {allOk ? <CheckCircle2 className="h-6 w-6 text-green-400" /> :
             partial ? <AlertTriangle className="h-6 w-6 text-yellow-400" /> :
             <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />}
            <div>
              <p className="font-semibold text-sm">{
                allOk ? 'All Systems Operational' :
                partial ? 'Partial Connectivity Detected' :
                'Running Diagnostics...'
              }</p>
              <p className="text-xs text-slate-400">
                {checks.length > 0 && <>
                  Backend: {summary.ok} passed, {summary.fail} failed of {checks.length} endpoints
                  {' · '}
                  Browser: {browserChecks.filter(c => c.status === 'ok').length}/{browserChecks.length} checks passed
                </>}
              </p>
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: check lists */}
          <div className="space-y-6">
            {/* Backend API Endpoints */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-400" />
                Backend API Endpoints
                <span className="text-xs text-slate-500 ml-auto">{summary.ok + summary.fail}/{checks.length}</span>
              </h2>
              <div className="space-y-1">
                {checks.length === 0 && <p className="text-xs text-slate-500 animate-pulse">Probing endpoints...</p>}
                {checks.map(check => (
                  <div key={check.id} className="group">
                    <div className="flex items-center gap-2 text-sm py-0.5">
                      {check.status === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" /> :
                       check.status === 'fail' ? <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" /> :
                       <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400 shrink-0" />}
                      <span className={check.status === 'ok' ? 'text-slate-200' : 'text-slate-500'}>{check.label}</span>
                      {check.latency != null && <span className="text-xs text-slate-500 ml-1">{check.latency}ms</span>}
                      {check.detail && check.status === 'fail' && <span className="text-xs text-red-400/70 ml-1">{check.detail}</span>}
                      <button onClick={() => toggleExpand(check.id)}
                        className="ml-auto p-0.5 text-slate-600 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100">
                        {check.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    </div>
                    {check.expanded && check.data && (
                      <div className="ml-6 mt-1 p-2 rounded bg-slate-800/50 border border-slate-700/50">
                        <pre className="text-[11px] text-slate-400 overflow-auto max-h-36 whitespace-pre-wrap break-all">{JSON.stringify(check.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Browser Environment */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-400" />
                Browser Environment
                <span className="text-xs text-slate-500 ml-auto">{browserChecks.filter(c => c.status === 'ok').length}/{browserChecks.length}</span>
              </h2>
              <div className="space-y-1">
                {browserChecks.map(check => (
                  <div key={check.id} className="flex items-center gap-2 text-sm py-0.5">
                    {check.status === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                    <span className={check.status === 'ok' ? 'text-slate-200' : 'text-slate-500'}>{check.label}</span>
                    {check.detail && <span className="text-xs text-slate-500 ml-auto truncate max-w-[200px]">{check.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: diagram + server diagnostics */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
              <LayerDiagram checks={checks} browserChecks={browserChecks} />
            </div>
            {detailedHealth && (
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                <ServerDiagnostics data={detailedHealth} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-600">
          <p>Maritime &amp; Freight Analytics Platform &mdash; Full-Stack Connectivity Verification</p>
          <p className="mt-1">Frontend &harr; API Routes &harr; State Machine &harr; Prisma/SQLite &harr; Server Runtime &harr; System</p>
        </div>
      </div>
    </div>
  );
}