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

export default function VaccinationListPage() {
  const [rows, setRows] = useState<AnimalVaccinationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [animalType, setAnimalType] = useState("All")

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
      // Completed view = animals that have received at least one dose
      const isCompleted = r.total_doses > 0
      return matchesQuery && matchesType && isCompleted
    })
  }, [rows, query, animalType])

  const types = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.animal_type)))], [rows])

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

      <Card className="rounded-2xl border-none shadow-sm">
        <CardHeader className="p-4 md:p-6 border-b border-slate-50">
          <CardTitle className="text-base font-extrabold text-slate-800">Filters</CardTitle>
          <div className="mt-3 grid md:grid-cols-3 gap-3">
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
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value)}
            >
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading vaccination list...</div>
          ) : error ? (
            <div className="p-10 text-center text-rose-600 text-sm font-medium">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No animals found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
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

