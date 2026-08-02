"use client"

import { useMemo, useState, useEffect, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DownloadIcon,
  PrinterIcon,
  RefreshCwIcon,
  FilterIcon,
  RotateCcwIcon,
  FileTextIcon,
  SkullIcon,
  AlertTriangleIcon,
  SyringeIcon,
  BarChart3Icon,
  FolderIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FileSpreadsheetIcon,
  FileIcon,
  CalendarIcon,
  PawPrintIcon,
  UsersIcon,
  ShieldIcon,
  Columns3Icon,
  HashIcon,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"

const API = "http://localhost:9999"

type ReportType = "all" | "single" | "between"
type ReportModule =
  | "animals"
  | "vaccinated_animals"
  | "animal_status"
  | "unvaccinated_animals"
  | "routine_vaccinations"
  | "emergency_vaccinations"
  | "overdue_vaccinations"
  | "vaccination_coverage"
  | "farms"
  | "stock"
  | "stock_risk"
  | "schedules"
  | "queue"
  | "mortality"
  | "alerts"
interface ReportColumn { key: string; label: string }
type ReportRow = Record<string, string | number | null>
type ReportSummary = Record<string, number>

const MODULE_OPTIONS: { value: ReportModule; label: string; source: string }[] = [
  { value: "animals", label: "Animal Registration", source: "Animals table (all registered livestock)" },
  { value: "vaccinated_animals", label: "Vaccinated Animals", source: "Animals with at least 1 Emergency or Routine dose" },
  { value: "unvaccinated_animals", label: "Unvaccinated Animals", source: "Active animals with zero doses — needs vaccination" },
  { value: "animal_status", label: "Animal Status", source: "Animals by Active / Sold / Deceased" },
  { value: "routine_vaccinations", label: "Routine Vaccination", source: "RoutineVaccinationRecord (real doses given)" },
  { value: "emergency_vaccinations", label: "Emergency Vaccination", source: "Completed Emergency schedules + matched vaccination doses + alert status" },
  { value: "overdue_vaccinations", label: "Overdue / Due Soon", source: "Pending schedules past due or within risk window" },
  { value: "vaccination_coverage", label: "Vaccination Coverage", source: "Coverage % by farm (decision: prioritize low coverage)" },
  { value: "farms", label: "Farm Report", source: "Farms + animal/alert/schedule counts" },
  { value: "stock", label: "Vaccine Stock Report", source: "VaccineStock inventory + expiry status" },
  { value: "stock_risk", label: "Stock Risk Report", source: "Expired / expiring soon / low / out of stock" },
  { value: "schedules", label: "Vaccination Schedule Report", source: "VaccinationSchedule (all schedules)" },
  { value: "queue", label: "Vaccination Queue Report", source: "Pending/open schedules for doctors" },
  { value: "mortality", label: "Mortality Report", source: "MortalityRecord deaths" },
  { value: "alerts", label: "Alert Report", source: "Medical Alert records from farms" },
]

const CHART_COLORS = ["#2563EB", "#38BDF8", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#64748B"]

function countBy(rows: ReportRow[], key: string) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = String(r[key] ?? "Unknown")
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function timeSeries(rows: ReportRow[], dateKey: string) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const raw = r[dateKey]
    if (raw == null || raw === "-") continue
    const d = new Date(String(raw))
    if (Number.isNaN(d.getTime())) continue
    const key = d.toLocaleDateString("en-CA")
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({
      date,
      label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count,
    }))
}

function pickDateKey(moduleName: ReportModule) {
  const preferred: Partial<Record<ReportModule, string>> = {
    mortality: "death_date",
    routine_vaccinations: "date_given",
    emergency_vaccinations: "date_given",
    overdue_vaccinations: "scheduled_date",
    schedules: "scheduled_date",
    queue: "scheduled_date",
    alerts: "reported_at",
    stock: "purchase_date",
    stock_risk: "expiry_date",
    animals: "created_at",
    vaccinated_animals: "created_at",
    unvaccinated_animals: "created_at",
    animal_status: "created_at",
    farms: "created_at",
  }
  return preferred[moduleName] || "created_at"
}

function pickCategoryKey(moduleName: ReportModule) {
  if (moduleName === "mortality") return "animal_type"
  if (moduleName === "stock") return "status"
  if (moduleName === "stock_risk") return "risk_level"
  if (moduleName === "alerts") return "status"
  if (moduleName === "farms") return "location"
  if (moduleName === "overdue_vaccinations") return "urgency"
  if (moduleName === "schedules" || moduleName === "queue") return "status"
  if (moduleName === "vaccination_coverage") return "decision"
  if (["animal_status", "animals", "vaccinated_animals", "unvaccinated_animals"].includes(moduleName)) return "status"
  return "animal_type"
}

function pickBreakdownKey(moduleName: ReportModule) {
  if (moduleName === "mortality") return "cause_of_death"
  if (moduleName === "stock" || moduleName === "stock_risk") return "vaccine"
  if (moduleName === "alerts") return "farm"
  if (moduleName === "farms") return "farm_name"
  if (moduleName === "overdue_vaccinations") return "vaccine"
  if (moduleName === "routine_vaccinations" || moduleName === "emergency_vaccinations") return "vaccine"
  if (moduleName === "vaccination_coverage") return "farm"
  if (moduleName === "schedules" || moduleName === "queue") return "schedule_type"
  return "farm"
}

function chartTitles(moduleName: ReportModule) {
  if (moduleName === "mortality") {
    return { trend: "Deaths Over Time", category: "Deaths by Animal Type", breakdown: "Deaths by Cause" }
  }
  if (moduleName === "stock_risk") {
    return { trend: "Expiry Over Time", category: "By Risk Level", breakdown: "By Vaccine" }
  }
  if (moduleName === "stock") {
    return { trend: "Stock Purchases Over Time", category: "By Status", breakdown: "By Vaccine" }
  }
  if (moduleName === "farms") {
    return { trend: "Farms Registered Over Time", category: "By Location", breakdown: "By Farm" }
  }
  if (moduleName === "overdue_vaccinations") {
    return { trend: "Due Dates Over Time", category: "By Urgency", breakdown: "By Vaccine" }
  }
  if (moduleName === "alerts") {
    return { trend: "Alerts Over Time", category: "By Status", breakdown: "By Farm" }
  }
  if (moduleName === "vaccination_coverage") {
    return { trend: "Coverage Snapshot", category: "By Decision", breakdown: "By Farm" }
  }
  return { trend: "Trend Over Time", category: "By Category", breakdown: "Breakdown" }
}

function badgeClass(key: string, value: string) {
  const v = value.toLowerCase()
  if (key === "cause_of_death" || key.includes("cause")) return "bg-violet-50 text-violet-700 border-violet-200"
  if (v.includes("deceased") || v.includes("expired") || v.includes("overdue") || v.includes("out of stock")) return "bg-rose-50 text-rose-700 border-rose-200"
  if (v.includes("active") || v.includes("resolved") || v.includes("completed") || v.includes("available") || v.includes("on track") || v === "normal") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (v.includes("pending") || v.includes("low") || v.includes("due soon") || v.includes("expiring") || v.includes("improve") || v.includes("priority")) return "bg-amber-50 text-amber-700 border-amber-200"
  if (v.includes("scheduled") || v.includes("emergency")) return "bg-sky-50 text-sky-700 border-sky-200"
  return "bg-slate-50 text-slate-600 border-slate-200"
}

function animalTypeIcon(type: string) {
  const t = type.toLowerCase()
  if (t.includes("cattle") || t.includes("cow")) return "🐄"
  if (t.includes("goat")) return "🐐"
  if (t.includes("camel")) return "🐪"
  if (t.includes("sheep")) return "🐑"
  return "🐾"
}

function FieldShell({
  label,
  icon,
  children,
}: {
  label: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("all")
  const [moduleName, setModuleName] = useState<ReportModule>("mortality")
  const [singleId, setSingleId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [farmId, setFarmId] = useState("")
  const [animalType, setAnimalType] = useState("")
  const [gender, setGender] = useState("")
  const [status, setStatus] = useState("")
  const [regFrom, setRegFrom] = useState("")
  const [regTo, setRegTo] = useState("")
  const [vaccineId, setVaccineId] = useState("")
  const [riskDays, setRiskDays] = useState("30")
  const [farms, setFarms] = useState<{ farm_id: number; farm_name: string }[]>([])
  const [vaccines, setVaccines] = useState<{ vaccine_id: number; vaccine_name: string }[]>([])
  const [populationTotal, setPopulationTotal] = useState(0)
  const [columns, setColumns] = useState<ReportColumn[]>([])
  const [rows, setRows] = useState<ReportRow[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
  const headers = useMemo(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token])
  const selectedModule = MODULE_OPTIONS.find((m) => m.value === moduleName)

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [farmsRes, vaccinesRes, animalsRes] = await Promise.all([
          fetch(`${API}/api/farms`, { headers }),
          fetch(`${API}/api/vaccines`, { headers }),
          fetch(`${API}/api/animals`, { headers }),
        ])
        if (farmsRes.ok) setFarms((await farmsRes.json()) || [])
        if (vaccinesRes.ok) setVaccines((await vaccinesRes.json()) || [])
        if (animalsRes.ok) {
          const animals = await animalsRes.json()
          setPopulationTotal(Array.isArray(animals) ? animals.length : 0)
        }
      } catch (err) {
        console.error("Failed to fetch report lookups:", err)
      }
    }
    if (token) fetchLookups()
  }, [headers, token])

  useEffect(() => {
    if (moduleName === "stock_risk") setRiskDays("30")
    if (moduleName === "overdue_vaccinations") setRiskDays("0")
  }, [moduleName])

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    p.set("module", moduleName)
    p.set("type", type)
    if (type === "single" && singleId) p.set("single_id", singleId)
    if (type === "between") {
      if (from) p.set("from", from)
      if (to) p.set("to", to)
    }

    const supportsFarm =
      !["stock", "stock_risk"].includes(moduleName)
    const supportsAnimal = [
      "animals", "vaccinated_animals", "animal_status", "unvaccinated_animals",
      "routine_vaccinations", "emergency_vaccinations", "overdue_vaccinations",
      "vaccination_coverage", "schedules", "queue", "mortality", "alerts",
    ].includes(moduleName)
    const supportsVaccine = [
      "vaccinated_animals", "unvaccinated_animals", "routine_vaccinations", "emergency_vaccinations",
      "overdue_vaccinations", "vaccination_coverage", "stock", "stock_risk",
    ].includes(moduleName)
    const supportsRisk = ["overdue_vaccinations", "stock_risk"].includes(moduleName)

    if (supportsFarm && farmId) p.set("farm_id", farmId)
    if (supportsAnimal && animalType) p.set("animal_type", animalType)
    if (supportsAnimal && gender) p.set("gender", gender)
    if (supportsAnimal) {
      if (["unvaccinated_animals", "vaccination_coverage"].includes(moduleName)) {
        p.set("status", status || "Active")
      } else if (status) {
        p.set("status", status)
      }
    }
    if (supportsAnimal && regFrom) p.set("reg_from", regFrom)
    if (supportsAnimal && regTo) p.set("reg_to", regTo)
    if (supportsVaccine && vaccineId) p.set("vaccine_id", vaccineId)
    if (supportsRisk && riskDays !== "") p.set("risk_days", riskDays)
    return p.toString()
  }, [moduleName, type, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, vaccineId, riskDays])

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    try {
      if (type === "single" && !singleId) {
        setError("Please enter a Single ID.")
        setLoading(false)
        return
      }
      if (type === "between" && !from && !to) {
        setError("Please choose Start Date and/or End Date.")
        setLoading(false)
        return
      }
      const res = await fetch(`${API}/api/reports/vaccinations?${queryString}`, { headers })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setRows(data.rows || [])
        setColumns(data.columns || [])
        setSummary(data.summary || { total: (data.rows || []).length })
        setHasGenerated(true)
        setPage(1)
      } else {
        setError(data.error || "Failed to generate report.")
        setHasGenerated(false)
        setRows([])
        setColumns([])
        setSummary(null)
      }
    } catch {
      setError("Network error. Please check backend is running on port 9999.")
      setHasGenerated(false)
      setSummary(null)
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
    setStatus("")
    setRegFrom("")
    setRegTo("")
    setVaccineId("")
    setRiskDays(moduleName === "overdue_vaccinations" ? "0" : "30")
    setHasGenerated(false)
    setSummary(null)
    setRows([])
    setColumns([])
    setPage(1)
  }

  const formatAnimalID = (typeName: string | undefined, id: string | number) => {
    const n = Number(id)
    if (!Number.isFinite(n) || n <= 0) return String(id)
    if (typeName === "Goat") return `GT-${n}`
    if (typeName === "Cattle") return `CT-${n}`
    if (typeName === "Camel") return `CM-${n}`
    if (typeName === "Sheep") return `SH-${n}`
    return `ID-${n}`
  }

  const DATE_KEYS = new Set([
    "created_at", "death_date", "date_given", "scheduled_date", "expiry_date",
    "purchase_date", "reported_at", "next_due", "updated_at", "date_administered",
  ])

  const formatCell = (key: string, value: string | number | null | undefined, row?: ReportRow) => {
    if (value == null || value === "") return "—"
    if (key === "animal_id" && value !== "-") {
      return formatAnimalID(row?.animal_type != null ? String(row.animal_type) : undefined, value)
    }
    const text = String(value)
    if (DATE_KEYS.has(key) || (key.endsWith("_at") && !key.startsWith("days_"))) {
      const d = new Date(text)
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString()
    }
    return text
  }

  const downloadExcelCsv = () => {
    if (!rows.length || !columns.length) return
    const header = columns.map((c) => c.label)
    const lines = rows.map((r) => columns.map((c) => formatCell(c.key, (r[c.key] as string | number | null) ?? null, r)))
    const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
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
    const html = `<html><head><title>System Report</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}th{background:#f6f6f6}</style></head><body>
      <h2>Company Report (${moduleName.toUpperCase()} / ${type.toUpperCase()})</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table><thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${formatCell(c.key, r[c.key], r)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  const supportsAnimalFilters = [
    "animals", "vaccinated_animals", "animal_status", "unvaccinated_animals",
    "routine_vaccinations", "emergency_vaccinations", "overdue_vaccinations",
    "vaccination_coverage", "schedules", "queue", "mortality", "alerts",
  ].includes(moduleName)
  const supportsFarmFilter = !["stock", "stock_risk"].includes(moduleName)
  const supportsVaccineFilter = [
    "vaccinated_animals", "unvaccinated_animals", "routine_vaccinations", "emergency_vaccinations",
    "overdue_vaccinations", "vaccination_coverage", "stock", "stock_risk",
  ].includes(moduleName)
  const supportsRiskDaysFilter = ["overdue_vaccinations", "stock_risk"].includes(moduleName)
  const statusDefaultsActive = ["unvaccinated_animals", "vaccination_coverage"].includes(moduleName)

  const dateKey = pickDateKey(moduleName)
  const categoryKey = pickCategoryKey(moduleName)
  const breakdownKey = pickBreakdownKey(moduleName)
  const titles = chartTitles(moduleName)

  const trendData = useMemo(() => timeSeries(rows, dateKey), [rows, dateKey])
  const categoryData = useMemo(() => countBy(rows, categoryKey), [rows, categoryKey])
  const breakdownData = useMemo(() => {
    const data = countBy(rows, breakdownKey).slice(0, 6)
    const total = data.reduce((s, d) => s + d.value, 0) || 1
    return data.map((d) => ({ ...d, pct: Math.round((d.value / total) * 100) }))
  }, [rows, breakdownKey])

  const kpiCards = useMemo(() => {
    if (!hasGenerated || !summary) return []
    const total = summary.total ?? rows.length
    const topCause = countBy(rows, "cause_of_death")[0]
    const deathRate = populationTotal > 0 ? ((total / populationTotal) * 100).toFixed(2) : "0.00"
    const spark = trendData.map((d) => d.count)
    const usableSpark = spark.length > 1 ? spark : undefined

    if (moduleName === "mortality") {
      const vaccineReaction = rows.filter((r) => String(r.cause_of_death || "").toLowerCase().includes("vaccine")).length
      return [
        { title: "Total Records", value: String(total), sub: "deaths recorded", icon: <FileTextIcon className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50", spark: usableSpark, sparkColor: "#2563EB" },
        { title: "Total Deaths", value: String(summary.total_deaths ?? total), sub: "animals deceased", icon: <SkullIcon className="w-5 h-5 text-rose-600" />, bg: "bg-rose-50", spark: usableSpark, sparkColor: "#EF4444" },
        { title: "Death Rate", value: `${deathRate}%`, sub: "of total population", icon: <BarChart3Icon className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50", spark: usableSpark, sparkColor: "#10B981" },
        { title: "Vaccine-linked", value: String(vaccineReaction), sub: "cause mentions vaccine", icon: <AlertTriangleIcon className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50", spark: usableSpark, sparkColor: "#F59E0B" },
        { title: "Most Common Cause", value: topCause?.name || "—", sub: topCause ? `${Math.round((topCause.value / Math.max(total, 1)) * 100)}% of deaths` : "no data", icon: <SyringeIcon className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50" },
      ]
    }

    if (moduleName === "farms") {
      return [
        { title: "Total Farms", value: String(summary.total_farms ?? total), sub: "registered locations", icon: <MapPinIcon className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50" },
        { title: "Total Animals", value: String(summary.total_animals ?? 0), sub: "across all farms", icon: <PawPrintIcon className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50" },
        { title: "Total Alerts", value: String(summary.total_alerts ?? 0), sub: "medical alerts linked", icon: <AlertTriangleIcon className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50" },
        { title: "Total Schedules", value: String(summary.total_schedules ?? 0), sub: "vaccination schedules", icon: <CalendarIcon className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50" },
        { title: "Avg Animals / Farm", value: String(summary.avg_animals_per_farm ?? 0), sub: "average herd size", icon: <BarChart3Icon className="w-5 h-5 text-sky-600" />, bg: "bg-sky-50" },
      ]
    }

    if (moduleName === "stock") {
      return [
        { title: "Total Batches", value: String(total), sub: "inventory records", icon: <FileTextIcon className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50", spark: usableSpark, sparkColor: "#2563EB" },
        { title: "Normal", value: String(summary.normal ?? 0), sub: "healthy stock levels", icon: <BarChart3Icon className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50", spark: usableSpark, sparkColor: "#10B981" },
        { title: "Low Stock", value: String(summary.low_stock ?? 0), sub: "under 10 doses", icon: <AlertTriangleIcon className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50", spark: usableSpark, sparkColor: "#F59E0B" },
        { title: "Expired", value: String(summary.expired ?? 0), sub: "past expiry date", icon: <SkullIcon className="w-5 h-5 text-rose-600" />, bg: "bg-rose-50", spark: usableSpark, sparkColor: "#EF4444" },
        { title: "Doses Left", value: String(summary.total_remaining ?? 0), sub: `of ${summary.total_purchased ?? 0} purchased`, icon: <SyringeIcon className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50" },
      ]
    }

    const metricTitle: Record<string, string> = {
      total: "Total",
      total_animals: "Total Animals",
      avg_coverage_pct: "Avg Coverage",
      total_doses: "Total Doses",
      unique_animals: "Unique Animals",
      low_stock: "Low Stock",
      out_of_stock: "Out of Stock",
      due_soon: "Due Soon",
      expiring_soon: "Expiring Soon",
      needs_vaccination: "Needs Vaccination",
      alert_resolved: "Alerts Resolved",
      with_vaccination_record: "With Dose Record",
      normal: "Normal",
      total_remaining: "Doses Left",
      total_purchased: "Purchased",
    }

    const metricSub: Record<string, string> = {
      total: "records in result",
      total_farms: "registered locations",
      total_animals: "across all farms",
      total_alerts: "linked alerts",
      total_schedules: "linked schedules",
      avg_animals_per_farm: "average herd size",
      active: "currently active",
      sold: "marked as sold",
      deceased: "marked deceased",
      available: "usable stock",
      normal: "healthy stock levels",
      low_stock: "needs restock",
      expired: "past expiry",
      out_of_stock: "zero remaining",
      total_remaining: "doses still on hand",
      total_purchased: "doses purchased",
      pending: "awaiting action",
      completed: "finished",
      scheduled: "already scheduled",
      resolved: "closed alerts",
      total_doses: "ml administered",
      unique_animals: "distinct animals",
      overdue: "past due date",
      due_soon: "within risk window",
      vaccinated: "with at least 1 dose",
      unvaccinated: "still need vaccination",
      avg_coverage_pct: "average coverage %",
      needs_vaccination: "require vaccination",
      alert_resolved: "alerts resolved",
      with_vaccination_record: "matched dose records",
      total_deaths: "mortality records",
      expiring_soon: "within risk window",
    }

    const preferredOrder = [
      "total_farms", "total_animals", "total_alerts", "total_schedules", "avg_animals_per_farm",
      "total", "active", "sold", "deceased", "normal", "available", "low_stock", "expired", "out_of_stock", "expiring_soon",
      "total_remaining", "total_purchased",
      "pending", "completed", "scheduled", "resolved", "total_doses", "unique_animals",
      "overdue", "due_soon", "vaccinated", "unvaccinated", "avg_coverage_pct", "needs_vaccination",
    ]
    const keys = preferredOrder.filter((k) => summary[k] !== undefined)
    const fallbackKeys = Object.keys(summary).filter((k) => !keys.includes(k) && !k.startsWith("top_cause"))
    const ordered = [...keys, ...fallbackKeys].slice(0, 5)

    const icons = [
      { icon: <FileTextIcon className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50", color: "#2563EB" },
      { icon: <BarChart3Icon className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50", color: "#10B981" },
      { icon: <AlertTriangleIcon className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50", color: "#F59E0B" },
      { icon: <SyringeIcon className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50", color: "#8B5CF6" },
      { icon: <FolderIcon className="w-5 h-5 text-slate-600" />, bg: "bg-slate-100", color: "#64748B" },
    ]
    return ordered.map((key, i) => ({
      title: metricTitle[key] || key.replace(/_/g, " "),
      value: key === "avg_coverage_pct" ? `${summary[key]}%` : String(summary[key]),
      sub: metricSub[key] || "live metric",
      icon: icons[i % icons.length].icon,
      bg: icons[i % icons.length].bg,
      spark: usableSpark,
      sparkColor: icons[i % icons.length].color,
    }))
  }, [hasGenerated, summary, rows, moduleName, populationTotal, trendData])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const categoryTotal = categoryData.reduce((s, d) => s + d.value, 0)

  const control =
    "w-full h-11 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-700 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-400"
  const controlIcon = `${control} pl-9 pr-3`
  const controlPlain = `${control} px-3`

  return (
    <div className="min-h-full -m-1 sm:-m-2 p-1 sm:p-2 space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-[30px] leading-tight font-extrabold tracking-tight text-slate-900">System Reports</h1>
          <p className="text-slate-500 mt-1.5 text-[14px]">Live reports connected to real database modules for company decisions.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" className="rounded-xl h-11 px-4 border-slate-200 bg-white shadow-sm hover:bg-slate-50" onClick={generateReport} disabled={loading}>
            <RefreshCwIcon className={`w-4 h-4 mr-2 text-slate-600 ${loading ? "animate-spin" : ""}`} /> Generate
          </Button>
          <Button variant="outline" className="rounded-xl h-11 px-4 border-slate-200 bg-white shadow-sm hover:bg-emerald-50" onClick={downloadExcelCsv} disabled={!rows.length}>
            <FileSpreadsheetIcon className="w-4 h-4 mr-2 text-emerald-600" /> CSV
          </Button>
          <Button variant="outline" className="rounded-xl h-11 px-4 border-slate-200 bg-white shadow-sm hover:bg-rose-50" onClick={downloadPdf} disabled={!rows.length}>
            <FileIcon className="w-4 h-4 mr-2 text-rose-500" /> PDF
          </Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl h-11 px-5 shadow-sm shadow-blue-600/20" onClick={printReport} disabled={!rows.length}>
            <PrinterIcon className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <FilterIcon className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-[15px] font-extrabold text-slate-800">Filters</h2>
              <p className="text-xs text-slate-400 font-medium">
                {selectedModule ? `Source: ${selectedModule.source}` : "Configure report constraints"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="rounded-xl text-xs font-semibold text-slate-500">
              <RotateCcwIcon className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="rounded-xl text-xs font-semibold border-slate-200 bg-white"
            >
              {showFilters ? <ChevronUpIcon className="w-3.5 h-3.5 mr-1" /> : <ChevronDownIcon className="w-3.5 h-3.5 mr-1" />}
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="p-5 space-y-4 bg-gradient-to-b from-white to-slate-50/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <FieldShell label="Report Module" icon={<BarChart3Icon className="w-3.5 h-3.5" />}>
                <select value={moduleName} onChange={(e) => { setModuleName(e.target.value as ReportModule); setHasGenerated(false); setRows([]); setSummary(null) }} className={controlIcon}>
                  <optgroup label="Animal Report">
                    <option value="animals">Animal Registration</option>
                    <option value="vaccinated_animals">Vaccinated Animals</option>
                    <option value="unvaccinated_animals">Unvaccinated Animals</option>
                    <option value="animal_status">Animal Status</option>
                  </optgroup>
                  <optgroup label="Vaccination Report">
                    <option value="routine_vaccinations">Routine Vaccination</option>
                    <option value="emergency_vaccinations">Emergency Vaccination</option>
                    <option value="overdue_vaccinations">Overdue / Due Soon</option>
                    <option value="vaccination_coverage">Vaccination Coverage</option>
                  </optgroup>
                  <optgroup label="Stock & Farms">
                    <option value="farms">Farm Report</option>
                    <option value="stock">Vaccine Stock Report</option>
                    <option value="stock_risk">Stock Risk Report</option>
                  </optgroup>
                  <optgroup label="Operations">
                    <option value="schedules">Vaccination Schedule Report</option>
                    <option value="queue">Vaccination Queue Report</option>
                    <option value="mortality">Mortality Report</option>
                    <option value="alerts">Alert Report</option>
                  </optgroup>
                </select>
              </FieldShell>
              <FieldShell label="Query Type" icon={<FolderIcon className="w-3.5 h-3.5" />}>
                <select value={type} onChange={(e) => setType(e.target.value as ReportType)} className={controlIcon}>
                  <option value="all">All Records</option>
                  <option value="single">Single Record ID</option>
                  <option value="between">Between Dates</option>
                </select>
              </FieldShell>
              <FieldShell label="Single ID" icon={<HashIcon className="w-3.5 h-3.5" />}>
                <input type="number" placeholder="ID e.g. 5" value={singleId} onChange={(e) => setSingleId(e.target.value)} disabled={type !== "single"} className={controlIcon} />
              </FieldShell>
              <FieldShell label="Start Date" icon={<CalendarIcon className="w-3.5 h-3.5" />}>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={type !== "between"} className={controlIcon} />
              </FieldShell>
              <FieldShell label="End Date" icon={<CalendarIcon className="w-3.5 h-3.5" />}>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={type !== "between"} className={controlIcon} />
              </FieldShell>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3.5">
              <FieldShell label="Location (Farm)" icon={<MapPinIcon className="w-3.5 h-3.5" />}>
                <select value={farmId} onChange={(e) => setFarmId(e.target.value)} disabled={!supportsFarmFilter} className={controlIcon}>
                  <option value="">All Farms</option>
                  {farms.map((f) => <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>)}
                </select>
              </FieldShell>
              <FieldShell label="Animal Type" icon={<PawPrintIcon className="w-3.5 h-3.5" />}>
                <select value={animalType} onChange={(e) => setAnimalType(e.target.value)} disabled={!supportsAnimalFilters} className={controlIcon}>
                  <option value="">All Types</option>
                  <option value="Goat">Goat</option>
                  <option value="Cattle">Cattle</option>
                  <option value="Camel">Camel</option>
                </select>
              </FieldShell>
              <FieldShell label="Gender" icon={<UsersIcon className="w-3.5 h-3.5" />}>
                <select value={gender} onChange={(e) => setGender(e.target.value)} disabled={!supportsAnimalFilters} className={controlIcon}>
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </FieldShell>
              <FieldShell label="Animal Status" icon={<SkullIcon className="w-3.5 h-3.5" />}>
                <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!supportsAnimalFilters} className={controlIcon}>
                  <option value="">{statusDefaultsActive ? "Active (default)" : "All Status"}</option>
                  <option value="Active">Active</option>
                  <option value="Sold">Sold</option>
                  <option value="Deceased">Deceased</option>
                </select>
              </FieldShell>
              <FieldShell label="Vaccine" icon={<ShieldIcon className="w-3.5 h-3.5" />}>
                <select value={vaccineId} onChange={(e) => setVaccineId(e.target.value)} disabled={!supportsVaccineFilter} className={controlIcon}>
                  <option value="">All Vaccines</option>
                  {vaccines.map((v) => <option key={v.vaccine_id} value={v.vaccine_id}>{v.vaccine_name}</option>)}
                </select>
              </FieldShell>
              <FieldShell label={moduleName === "overdue_vaccinations" ? "Due Window" : "Risk Window"}>
                <input type="number" min={0} value={riskDays} onChange={(e) => setRiskDays(e.target.value)} disabled={!supportsRiskDaysFilter} className={controlPlain} placeholder="days" />
              </FieldShell>
              <FieldShell label="Reg. Date From" icon={<CalendarIcon className="w-3.5 h-3.5" />}>
                <input type="date" value={regFrom} onChange={(e) => setRegFrom(e.target.value)} disabled={!supportsAnimalFilters} className={controlIcon} />
              </FieldShell>
              <FieldShell label="Reg. Date To" icon={<CalendarIcon className="w-3.5 h-3.5" />}>
                <input type="date" value={regTo} onChange={(e) => setRegTo(e.target.value)} disabled={!supportsAnimalFilters} className={controlIcon} />
              </FieldShell>
            </div>
          </div>
        )}
      </section>

      {/* KPI */}
      {hasGenerated && !error && kpiCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {kpiCards.map((k) => (
            <div key={k.title} className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-4 ${k.spark ? "min-h-[128px]" : "min-h-[108px]"}`}>
              <div className="relative z-10 flex items-start gap-3">
                <div className={`w-11 h-11 rounded-2xl ${k.bg} flex items-center justify-center shrink-0 shadow-sm`}>{k.icon}</div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{k.title}</p>
                  <p className="text-[22px] font-extrabold text-slate-900 mt-1 leading-none truncate">{k.value}</p>
                  <p className="text-[12px] text-slate-400 font-medium mt-1.5 truncate">{k.sub}</p>
                </div>
              </div>
              {k.spark && k.spark.length > 1 && k.sparkColor && (
                <div className="absolute bottom-0 left-0 right-0 h-12 opacity-70 pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={k.spark.map((value, index) => ({ value, index }))}>
                      <defs>
                        <linearGradient id={`spark-${k.title.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={k.sparkColor} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={k.sparkColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={k.sparkColor} fill={`url(#spark-${k.title.replace(/\s+/g, "-")})`} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {hasGenerated && !error && rows.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-extrabold text-slate-800">{titles.trend}</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">Daily</span>
            </div>
            <div className="h-[250px]">
              {trendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 8px 20px rgba(0,0,0,0.06)" }} />
                    <Area type="monotone" dataKey="count" stroke="#2563EB" fill="url(#trendFill)" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={0} dot={{ r: 4, fill: "#2563EB", strokeWidth: 2, stroke: "#fff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">No time-series data</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5">
            <h3 className="text-[14px] font-extrabold text-slate-800 mb-3">{titles.category}</h3>
            <div className="h-[250px] flex items-center">
              {categoryData.length ? (
                <>
                  <div className="relative w-[55%] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4} stroke="#fff" strokeWidth={3}>
                          {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-extrabold text-slate-900">{categoryTotal}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 pr-1">
                    {categoryData.slice(0, 4).map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-[12px] font-semibold text-slate-600 truncate">{d.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[12px] font-extrabold text-slate-800">{d.value}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{Math.round((d.value / Math.max(categoryTotal, 1)) * 100)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-sm text-slate-400">No category data</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5">
            <h3 className="text-[14px] font-extrabold text-slate-800 mb-3">{titles.breakdown}</h3>
            <div className="h-[250px]">
              {breakdownData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownData} layout="vertical" margin={{ left: 4, right: 28, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="value" fill="#8B5CF6" radius={[0, 10, 10, 0]} barSize={18} label={{ position: "right", fill: "#64748B", fontSize: 11, formatter: (v: number | string) => `${v}` }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">No breakdown data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">Generating live report from database...</div>
        ) : error ? (
          <div className="p-16 text-center text-rose-600 text-sm font-medium">{error}</div>
        ) : !hasGenerated ? (
          <div className="p-16 text-center text-slate-400 text-sm">Choose a module and click <span className="font-bold text-slate-600">Generate</span> to load live data.</div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm font-medium">No data found for the selected filters.</div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
              <p className="text-[12px] font-semibold text-slate-500">
                Showing <span className="text-slate-900">{rows.length}</span> live row{rows.length === 1 ? "" : "s"} · Module:{" "}
                <span className="text-slate-900">{selectedModule?.label}</span>
                <span className="text-slate-400"> · Source: {selectedModule?.source}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs border-slate-200 bg-white">
                  <Columns3Icon className="w-3.5 h-3.5 mr-1.5" /> Columns
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs border-slate-200 bg-white" onClick={downloadExcelCsv}>
                  <DownloadIcon className="w-3.5 h-3.5 mr-1.5" /> Export
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    {columns.map((c) => (
                      <th key={c.key} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                      {columns.map((c) => {
                        const raw = (r[c.key] as string | number | null) ?? null
                        const display = formatCell(c.key, raw, r)
                        const isBadge = ["status", "cause_of_death", "urgency", "risk_level", "decision", "alert_status", "schedule_type"].includes(c.key)
                        if (c.key === "animal_id") {
                          return <td key={c.key} className="px-4 py-3.5"><span className="font-bold text-blue-600 text-[13px] hover:underline cursor-default">{display}</span></td>
                        }
                        if (c.key === "animal_type") {
                          return (
                            <td key={c.key} className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                                <span>{animalTypeIcon(display)}</span>{display}
                              </span>
                            </td>
                          )
                        }
                        if (isBadge && display !== "—") {
                          return (
                            <td key={c.key} className="px-4 py-3.5">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${badgeClass(c.key, display)}`}>{display}</span>
                            </td>
                          )
                        }
                        return (
                          <td key={c.key} className="px-4 py-3.5 text-[13px] text-slate-600 whitespace-nowrap">
                            <span className={c.key === "nickname" ? "font-semibold text-slate-800" : ""}>{display}</span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              <p className="text-[12px] text-slate-500 font-medium">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, rows.length)} of {rows.length} results
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="rounded-xl h-8 w-8 p-0 border-slate-200" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                {(() => {
                  const windowSize = 5
                  let start = Math.max(1, page - Math.floor(windowSize / 2))
                  const end = Math.min(totalPages, start + windowSize - 1)
                  start = Math.max(1, end - windowSize + 1)
                  return Array.from({ length: end - start + 1 }, (_, idx) => {
                    const p = start + idx
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`h-8 min-w-8 px-2 rounded-xl text-xs font-bold transition-colors ${page === p ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        {p}
                      </button>
                    )
                  })
                })()}
                <Button variant="outline" size="sm" className="rounded-xl h-8 w-8 p-0 border-slate-200" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white">
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
