"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DownloadIcon, PrinterIcon, RefreshCwIcon, FilterIcon, RotateCcwIcon } from "lucide-react"

const API = "http://localhost:9999"

type ReportType = "all" | "single" | "between"
type ReportModule = "vaccinations" | "upcoming_vaccinations" | "routine_campaigns" | "emergency_alerts" | "pending_alerts" | "stock" | "low_stock" | "farms" | "animals" | "users"
interface ReportColumn { key: string; label: string }
type ReportRow = Record<string, string | number | null>

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("all")
  const [moduleName, setModuleName] = useState<ReportModule>("vaccinations")
  const [singleId, setSingleId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  
  // Advanced filters
  const [farmId, setFarmId] = useState("")
  const [animalType, setAnimalType] = useState("")
  const [gender, setGender] = useState("")
  const [regFrom, setRegFrom] = useState("")
  const [regTo, setRegTo] = useState("")
  
  const [farms, setFarms] = useState<{ farm_id: number; farm_name: string }[]>([])
  const [columns, setColumns] = useState<ReportColumn[]>([])
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
  const headers = useMemo(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token])

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const res = await fetch(`${API}/api/farms`, { headers })
        if (res.ok) {
          const data = await res.json()
          setFarms(data || [])
        }
      } catch (err) {
        console.error("Failed to fetch farms:", err)
      }
    }
    if (token) fetchFarms()
  }, [headers, token])

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    p.set("module", moduleName)
    p.set("type", type)
    if (type === "single" && singleId) p.set("single_id", singleId)
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    
    // Add advanced filters
    if (farmId) p.set("farm_id", farmId)
    if (animalType) p.set("animal_type", animalType)
    if (gender) p.set("gender", gender)
    if (regFrom) p.set("reg_from", regFrom)
    if (regTo) p.set("reg_to", regTo)
    
    return p.toString()
  }, [moduleName, type, singleId, from, to, farmId, animalType, gender, regFrom, regTo])

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/reports/vaccinations?${queryString}`, { headers })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setRows(data.rows || [])
        setColumns(data.columns || [])
        setHasGenerated(true)
      } else {
        setError(data.error || "Failed to generate report.")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setType("all")
    setSingleId("")
    setFrom("")
    setTo("")
    setFarmId("")
    setAnimalType("")
    setGender("")
    setRegFrom("")
    setRegTo("")
    setHasGenerated(false)
  }

  const downloadExcelCsv = () => {
    if (!rows.length || !columns.length) return
    const header = columns.map((c) => c.label)
    const lines = rows.map((r) => columns.map((c) => formatCell(c.key, (r[c.key] as string | number | null) ?? null)))
    const csv = [header, ...lines]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${moduleName}_report_${type}_${new Date().toISOString().slice(0, 10)}.csv`
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
    a.download = `${moduleName}_report_${type}_${new Date().toISOString().slice(0, 10)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    if (!rows.length) return
    const html = `
      <html><head><title>System Report</title>
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
    const isDateField = key.includes("date") || key.endsWith("_at") || key.includes("due") || key === "reported_at" || key === "date_given" || key === "created_at"
    if (isDateField) {
      const d = new Date(text)
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString()
    }
    return text
  }

  // Determine if advanced filters should be disabled based on module
  // Only vaccinations, emergency_alerts, and animals support animal-specific filters
  const supportsAnimalFilters = ["vaccinations", "upcoming_vaccinations", "emergency_alerts", "pending_alerts", "animals"].includes(moduleName)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">System Reports</h2>
          <p className="text-muted-foreground mt-1">Company-level reports with advanced filtering options.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl h-11" onClick={generateReport}>
            <RefreshCwIcon className="w-4 h-4 mr-2" /> Generate
          </Button>
          <Button variant="outline" className="rounded-xl h-11" onClick={downloadExcelCsv} disabled={!rows.length}>
            <DownloadIcon className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" className="rounded-xl h-11" onClick={downloadPdf} disabled={!rows.length}>
            <DownloadIcon className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button className="bg-[#2FA4D7] text-white hover:bg-[#2FA4D7]/90 rounded-xl h-11" onClick={printReport} disabled={!rows.length}>
            <PrinterIcon className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-800">Filters</CardTitle>
              <CardDescription className="text-xs">Configure the module and search constraints.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters} 
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                <RotateCcwIcon className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                className={`text-xs font-semibold rounded-xl ${showAdvanced ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-600 border-slate-200'}`}
              >
                <FilterIcon className="w-3.5 h-3.5 mr-1" /> Filters
              </Button>
            </div>
          </div>
          
          {/* Basic Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Report Module</label>
              <select value={moduleName} onChange={(e) => setModuleName(e.target.value as ReportModule)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-500 transition-colors">
                <option value="animals">Animal Registration Report</option>
                <option value="farms">Registered Farms Report</option>
                <option value="vaccinations">Vaccination History</option>
                <option value="upcoming_vaccinations">Upcoming Vaccinations</option>
                <option value="routine_campaigns">Routine Campaigns Report</option>
                <option value="emergency_alerts">Medical Alerts History</option>
                <option value="pending_alerts">Pending Medical Alerts</option>
                <option value="stock">Vaccine Inventory Report</option>
                <option value="low_stock">Low Stock / Expired Report</option>
                <option value="users">System Users Report</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Query Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as ReportType)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-500 transition-colors">
                <option value="all">All Records</option>
                <option value="single">Single Record ID</option>
                <option value="between">Between Dates</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Single ID</label>
              <input
                type="number"
                placeholder="ID e.g. 5"
                value={singleId}
                onChange={(e) => setSingleId(e.target.value)}
                disabled={type !== "single"}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 disabled:bg-slate-50 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Start Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">End Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Location (Farm)</label>
                <select 
                  value={farmId} 
                  onChange={(e) => setFarmId(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Farms</option>
                  {farms.map(f => (
                    <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Animal Type</label>
                <select 
                  value={animalType} 
                  onChange={(e) => setAnimalType(e.target.value)}
                  disabled={!supportsAnimalFilters}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white disabled:bg-slate-50 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Types</option>
                  <option value="Goat">Goat</option>
                  <option value="Cattle">Cattle</option>
                  <option value="Camel">Camel</option>
                  <option value="Sheep">Sheep</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  disabled={!supportsAnimalFilters}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white disabled:bg-slate-50 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Reg. Date From</label>
                <input
                  type="date"
                  value={regFrom}
                  onChange={(e) => setRegFrom(e.target.value)}
                  disabled={!supportsAnimalFilters}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 disabled:bg-slate-50 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Reg. Date To</label>
                <input
                  type="date"
                  value={regTo}
                  onChange={(e) => setRegTo(e.target.value)}
                  disabled={!supportsAnimalFilters}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 disabled:bg-slate-50 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      <Card className="rounded-2xl border-none shadow-sm bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Generating report...</div>
          ) : error ? (
            <div className="p-10 text-center text-rose-600 text-sm font-medium">{error}</div>
          ) : !hasGenerated ? (
            <div className="p-10 text-center text-slate-400 text-sm">No rows. Generate a report first.</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm font-medium">Wax xog ah lagama helin filter-ka aad dooratay (No data found).</div>
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
