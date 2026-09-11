"use client"

import { useMemo, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { toast } from "sonner"
import ReactSelect from "react-select"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Legend,
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
  | "decision_insights"
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
  { value: "decision_insights", label: "Decision Insights", source: "Age groups vaccinated vs not, top doctors, emergency vs routine" },
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
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const [year, month] = key.split('-')
      const dateObj = new Date(Number(year), Number(month) - 1, 1)
      return {
        date: key,
        label: dateObj.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        count,
      }
    })
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

const reportOptions = [
  {
    label: "Animal Report",
    options: [
      { value: "animals", label: "Animal Registration" },
      { value: "vaccinated_animals", label: "Vaccinated Animals" },
      { value: "unvaccinated_animals", label: "Unvaccinated Animals" },
      { value: "animal_status", label: "Animal Status" }
    ]
  },
  {
    label: "Vaccination Report",
    options: [
      { value: "routine_vaccinations", label: "Routine Vaccination" },
      { value: "emergency_vaccinations", label: "Emergency Vaccination" },
      { value: "overdue_vaccinations", label: "Overdue / Due Soon" },
      { value: "vaccination_coverage", label: "Vaccination Coverage" },
      { value: "decision_insights", label: "Decision Insights" }
    ]
  },
  {
    label: "Stock & Farms",
    options: [
      { value: "farms", label: "Farm Report" },
      { value: "stock", label: "Vaccine Stock Report" },
      { value: "stock_risk", label: "Stock Risk Report" }
    ]
  },
  {
    label: "Operations",
    options: [
      { value: "schedules", label: "Vaccination Schedule Report" },
      { value: "queue", label: "Vaccination Queue Report" },
      { value: "mortality", label: "Mortality Report" },
      { value: "alerts", label: "Alert Report" }
    ]
  }
]
  
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
  const [vaccineId, setVaccineId] = useState("")
  const [ageMonths, setAgeMonths] = useState("")
  const [farms, setFarms] = useState<{ farm_id: number; farm_name: string }[]>([])
  const [vaccines, setVaccines] = useState<{ vaccine_id: number; vaccine_name: string }[]>([])
  const [populationTotal, setPopulationTotal] = useState(0)
  const [columns, setColumns] = useState<ReportColumn[]>([])
  const [rows, setRows] = useState<ReportRow[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [insights, setInsights] = useState<{
    age_groups?: { name: string; vaccinated: number; unvaccinated: number }[]
    top_doctors?: { name: string; total: number; emergency: number; routine: number }[]
    by_vaccination_type?: { name: string; value: number }[]
    top_doctor_name?: string
    top_doctor_doses?: number
    emergency_total?: number
    routine_total?: number
    priority_age_group?: string
    priority_unvaccinated?: number
  } | null>(null)
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
      "vaccination_coverage", "decision_insights", "schedules", "queue", "mortality", "alerts",
    ].includes(moduleName)
    const supportsVaccine = [
      "vaccinated_animals", "unvaccinated_animals", "routine_vaccinations", "emergency_vaccinations",
      "overdue_vaccinations", "vaccination_coverage", "stock", "stock_risk",
    ].includes(moduleName)

    if (supportsFarm && farmId) p.set("farm_id", farmId)
    if (supportsAnimal && animalType) p.set("animal_type", animalType)
    if (supportsAnimal && gender) p.set("gender", gender)
    if (supportsAnimal) {
      if (["unvaccinated_animals", "vaccination_coverage", "decision_insights"].includes(moduleName)) {
        p.set("status", status || "Active")
      } else if (status) {
        p.set("status", status)
      }
    }
    if (supportsAnimal && ageMonths !== "") p.set("age", ageMonths)
    if (supportsVaccine && vaccineId) p.set("vaccine_id", vaccineId)
    return p.toString()
  }, [moduleName, type, singleId, from, to, farmId, animalType, gender, status, vaccineId, ageMonths])

  const generateReport = useCallback(async (opts?: { silent?: boolean }) => {
    if (type === "single" && !singleId) {
      setError("Please enter a Single ID.")
      return
    }
    if (type === "between" && !from && !to) {
      setError("Please choose Start Date and/or End Date.")
      return
    }
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/reports/vaccinations?${queryString}`, { headers })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setRows(data.rows || [])
        setColumns(data.columns || [])
        setSummary(data.summary || { total: (data.rows || []).length })
        setInsights(data.insights || null)
        setHasGenerated(true)
        setPage(1)
      } else {
        setError(data.error || "Failed to generate report.")
        setHasGenerated(false)
        setRows([])
        setColumns([])
        setSummary(null)
        setInsights(null)
      }
    } catch {
      setError("Network error. Please check backend is running on port 9999.")
      setHasGenerated(false)
      setSummary(null)
      setInsights(null)
    } finally {
      setLoading(false)
    }
  }, [type, singleId, from, to, queryString, headers])

  // Keep KPI + charts + table in sync whenever filters change (after first Generate)
  const autoFilterKey = useRef<string | null>(null)
  useEffect(() => {
    if (!hasGenerated) {
      autoFilterKey.current = null
      return
    }
    if (autoFilterKey.current === null) {
      autoFilterKey.current = queryString
      return
    }
    if (autoFilterKey.current === queryString) return
    autoFilterKey.current = queryString
    const timer = setTimeout(() => {
      void generateReport({ silent: true })
    }, 280)
    return () => clearTimeout(timer)
  }, [queryString, hasGenerated, generateReport])

  const resetFilters = () => {
    setType("all")
    setSingleId("")
    setFrom("")
    setTo("")
    setFarmId("")
    setAnimalType("")
    setGender("")
    setStatus("")
    setVaccineId("")
    setAgeMonths("")
    setHasGenerated(false)
    setSummary(null)
    setInsights(null)
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
    "vaccination_coverage", "decision_insights", "schedules", "queue", "mortality", "alerts",
  ].includes(moduleName)
  const supportsFarmFilter = !["stock", "stock_risk"].includes(moduleName)
  const supportsVaccineFilter = [
    "vaccinated_animals", "unvaccinated_animals", "routine_vaccinations", "emergency_vaccinations",
    "overdue_vaccinations", "vaccination_coverage", "stock", "stock_risk",
  ].includes(moduleName)
  const supportsAgeFilter = supportsAnimalFilters
  const statusDefaultsActive = ["unvaccinated_animals", "vaccination_coverage", "decision_insights"].includes(moduleName)

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

  const ageData = useMemo(() => {
    if (moduleName !== "vaccinated_animals") return []
    if (insights?.age_groups) return insights.age_groups
    
    // Fallback
    const buckets = [
      { name: "0-3 mo", min: 0, max: 4, vaccinated: 0, unvaccinated: 0 },
      { name: "4-6 mo", min: 4, max: 7, vaccinated: 0, unvaccinated: 0 },
      { name: "7-12 mo", min: 7, max: 13, vaccinated: 0, unvaccinated: 0 },
      { name: "13-24 mo", min: 13, max: 25, vaccinated: 0, unvaccinated: 0 },
      { name: "25+ mo", min: 25, max: Infinity, vaccinated: 0, unvaccinated: 0 },
    ]
    for (const r of rows) {
      const a = Number(r.age)
      if (Number.isFinite(a) && a >= 0) {
        const bucket = buckets.find(b => a >= b.min && a < b.max)
        if (bucket) bucket.vaccinated++ // Fallback assumes all rows are vaccinated
      }
    }
    return buckets
  }, [rows, moduleName, insights?.age_groups])

  const speciesGenderData = useMemo(() => {
    if (insights?.species_gender_distribution) return insights.species_gender_distribution
    
    if (["animals", "vaccinated_animals", "animal_status", "unvaccinated_animals"].includes(moduleName)) {
      const distribution = new Map<string, { name: string; Male: number; Female: number }>()
      for (const r of rows) {
        const type = String(r.animal_type || "Unknown")
        const bioType = String(r.biological_type || r.gender || "Unknown").toLowerCase()
        
        if (!distribution.has(type)) {
          distribution.set(type, { name: type, Male: 0, Female: 0 })
        }
        
        const item = distribution.get(type)!
        if (bioType.includes("female")) {
          item.Female++
        } else if (bioType.includes("male")) {
          item.Male++
        }
      }
      return Array.from(distribution.values())
    }
    return []
  }, [rows, moduleName, insights?.species_gender_distribution])

  const emergencyFarmData = useMemo(() => {
    if (moduleName !== "emergency_vaccinations") return []
    const grouped = new Map<string, number>()
    for (const r of rows) {
      const f = String(r.farm || "Unknown")
      grouped.set(f, (grouped.get(f) || 0) + 1)
    }
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [rows, moduleName])

  const emergencyDoctorData = useMemo(() => {
    if (moduleName !== "emergency_vaccinations") return []
    const grouped = new Map<string, number>()
    for (const r of rows) {
      const d = String(r.by_user || "Unknown")
      grouped.set(d, (grouped.get(d) || 0) + 1)
    }
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [rows, moduleName])

  const kpiCards = useMemo(() => {
    if (!hasGenerated || !summary) return []
    const total = summary.total ?? rows.length
    const topCause = countBy(rows, "cause_of_death")[0]
    const deathRate = populationTotal > 0 ? ((total / populationTotal) * 100).toFixed(2) : "0.00"
    const spark = trendData.map((d) => d.count)
    const usableSpark = spark.length > 1 ? spark : undefined

    if (moduleName === "decision_insights") {
      return [
        { title: "Priority Age Group", value: String(insights?.priority_age_group || "—"), sub: `${insights?.priority_unvaccinated ?? 0} still unvaccinated`, icon: <PawPrintIcon className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50" },
        { title: "Top Doctor", value: String(insights?.top_doctor_name || "—"), sub: `${insights?.top_doctor_doses ?? 0} doses given`, icon: <UsersIcon className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50" },
        { title: "Emergency Doses", value: String(insights?.emergency_total ?? summary.emergency_total ?? 0), sub: "emergency vaccinations", icon: <AlertTriangleIcon className="w-5 h-5 text-rose-600" />, bg: "bg-rose-50" },
        { title: "Routine Doses", value: String(insights?.routine_total ?? summary.routine_total ?? 0), sub: "routine vaccinations", icon: <SyringeIcon className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50" },
        { title: "Age Groups", value: String(total), sub: "groups in table", icon: <BarChart3Icon className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50" },
      ]
    }

    if (moduleName === "vaccinated_animals") {
      const emergency = rows.reduce((s, r) => s + (Number(r.emergency_doses) || 0), 0)
      const routine = rows.reduce((s, r) => s + (Number(r.routine_doses) || 0), 0)
      const active = rows.filter((r) => r.status === "Active").length
      const sold = rows.filter((r) => r.status === "Sold").length
      const deceased = rows.filter((r) => r.status === "Deceased").length
      return [
        { title: "Total", value: String(total), sub: "animals in result", icon: <FileTextIcon className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50", spark: usableSpark, sparkColor: "#2563EB" },
        { title: "Active", value: String(active), sub: "currently active", icon: <BarChart3Icon className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50", spark: usableSpark, sparkColor: "#10B981" },
        { title: "Sold / Deceased", value: String(sold + deceased), sub: `${sold} sold · ${deceased} deceased`, icon: <SkullIcon className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50", spark: usableSpark, sparkColor: "#F59E0B" },
        { title: "Emergency Doses", value: String(emergency), sub: "from filtered result", icon: <AlertTriangleIcon className="w-5 h-5 text-rose-600" />, bg: "bg-rose-50", spark: usableSpark, sparkColor: "#EF4444" },
        { title: "Routine Doses", value: String(routine), sub: "from filtered result", icon: <SyringeIcon className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50", spark: usableSpark, sparkColor: "#8B5CF6" },
      ]
    }

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
  }, [hasGenerated, summary, rows, moduleName, populationTotal, trendData, insights])

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
        <div className="relative z-20 flex flex-wrap items-center gap-2.5">
          <Button variant="outline" className="rounded-xl h-11 px-4 border-slate-200 bg-white shadow-sm hover:bg-slate-50" onClick={generateReport} disabled={loading}>
            <RefreshCwIcon className={`w-4 h-4 mr-2 text-slate-600 ${loading ? "animate-spin" : ""}`} /> Generate
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!rows.length}
                className="rounded-xl h-11 px-4 border-slate-200 bg-white shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <DownloadIcon className="w-4 h-4 mr-2 text-slate-600" />
                <span className="font-semibold text-[13px]">Export</span>
                <ChevronDownIcon className="w-4 h-4 ml-1.5 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="z-[100] w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
            >
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 rounded-lg py-2.5 px-3 focus:bg-blue-50 focus:text-blue-700"
                onClick={downloadExcelCsv}
              >
                <FileSpreadsheetIcon className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-[13px]">Export CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 rounded-lg py-2.5 px-3 focus:bg-blue-50 focus:text-blue-700"
                onClick={downloadPdf}
              >
                <FileIcon className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-[13px]">Export PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl h-11 px-5 shadow-sm shadow-blue-600/20" onClick={printReport} disabled={!rows.length}>
            <PrinterIcon className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <section className="relative z-0 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] overflow-hidden">
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
              <FieldShell label="Report Module" icon={<BarChart3Icon className="w-3.5 h-3.5 z-20 relative" />}>
                <ReactSelect
                  options={reportOptions}
                  value={reportOptions.flatMap(g => g.options).find(o => o.value === moduleName)}
                  onChange={(opt) => {
                    if (opt) {
                      setModuleName(opt.value as ReportModule);
                      setHasGenerated(false);
                      setRows([]);
                      setSummary(null);
                    }
                  }}
                  isSearchable
                  menuShouldScrollIntoView={false}
                  menuPosition="fixed"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  placeholder="Select Module"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: '44px',
                      borderRadius: '0.75rem',
                      borderColor: state.isFocused ? '#60A5FA' : '#E2E8F0',
                      boxShadow: state.isFocused ? '0 0 0 2px #DBEAFE' : '0 1px 2px rgba(15,23,42,0.04)',
                      paddingLeft: '30px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      ':hover': { borderColor: '#CBD5E1' }
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #F1F5F9',
                      zIndex: 50,
                    }),
                    menuList: (base) => ({
                      ...base,
                      padding: '8px'
                    }),
                    groupHeading: (base) => ({
                      ...base,
                      fontSize: '10px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#94A3B8',
                      padding: '8px 12px 4px',
                    }),
                    option: (base, state) => ({
                      ...base,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: state.isFocused ? '#F8FAFC' : 'transparent',
                      color: state.isFocused ? '#2563EB' : '#475569',
                      padding: '8px 12px',
                      borderRadius: '0.5rem',
                      ':active': { backgroundColor: '#EFF6FF' }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: '#334155',
                      fontWeight: 600
                    })
                  }}
                />
              </FieldShell>
              <FieldShell label="Query Type" icon={<FolderIcon className="w-3.5 h-3.5" />}>
                <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
                  <SelectTrigger className={controlIcon}>
                    <SelectValue placeholder="Query Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white">
                    <SelectItem value="all" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">All Records</SelectItem>
                    <SelectItem value="single" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Single Record ID</SelectItem>
                    <SelectItem value="between" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Between Dates</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Single ID or Name" icon={<HashIcon className="w-3.5 h-3.5" />}>
                <input type="text" placeholder="ID/Name e.g. 5 or Cadey" value={singleId} onChange={(e) => setSingleId(e.target.value)} disabled={type !== "single"} className={controlIcon} />
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
                <Select value={farmId || "all"} onValueChange={(v) => setFarmId(v === "all" ? "" : v)} disabled={!supportsFarmFilter}>
                  <SelectTrigger className={controlIcon}>
                    <SelectValue placeholder="All Farms" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white max-h-[300px]">
                    <SelectItem value="all" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">All Farms</SelectItem>
                    {farms.map((f) => <SelectItem key={f.farm_id} value={f.farm_id.toString()} className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">{f.farm_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Animal Type" icon={<PawPrintIcon className="w-3.5 h-3.5" />}>
                <Select value={animalType || "all"} onValueChange={(v) => setAnimalType(v === "all" ? "" : v)} disabled={!supportsAnimalFilters}>
                  <SelectTrigger className={controlIcon}>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white">
                    <SelectItem value="all" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">All Types</SelectItem>
                    <SelectItem value="Goat" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Goat</SelectItem>
                    <SelectItem value="Cattle" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Cattle</SelectItem>
                    <SelectItem value="Camel" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Camel</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Gender" icon={<UsersIcon className="w-3.5 h-3.5" />}>
                <Select value={gender || "all"} onValueChange={(v) => setGender(v === "all" ? "" : v)} disabled={!supportsAnimalFilters}>
                  <SelectTrigger className={controlIcon}>
                    <SelectValue placeholder="All Genders" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white">
                    <SelectItem value="all" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">All Genders</SelectItem>
                    <SelectItem value="Male" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Male</SelectItem>
                    <SelectItem value="Female" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Female</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Animal Status" icon={<SkullIcon className="w-3.5 h-3.5" />}>
                <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)} disabled={!supportsAnimalFilters}>
                  <SelectTrigger className={controlIcon}>
                    <SelectValue placeholder={statusDefaultsActive ? "Active (default)" : "All Status"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white">
                    <SelectItem value="all" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">{statusDefaultsActive ? "Active (default)" : "All Status"}</SelectItem>
                    <SelectItem value="Active" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Active</SelectItem>
                    <SelectItem value="Completed" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Completed</SelectItem>
                    <SelectItem value="Sold" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Sold</SelectItem>
                    <SelectItem value="Deceased" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Vaccine" icon={<ShieldIcon className="w-3.5 h-3.5" />}>
                <Select value={vaccineId || "all"} onValueChange={(v) => setVaccineId(v === "all" ? "" : v)} disabled={!supportsVaccineFilter}>
                  <SelectTrigger className={controlIcon}>
                    <SelectValue placeholder="All Vaccines" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white max-h-[300px]">
                    <SelectItem value="all" className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">All Vaccines</SelectItem>
                    {vaccines.map((v) => <SelectItem key={v.vaccine_id} value={v.vaccine_id.toString()} className="text-xs font-semibold py-2 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg mx-1">{v.vaccine_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Age">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={ageMonths}
                  onKeyDown={e => {
                    const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']
                    if (allowed.includes(e.key)) return
                    if (e.key === '.' && !ageMonths.includes('.')) return
                    if (!/^\d$/.test(e.key)) e.preventDefault()
                  }}
                  onChange={(e) => {
                    const val = e.target.value
                    if (/^\d*\.?\d*$/.test(val)) {
                      setAgeMonths(val)
                    }
                  }}
                  disabled={!supportsAgeFilter}
                  className={controlPlain}
                  placeholder="e.g. 6"
                />
              </FieldShell>
            </div>
            <div className="pt-4 mt-2 flex justify-end border-t border-slate-100">
              <Button 
                onClick={generateReport} 
                disabled={loading} 
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl h-11 px-8 shadow-sm shadow-blue-600/20 font-bold"
              >
                <RefreshCwIcon className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> 
                {loading ? "Generating..." : "Generate Report"}
              </Button>
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

      {/* Decision Insights Charts */}
      {hasGenerated && !error && moduleName === "decision_insights" && insights && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5">
            <h3 className="text-[14px] font-extrabold text-slate-800 mb-1">Age Groups: Vaccinated vs Not</h3>
            <p className="text-[11px] text-slate-400 mb-3 font-medium">Which ages still need vaccination — prioritize high unvaccinated bars</p>
            <div className="h-[170px]">
              {(insights.age_groups || []).length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.age_groups} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="vaccinated" name="Vaccinated" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="unvaccinated" name="Unvaccinated" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">No age group data</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5">
            <h3 className="text-[14px] font-extrabold text-slate-800 mb-1">Top Doctors by Doses</h3>
            <p className="text-[11px] text-slate-400 mb-3 font-medium">Who administered the most vaccinations</p>
            <div className="h-[170px]">
              {(insights.top_doctors || []).length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.top_doctors} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="total" name="Total doses" fill="#2563EB" radius={[0, 10, 10, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">No doctor dose data</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5">
            <h3 className="text-[14px] font-extrabold text-slate-800 mb-1">Emergency vs Routine</h3>
            <p className="text-[11px] text-slate-400 mb-3 font-medium">Which vaccination type is used most</p>
            <div className="h-[170px] flex items-center">
              {(insights.by_vaccination_type || []).some((d) => d.value > 0) ? (
                <>
                  <div className="relative w-[55%] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={insights.by_vaccination_type} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={3} stroke="#fff" strokeWidth={2}>
                          <Cell fill="#EF4444" />
                          <Cell fill="#10B981" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {(insights.emergency_total || 0) + (insights.routine_total || 0)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 pr-1">
                    {(insights.by_vaccination_type || []).map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i === 0 ? "#EF4444" : "#10B981" }} />
                          <span className="text-[12px] font-semibold text-slate-600 truncate">{d.name}</span>
                        </div>
                        <p className="text-[12px] font-extrabold text-slate-800">{d.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-sm text-slate-400">No vaccination type data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {hasGenerated && !error && rows.length > 0 && moduleName !== "decision_insights" && (
        <div key={`charts-${queryString}`} className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-extrabold text-slate-800">{titles.trend}</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Monthly</span>
            </div>
            <div className="h-[160px]">
              {trendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", boxShadow: "0 8px 20px rgba(0,0,0,0.06)", fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#2563EB" fill="url(#trendFill)" strokeWidth={2} />
                    <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={0} dot={{ r: 3, fill: "#2563EB", strokeWidth: 2, stroke: "#fff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No time-series data</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] p-3.5">
            <h3 className="text-[13px] font-extrabold text-slate-800 mb-2">{titles.category}</h3>
            <div className="h-[160px] flex items-center">
              {categoryData.length ? (
                <>
                  <div className="relative w-[50%] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58} paddingAngle={3} stroke="#fff" strokeWidth={2}>
                          {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg font-extrabold text-slate-900 leading-none">{categoryTotal}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 pr-1">
                    {categoryData.slice(0, 4).map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-[11px] font-semibold text-slate-600 truncate">{d.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-extrabold text-slate-800">{d.value}</p>
                          <p className="text-[9px] text-slate-400 font-medium">{Math.round((d.value / Math.max(categoryTotal, 1)) * 100)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-xs text-slate-400">No category data</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] p-3.5">
            <h3 className="text-[13px] font-extrabold text-slate-800 mb-2">{titles.breakdown}</h3>
            <div className="h-[160px]">
              {breakdownData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownData} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="value" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={12} label={{ position: "right", fill: "#64748B", fontSize: 10, formatter: (v: number | string) => `${v}` }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No breakdown data</div>
              )}
            </div>
          </div>

          {moduleName === "vaccinated_animals" && (
            <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 shadow-[0_6px_18px_rgba(15,23,42,0.04)] p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-800">Top Doctors</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Doses given · 0 = none yet</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <UsersIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="h-[160px] overflow-y-auto pr-0.5 space-y-2">
                {(insights?.top_doctors || []).length ? (
                  (() => {
                    const maxDoses = Math.max(1, ...(insights!.top_doctors!.map((d) => d.total)))
                    return insights!.top_doctors!.map((d, i) => {
                      const pct = Math.round((d.total / maxDoses) * 100)
                      const initials = d.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                      const rankTone =
                        i === 0
                          ? "from-blue-600 to-sky-500"
                          : i === 1
                            ? "from-indigo-500 to-blue-400"
                            : "from-slate-400 to-slate-300"
                      return (
                        <div
                          key={d.name}
                          className="rounded-xl bg-white/80 border border-slate-100 px-2.5 py-2 shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${rankTone} text-white text-[10px] font-extrabold flex items-center justify-center shrink-0`}>
                              {initials || "DR"}
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[9px] font-bold text-slate-600 border border-slate-200 flex items-center justify-center">
                                {i + 1}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[12px] font-bold text-slate-800 truncate">{d.name}</p>
                                <p className="text-[12px] font-extrabold text-slate-900 tabular-nums">{d.total}</p>
                              </div>
                              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${d.total > 0 ? "from-blue-600 to-sky-400" : "from-slate-200 to-slate-200"}`}
                                  style={{ width: `${d.total > 0 ? Math.max(pct, 8) : 0}%` }}
                                />
                              </div>
                              <p className="mt-1 text-[9px] font-medium text-slate-400">
                                E {d.emergency ?? 0} · R {d.routine ?? 0}
                                {d.total === 0 ? " · no doses yet" : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No doctor dose data</div>
                )}
              </div>
            </div>
          )}

          {moduleName === "vaccinated_animals" && (
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] p-3.5">
              <h3 className="text-[13px] font-extrabold text-slate-800 mb-2">Age Distribution (Vaccinated Animals)</h3>
              <div className="h-[160px]">
                {ageData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                      <Bar dataKey="vaccinated" name="Vaccinated" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No age data</div>
                )}
              </div>
            </div>
          )}

          {["animals", "vaccinated_animals", "animal_status", "unvaccinated_animals"].includes(moduleName) && (
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] p-3.5">
              <h3 className="text-[13px] font-extrabold text-slate-800 mb-2">Species & Gender Distribution</h3>
              <div className="h-[160px]">
                {speciesGenderData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={speciesGenderData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Female" name="Female" stackId="a" fill="#EC4899" radius={[0, 0, 0, 0]} barSize={24} />
                      <Bar dataKey="Male" name="Male" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No species data</div>
                )}
              </div>
            </div>
          )}

          {moduleName === "emergency_vaccinations" && (
            <>
              <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] p-3.5">
                <h3 className="text-[13px] font-extrabold text-slate-800 mb-2">Vaccinations per Farm</h3>
                <div className="h-[160px]">
                  {emergencyFarmData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={emergencyFarmData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                        <Bar dataKey="value" name="Vaccinations" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">No farm data</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] p-3.5">
                <h3 className="text-[13px] font-extrabold text-slate-800 mb-2">Top Doctors</h3>
                <div className="h-[160px]">
                  {emergencyDoctorData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={emergencyDoctorData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                        <Bar dataKey="value" name="Doses Given" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">No doctor data</div>
                  )}
                </div>
              </div>
            </>
          )}
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
