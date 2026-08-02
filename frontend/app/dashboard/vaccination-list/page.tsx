"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SyringeIcon, SearchIcon, RefreshCwIcon } from "lucide-react"

const API = "http://localhost:9999"

interface AnimalVaccinationSummary {
  animal_id: number
  nickname?: string | null
  animal_type: string
  biological_type?: string | null
  farm_name?: string | null
  standard_doses: number
  routine_doses: number
  total_doses: number
  last_source?: string | null
  last_vaccine_name?: string | null
  last_vaccinated_at?: string | null
  last_dosage_ml?: number | null
  next_due_date?: string | null
  next_emergency_date?: string | null
  next_routine_date?: string | null
  pending_emergency_count?: number
  pending_routine_count?: number
  completed_emergency_count?: number
  status_label?: string
}

function DueBadge({ row }: { row: AnimalVaccinationSummary }) {
  const s = row.status_label || "No Record"
  if (s === "Emergency Scheduled") return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Emergency Scheduled</Badge>
  if (s === "Routine Pending") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Routine Pending</Badge>
  if (s === "Emergency + Routine Complete") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Emergency + Routine Complete</Badge>
  if (s === "Emergency Complete") return <Badge className="bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100">Emergency Complete</Badge>
  if (s === "Routine Complete") return <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100">Routine Complete</Badge>
  return <Badge variant="outline" className="text-xs">No Record</Badge>
}

const VACC_TYPE_OPTIONS = [
  { value: "All", label: "All Types" },
  { value: "Routine", label: "Routine Vaccination" },
  { value: "Emergency", label: "Emergency (Dagdaga)" },
]

const STATUS_OPTIONS = [
  { value: "All", label: "All Statuses" },
  { value: "Emergency Scheduled", label: "Emergency Scheduled" },
  { value: "Routine Pending", label: "Routine Pending" },
  { value: "Emergency Scheduled|Emergency Complete|Emergency + Routine Complete", label: "Emergency Track" },
  { value: "Routine Pending|Routine Complete|Emergency + Routine Complete", label: "Routine Track" },
  { value: "Routine Complete", label: "Routine Complete" },
  { value: "Emergency Complete", label: "Emergency Complete" },
  { value: "Emergency + Routine Complete", label: "Both Complete" },
  { value: "No Record", label: "No Record" },
]

export default function VaccinationListPage() {
  const [rows, setRows] = useState<AnimalVaccinationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [animalType, setAnimalType] = useState("All")
  const [vaccType, setVaccType] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
  }

  const fetchSummary = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`${API}/api/vaccinations/animals-summary`, { headers })
    if (res.ok) {
      setRows(await res.json())
    } else {
      const err = await res.json().catch(() => ({}))
      setRows([])
      setError(err.error || `Failed to load vaccination list (${res.status}).`)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        String(r.animal_id).includes(q) ||
        (r.nickname || "").toLowerCase().includes(q) ||
        (r.farm_name || "").toLowerCase().includes(q)
      const matchesType = animalType === "All" || r.animal_type === animalType
      
      let matchesVaccType = true
      if (vaccType === "Routine") {
        matchesVaccType = (r.routine_doses > 0) ||
          (r.status_label === "Routine Pending") ||
          (r.status_label === "Routine Complete") ||
          (r.status_label === "Emergency + Routine Complete")
      } else if (vaccType === "Emergency") {
        matchesVaccType = (r.standard_doses > 0) ||
          (r.status_label === "Emergency Scheduled") ||
          (r.status_label === "Emergency Complete") ||
          (r.status_label === "Emergency + Routine Complete")
      }

      let matchesStatus = true
      if (statusFilter !== "All") {
        const allowed = statusFilter.split("|")
        matchesStatus = allowed.includes(r.status_label || "No Record")
      }
      
      const isCompleted = r.total_doses > 0
      return matchesQuery && matchesType && matchesVaccType && matchesStatus && isCompleted
    })
  }, [rows, query, animalType, vaccType, statusFilter])

  const types = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.animal_type)))], [rows])

  const emergencyCount = rows.filter(r =>
    (r.status_label === "Emergency Scheduled" || r.status_label === "Emergency Complete" || r.status_label === "Emergency + Routine Complete")
  ).length
  const routineCount = rows.filter(r =>
    (r.status_label === "Routine Pending" || r.status_label === "Routine Complete" || r.status_label === "Emergency + Routine Complete")
  ).length

  return (
    <div className="bg-[#f8faff] min-h-screen p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <SyringeIcon className="w-6 h-6 text-blue-600" /> Vaccination List
          </h1>
          <p className="text-slate-500 text-sm mt-1">Animal-level vaccination summary and dose history.</p>
        </div>
        <Button onClick={fetchSummary} variant="outline" className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50">
          <RefreshCwIcon className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {!loading && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setVaccType("Emergency"); setStatusFilter("All") }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${vaccType === "Emergency" && statusFilter === "All" ? "bg-rose-600 text-white border-rose-600 shadow" : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"}`}
          >
            🚨 Emergency Track
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${vaccType === "Emergency" && statusFilter === "All" ? "bg-white/20 text-white" : "bg-rose-200 text-rose-800"}`}>{emergencyCount}</span>
          </button>
          <button
            onClick={() => { setVaccType("Routine"); setStatusFilter("All") }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${vaccType === "Routine" && statusFilter === "All" ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"}`}
          >
            🔄 Routine Track
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${vaccType === "Routine" && statusFilter === "All" ? "bg-white/20 text-white" : "bg-blue-200 text-blue-800"}`}>{routineCount}</span>
          </button>
          <button
            onClick={() => { setVaccType("All"); setStatusFilter("All") }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${vaccType === "All" && statusFilter === "All" ? "bg-slate-700 text-white border-slate-700 shadow" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"}`}
          >
            📋 All Animals
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${vaccType === "All" && statusFilter === "All" ? "bg-white/20 text-white" : "bg-slate-300 text-slate-700"}`}>{rows.length}</span>
          </button>
        </div>
      )}

      <Card className="rounded-2xl border-none shadow-sm">
        <CardHeader className="p-4 md:p-6 border-b border-slate-50">
          <CardTitle className="text-base font-extrabold text-slate-800">Filters</CardTitle>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by ID, nickname, farm..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value)}
            >
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={vaccType}
              onChange={(e) => { setVaccType(e.target.value); setStatusFilter("All") }}
            >
              {VACC_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(vaccType !== "All" || statusFilter !== "All" || animalType !== "All") && (
            <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-slate-50 bg-slate-50/60">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider self-center">Active:</span>
              {vaccType !== "All" && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${vaccType === "Emergency" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                  {vaccType === "Emergency" ? "🚨" : "🔄"} {VACC_TYPE_OPTIONS.find(o => o.value === vaccType)?.label}
                  <button onClick={() => setVaccType("All")} className="ml-1 opacity-60 hover:opacity-100">✕</button>
                </span>
              )}
              {statusFilter !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                  {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
                  <button onClick={() => setStatusFilter("All")} className="ml-1 opacity-60 hover:opacity-100">✕</button>
                </span>
              )}
              {animalType !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                  {animalType}
                  <button onClick={() => setAnimalType("All")} className="ml-1 opacity-60 hover:opacity-100">✕</button>
                </span>
              )}
              <span className="ml-auto text-[11px] text-slate-400 font-semibold self-center">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
            </div>
          )}
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading vaccination list...</div>
          ) : error ? (
            <div className="p-10 text-center text-rose-600 text-sm font-medium">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No animals found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="text-left px-4 py-3">Animal ID</th>
                    <th className="text-left px-4 py-3">Nickname</th>
                    <th className="text-left px-4 py-3">Animal Type</th>
                    <th className="text-left px-4 py-3">Farm</th>
                    <th className="text-left px-4 py-3">Total Doses</th>
                    <th className="text-left px-4 py-3">Last Vaccine</th>
                    <th className="text-left px-4 py-3">Dose (ml)</th>
                    <th className="text-left px-4 py-3">Last Vaccinated</th>
                    <th className="text-left px-4 py-3">Next Due</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.animal_id} className="border-t border-slate-50 hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">#{r.animal_id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.nickname || "Unnamed"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.animal_type}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{r.farm_name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-semibold">{r.total_doses}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.last_vaccine_name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.last_dosage_ml == null ? "—" : r.last_dosage_ml}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.last_vaccinated_at ? new Date(r.last_vaccinated_at).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.next_due_date ? new Date(r.next_due_date).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3"><DueBadge row={r} /></td>
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
