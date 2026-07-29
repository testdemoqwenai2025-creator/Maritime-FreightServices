'use client'

import { Download, FileSpreadsheet, FileText, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'

// ─── CSV Export ───────────────────────────────────────────────────────

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows: string[] = []

  csvRows.push(headers.map(h => `"${h}"`).join(','))

  data.forEach(row => {
    const values = headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return '""'
      if (typeof val === 'object' && val !== null) return `"${JSON.stringify(val)}"`
      return `"${String(val).replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  })

  const csvString = csvRows.join('\n')
  const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

// ─── JSON Export ──────────────────────────────────────────────────────

export function exportToJSON(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return

  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  downloadBlob(blob, `${filename}.json`)
}

// ─── Excel Export ─────────────────────────────────────────────────────

export function exportToExcel(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => {
    const val = row[h]
    if (val === null || val === undefined) return ''
    if (typeof val === 'object' && val !== null) return JSON.stringify(val)
    return val
  }))

  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Auto-size columns based on content
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = String(header).length
    rows.forEach(row => {
      const cellVal = String(row[colIdx] ?? '')
      if (cellVal.length > maxLen) maxLen = cellVal.length
    })
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
  })
  ws['!cols'] = colWidths

  // Style header row (bold) — xlsx writes styling via cell properties
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c })
    if (!ws[cellAddr]) continue
    ws[cellAddr].s = {
      font: { bold: true },
      alignment: { horizontal: 'center' },
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ─── Generic download helper ─────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── Export Button Component ───────────────────────────────────────────

interface ExportButtonProps {
  data: Record<string, any>[]
  filename: string
  formats?: ('csv' | 'json' | 'xlsx')[]
}

export function ExportButtons({ data, filename, formats = ['csv', 'json'] }: ExportButtonProps) {
  return (
    <div className="flex items-center gap-2">
      {formats.includes('csv') && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border hover:bg-muted"
          onClick={() => exportToCSV(data, filename)}
        >
          <FileText className="h-3.5 w-3.5" />
          CSV
        </Button>
      )}
      {formats.includes('xlsx') && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border hover:bg-muted"
          onClick={() => exportToExcel(data, filename)}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Excel
        </Button>
      )}
      {formats.includes('json') && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border hover:bg-muted"
          onClick={() => exportToJSON(data, filename)}
        >
          <Download className="h-3.5 w-3.5" />
          JSON
        </Button>
      )}
    </div>
  )
}
