'use client'

import React, { useState, useEffect } from 'react'
import { Thermometer, Zap, MapPin, Wifi, WifiOff, Battery, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = { reefer: Thermometer, shock: Zap, gps: MapPin }
const STATUS_STYLE: Record<string, string> = { Online: 'bg-green-500', Offline: 'bg-red-500', LowBattery: 'bg-amber-500', Error: 'bg-red-500' }

interface Sensor { id: string; sensorId: string; name: string; sensorType: string; status: string; batteryLevel: number; signalStrength: number; lastReported?: string; container?: { containerNo: string; isoType: string; status: string }; vessel?: { name: string; mmsi: string; status: string } }
interface Reading { id: string; sensorId: string; readingType: string; numericValue: number; unit?: string; quality: string; isAnomaly: boolean; timestamp: string }

export default function IoTTelemetryPanel() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [readings, setReadings] = useState<Record<string, Reading>>({})
  const [summary, setSummary] = useState({ totalSensors: 0, onlineSensors: 0, anomalyRate: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/iot/sensors').then(r => r.json()).then(d => {
      setSensors(d.sensors || [])
      setReadings(d.latestReadings || {})
      setSummary(d.summary || { totalSensors: 0, onlineSensors: 0, anomalyRate: 0 })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[{ label: 'Total Sensors', value: summary.totalSensors, icon: Activity, color: 'text-blue-400' },
         { label: 'Online', value: summary.onlineSensors, icon: Wifi, color: 'text-green-400' },
         { label: 'Anomaly Rate', value: `${summary.anomalyRate}%`, icon: Zap, color: 'text-red-400' },
        ].map(s => (
          <Card key={s.label} className="bg-card border border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-card border border-border">
        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Thermometer className="h-4 w-4" /> Sensor Monitor</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? <p className="text-xs text-muted-foreground animate-pulse">Loading...</p> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {sensors.map(s => {
              const Icon = TYPE_ICONS[s.sensorType] || Activity
              const reading = readings[s.sensorId]
              return (
                <div key={s.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      <Badge className={`${STATUS_STYLE[s.status] || 'bg-slate-500'} text-white text-[10px] px-1.5 py-0`}>{s.status}</Badge>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{s.sensorId}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Battery</span>
                      <div className="flex items-center gap-1"><Battery className="h-3 w-3" /><span className="text-foreground">{s.batteryLevel.toFixed(0)}%</span></div>
                      <div className="w-full h-1 rounded bg-muted mt-0.5"><div className="h-1 rounded bg-blue-500" style={{ width: `${s.batteryLevel}%` }} /></div>
                    </div>
                    <div><span className="text-muted-foreground">Signal</span>
                      <div className="flex items-center gap-1"><Wifi className="h-3 w-3" /><span className="text-foreground">{s.signalStrength.toFixed(0)}%</span></div>
                      <div className="w-full h-1 rounded bg-muted mt-0.5"><div className="h-1 rounded bg-green-500" style={{ width: `${s.signalStrength}%` }} /></div>
                    </div>
                    <div><span className="text-muted-foreground">Latest</span>
                      {reading ? (
                        <span className={`text-sm font-semibold ${reading.isAnomaly ? 'text-red-400' : 'text-foreground'}`}>{reading.numericValue}{reading.unit}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                      {reading && <span className="text-muted-foreground block">{reading.readingType}</span>}
                    </div>
                  </div>
                  {s.container && <p className="text-[10px] text-muted-foreground">{s.container.containerNo} · {s.container.isoType}</p>}
                </div>
              )
            })}
          </div>}
        </CardContent>
      </Card>
    </div>
  )
}