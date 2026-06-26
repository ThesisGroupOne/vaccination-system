"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DownloadIcon, PrinterIcon, RefreshCwIcon } from "lucide-react"

const API = "http://localhost:9999"

type ReportType = "all" | "single" | "between"
type ReportModule = "vaccinations" | "routine_campaigns" | "emergency_alerts" | "stock" | "farms" | "animals"
interface ReportColumn { key: string; label: string }
type ReportRow = Record<string, string | number | null>

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("all")
  const [moduleName, setModuleName] = useState<ReportModule>("vaccinations")
  const [singleId, setSingleId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [columns, setColumns] = useState<ReportColumn[]>([])
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    p.set("module", moduleName)
    p.set("type", type)
    if (type === "single" && singleId) p.set("single_id", singleId)
    if (type === "between") {
      if (from) p.set("from", from)
      if (to) p.set("to", to)
    }
    return p.toString()
  }, [moduleName, type, singleId, from, to])

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`${API}/api/reports/vaccinations?${queryString}`, { headers })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setRows(data.rows || [])
      setColumns(data.columns || [])
    }
    else setError(data.error || "Failed to generate report.")
    setLoading(false)
  }

  const downloadExcelCsv = () => {
    if (!rows.length) return
    if (!columns.length) return
    const header = columns.map((c) => c.label)
    const lines = rows.map((r) => columns.map((c) => formatCell(c.key, (r[c.key] as string | number | null) ?? null)))
    const csv = [header, ...lines]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vaccination_report_${type}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPdf = async () => {
    const res = await fetch(`${API}/api/reports/vaccinations?${queryString}&format=pdf`, { headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Failed to download PDF.")
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vaccination_report_${type}_${new Date().toISOString().slice(0, 10)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    if (!rows.length) return
    const html = `
      <html><head><title>Vaccination Report</title>
      <style>
      body{font-family:Arial,sans-serif;padding:24px}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}
      th{background:#f6f6f6}
      </style></head><body>
      <h2>Company Report (${moduleName.toUpperCase()} / ${type.toUpperCase()})</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table>
        <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>${columns.map((c) => `<td>${formatCell(c.key, r[c.key])}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table></body></html>`
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  const formatCell = (key: string, value: string | number | null) => {
    if (value == null) return "—"
    const text = String(value)
    const isDateField = key.includes("date") || key.endsWith("_at") || key.includes("due")
    if (isDateField) {
      const d = new Date(text)
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString()
    }
    return text
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">System Reports</h2>
          <p className="text-muted-foreground mt-1">Company-level reports with All, Single, and Between dates modes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={generateReport}>
            <RefreshCwIcon className="w-4 h-4 mr-2" /> Generate
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={downloadExcelCsv} disabled={!rows.length}>
            <DownloadIcon className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={downloadPdf} disabled={!rows.length}>
            <DownloadIcon className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button className="bg-[#2FA4D7] text-white rounded-xl" onClick={printReport} disabled={!rows.length}>
            <PrinterIcon className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select report type and conditions.</CardDescription>
          <div className="grid md:grid-cols-5 gap-3 mt-2">
            <select value={moduleName} onChange={(e) => setModuleName(e.target.value as ReportModule)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
              <option value="vaccinations">Vaccinations</option>
              <option value="routine_campaigns">Routine Campaigns</option>
              <option value="emergency_alerts">Emergency Alerts</option>
              <option value="stock">Stock</option>
              <option value="farms">Farms</option>
              <option value="animals">Animals</option>
            </select>
            <select value={type} onChange={(e) => setType(e.target.value as ReportType)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
              <option value="all">All</option>
              <option value="single">Single</option>
              <option value="between">Between Dates</option>
            </select>
            <input
              type="number"
              placeholder="Single ID"
              value={singleId}
              onChange={(e) => setSingleId(e.target.value)}
              disabled={type !== "single"}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm disabled:bg-slate-50"
            />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled={type !== "between"}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm disabled:bg-slate-50"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={type !== "between"}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-2xl border-none shadow-sm bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Generating report...</div>
          ) : error ? (
            <div className="p-10 text-center text-rose-600 text-sm font-medium">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No rows. Generate a report first.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px]">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {columns.map((c) => (
                      <th key={c.key} className="text-left px-4 py-3">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/70">
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-3 text-sm text-slate-700">
                          {formatCell(c.key, (r[c.key] as string | number | null) ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
