'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Ship,
  Anchor,
  Package,
  Handshake,
  Container,
  Loader2,
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

// ─── Search Result Interfaces ──────────────────────────────────────

interface VesselResult {
  id: string
  name: string
  mmsi: string
  imo: string
}

interface PortResult {
  id: string
  name: string
  unlocode: string
  country: string
}

interface ShipmentResult {
  id: string
  billOfLading: string
  bookingRef: string
}

interface CarrierResult {
  id: string
  name: string
  code: string
}

interface CargoTypeResult {
  id: string
  name: string
}

// ─── Category definition ──────────────────────────────────────────

interface SearchCategory {
  key: string
  label: string
  icon: React.ElementType
  tab: string
  endpoint: string
}

const CATEGORIES: SearchCategory[] = [
  {
    key: 'vessels',
    label: 'Vessels',
    icon: Ship,
    tab: 'vessels',
    endpoint: '/api/vessels',
  },
  {
    key: 'ports',
    label: 'Ports',
    icon: Anchor,
    tab: 'ports',
    endpoint: '/api/ports',
  },
  {
    key: 'shipments',
    label: 'Shipments',
    icon: Package,
    tab: 'shipments',
    endpoint: '/api/shipments',
  },
  {
    key: 'carriers',
    label: 'Carriers',
    icon: Handshake,
    tab: 'carriers',
    endpoint: '/api/carriers',
  },
  {
    key: 'cargoTypes',
    label: 'Cargo Types',
    icon: Container,
    tab: 'trade',
    endpoint: '/api/cargo-types',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────

/** Build a fuzzy-searchable label for each result type */
function getVesselLabel(item: VesselResult): string {
  const parts = [item.name]
  if (item.mmsi) parts.push(item.mmsi)
  if (item.imo) parts.push(item.imo)
  return parts.join(' · ')
}

function getVesselKeywords(item: VesselResult): string {
  return `${item.name} ${item.mmsi} ${item.imo}`
}

function getPortLabel(item: PortResult): string {
  const parts = [item.name]
  if (item.unlocode) parts.push(item.unlocode)
  if (item.country) parts.push(item.country)
  return parts.join(' · ')
}

function getPortKeywords(item: PortResult): string {
  return `${item.name} ${item.unlocode} ${item.country}`
}

function getShipmentLabel(item: ShipmentResult): string {
  const parts = []
  if (item.billOfLading) parts.push(item.billOfLading)
  if (item.bookingRef) parts.push(item.bookingRef)
  return parts.join(' · ') || item.id
}

function getShipmentKeywords(item: ShipmentResult): string {
  return `${item.billOfLading} ${item.bookingRef} ${item.id}`
}

function getCarrierLabel(item: CarrierResult): string {
  const parts = [item.name]
  if (item.code) parts.push(`(${item.code})`)
  return parts.join(' ')
}

function getCarrierKeywords(item: CarrierResult): string {
  return `${item.name} ${item.code} ${item.id}`
}

function getCargoTypeLabel(item: CargoTypeResult): string {
  return item.name
}

function getCargoTypeKeywords(item: CargoTypeResult): string {
  return `${item.name} ${item.id}`
}

/** Simple fuzzy match — returns true if every character in the query appears in order in the text */
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

/** Highlight matching characters by wrapping them in <mark> */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text

  const q = query.toLowerCase()
  const t = text
  const lower = t.toLowerCase()
  const indices: number[] = []

  let qi = 0
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      indices.push(i)
      qi++
    }
  }

  if (indices.length === 0) return text

  const parts: React.ReactNode[] = []
  let lastIdx = 0

  for (const idx of indices) {
    if (idx > lastIdx) {
      parts.push(t.slice(lastIdx, idx))
    }
    parts.push(
      <mark
        key={idx}
        className="bg-primary/30 text-foreground rounded-sm px-0.5"
      >
        {t[idx]}
      </mark>
    )
    lastIdx = idx + 1
  }

  if (lastIdx < t.length) {
    parts.push(t.slice(lastIdx))
  }

  return <>{parts}</>
}

// ─── Props ─────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (tab: string) => void
}

// ─── Component ─────────────────────────────────────────────────────

export default function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, unknown[]>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults({})
      setLoading(false)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [open])

  // Fetch search results with debounce
  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({})
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const responses = await Promise.allSettled(
        CATEGORIES.map(async (cat) => {
          const res = await fetch(
            `${cat.endpoint}?search=${encodeURIComponent(searchQuery)}&limit=10`
          )
          if (!res.ok) throw new Error(`Failed to fetch ${cat.key}`)
          return res.json()
        })
      )

      const newResults: Record<string, unknown[]> = {}
      responses.forEach((result, index) => {
        const key = CATEGORIES[index].key
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          newResults[key] = result.value
        } else {
          newResults[key] = []
        }
      })

      setResults(newResults)
    } catch {
      setResults({})
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        fetchResults(query)
      }, 300)
    } else {
      setResults({})
      setLoading(false)
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, fetchResults])

  // Handle item selection
  const handleSelect = useCallback(
    (tab: string) => {
      onOpenChange(false)
      onNavigate(tab)
    },
    [onOpenChange, onNavigate]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Maritime Search"
      description="Search vessels, ports, shipments, carriers, and cargo types"
    >
      <CommandInput
        placeholder="Search vessels, ports, shipments, carriers..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Searching…</span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              No results found for &quot;{query}&quot;
            </span>
          )}
        </CommandEmpty>

        {/* Vessels Group */}
        {results.vessels && results.vessels.length > 0 && (
          <CommandGroup heading="Vessels">
            {(results.vessels as VesselResult[])
              .filter((v) => fuzzyMatch(query, getVesselKeywords(v)))
              .slice(0, 5)
              .map((vessel) => (
                <CommandItem
                  key={vessel.id}
                  value={getVesselKeywords(vessel)}
                  onSelect={() => handleSelect('vessels')}
                  className="gap-3"
                >
                  <Ship className="h-4 w-4 shrink-0 text-sky-400" />
                  <span className="flex-1 truncate text-foreground">
                    {highlightMatch(getVesselLabel(vessel), query)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Vessel
                  </span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {/* Ports Group */}
        {results.ports && results.ports.length > 0 && (
          <CommandGroup heading="Ports">
            {(results.ports as PortResult[])
              .filter((p) => fuzzyMatch(query, getPortKeywords(p)))
              .slice(0, 5)
              .map((port) => (
                <CommandItem
                  key={port.id}
                  value={getPortKeywords(port)}
                  onSelect={() => handleSelect('ports')}
                  className="gap-3"
                >
                  <Anchor className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="flex-1 truncate text-foreground">
                    {highlightMatch(getPortLabel(port), query)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Port
                  </span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {/* Shipments Group */}
        {results.shipments && results.shipments.length > 0 && (
          <CommandGroup heading="Shipments">
            {(results.shipments as ShipmentResult[])
              .filter((s) => fuzzyMatch(query, getShipmentKeywords(s)))
              .slice(0, 5)
              .map((shipment) => (
                <CommandItem
                  key={shipment.id}
                  value={getShipmentKeywords(shipment)}
                  onSelect={() => handleSelect('shipments')}
                  className="gap-3"
                >
                  <Package className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="flex-1 truncate text-foreground">
                    {highlightMatch(getShipmentLabel(shipment), query)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Shipment
                  </span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {/* Carriers Group */}
        {results.carriers && results.carriers.length > 0 && (
          <CommandGroup heading="Carriers">
            {(results.carriers as CarrierResult[])
              .filter((c) => fuzzyMatch(query, getCarrierKeywords(c)))
              .slice(0, 5)
              .map((carrier) => (
                <CommandItem
                  key={carrier.id}
                  value={getCarrierKeywords(carrier)}
                  onSelect={() => handleSelect('carriers')}
                  className="gap-3"
                >
                  <Handshake className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="flex-1 truncate text-foreground">
                    {highlightMatch(getCarrierLabel(carrier), query)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Carrier
                  </span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {/* Cargo Types Group */}
        {results.cargoTypes && results.cargoTypes.length > 0 && (
          <CommandGroup heading="Cargo Types">
            {(results.cargoTypes as CargoTypeResult[])
              .filter((c) => fuzzyMatch(query, getCargoTypeKeywords(c)))
              .slice(0, 5)
              .map((cargo) => (
                <CommandItem
                  key={cargo.id}
                  value={getCargoTypeKeywords(cargo)}
                  onSelect={() => handleSelect('trade')}
                  className="gap-3"
                >
                  <Container className="h-4 w-4 shrink-0 text-rose-400" />
                  <span className="flex-1 truncate text-foreground">
                    {highlightMatch(getCargoTypeLabel(cargo), query)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Cargo
                  </span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {/* Loading indicator (shown while fetching) */}
        {loading && query.trim() && (
          <CommandGroup heading="">
            <CommandItem disabled className="gap-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Loading results…
              </span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer hint */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Search across all maritime entities</span>
          <div className="flex items-center gap-2">
            <span>
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              Select
            </span>
            <span>
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono text-[10px]">
                esc
              </kbd>{' '}
              Close
            </span>
          </div>
        </div>
      </div>
    </CommandDialog>
  )
}
