"use client"

import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  CalendarIcon, SyringeIcon, PlusIcon, PlayIcon, CheckCircleIcon,
  ClockIcon, RefreshCwIcon, TrashIcon, PencilIcon, PowerIcon,
  ChevronRightIcon, AlertCircleIcon, LayersIcon, SearchIcon,
  XIcon, PackageIcon, InfoIcon, AlertTriangleIcon, MegaphoneIcon, FilterIcon, ArrowUpDownIcon, MoreVerticalIcon, FileTextIcon, FileIcon,
  ShieldCheckIcon, UsersIcon,
} from "lucide-react"

import Swal from "sweetalert2"
import { toast } from "sonner"

const API = "http://localhost:9999"

// Known vaccine abbreviations → full display names
const VACCINE_FULL_NAMES: Record<string, string> = {
  "PPR": "Peste des Petits Ruminants (PPR)",
}
function fullVaccineName(name?: string | null) {
  if (!name) return ""
  return VACCINE_FULL_NAMES[name.trim().toUpperCase()] || name
}

// DB stores age in years (float): < 1 year shows months, otherwise years
function formatAnimalAge(ageYears: number) {
  if (!ageYears || ageYears <= 0) return ''
  if (ageYears < 1) {
    const months = Math.round(ageYears * 12)
    return `${months} month${months === 1 ? '' : 's'}`
  }
  const rounded = Number.isInteger(ageYears) ? ageYears : Number(ageYears.toFixed(1))
  return `${rounded} year${rounded === 1 ? '' : 's'}`
}

/** Local calendar date as YYYY-MM-DD (avoids UTC off-by-one) */
function todayLocalYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Add months to YYYY-MM-DD (same rule as backend next_due_date) */
function addMonthsYmd(ymd: string, months: number) {
  if (!ymd || !months) return ""
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return ""
  const dt = new Date(y, m - 1, d)
  dt.setMonth(dt.getMonth() + months)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  const dd = String(dt.getDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

/** Usable stock: matching vaccine (+ Camel CML-P / Camel-Pox alias), qty, not expired/archived */
function isUsableStock(s: any, vaccineId?: number, animalType?: string) {
  if (!vaccineId) return false
  const stockVid = Number(s.vaccine_id)
  const needed = Number(vaccineId)
  const camelVaccineIds = new Set([3, 8]) // CML-P and Camel-Pox (duplicate catalog entries)
  const vaccineOk =
    stockVid === needed ||
    (animalType === "Camel" && camelVaccineIds.has(needed) && camelVaccineIds.has(stockVid))
  if (!vaccineOk) return false
  if (!(Number(s.quantity_remaining) > 0)) return false
  if (s.is_archived) return false
  if (!s.expiry_date) return false
  const expiry = new Date(s.expiry_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return expiry >= today
}
function alertBox(
  title: string,
  text: string,
  icon: "warning" | "error" | "success" | "info" = "info"
) {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: "OK",
    confirmButtonColor: "#059669",
    heightAuto: false,
    allowOutsideClick: true,
    returnFocus: false,
    backdrop: true,
    didOpen: () => {
      const container = Swal.getContainer()
      if (container) {
        container.style.zIndex = "100000"
        // Prevent Radix dialog overlay from blocking clicks
        container.style.pointerEvents = "auto"
      }
      const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement | null
      if (overlay) overlay.style.pointerEvents = "none"
    },
    willClose: () => {
      const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement | null
      if (overlay) overlay.style.pointerEvents = ""
    },
  })
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Vaccine { vaccine_id: number; vaccine_name: string }
interface Template {
  id: number; campaign_name: string; animal_type: string
  vaccine_id: number; vaccine: Vaccine; frequency_months: number
  reminder_days_before: number; start_date: string; status: string
  created_at: string
}
interface Campaign {
  id: number; campaign_name: string; animal_type: string
  vaccine_id: number; vaccine: Vaccine; due_date: string
  scheduled_date?: string; completed_date?: string; animals_due: number
  status: string; doctor_id?: number; days_remaining: number; records_count: number
  created_at: string
}
interface AnimalRef {
  animal_id: number; nickname?: string; animal_type: string
  biological_type?: string; age?: number; farm?: { farm_name: string }
}
interface CampaignRecord {
  id: number; animal_id: number; date_administered: string
  next_due_date: string; dosage_ml?: number | null; animal: AnimalRef
  administered_user?: { user_id: number; full_name: string }
  vaccine?: { vaccine_name: string }
}
interface CampaignDetails extends Campaign {
  template?: { frequency_months: number }
  records: CampaignRecord[]
  animals: AnimalRef[]
  vaccinated_animal_ids: number[]
  doctor?: { user_id: number; full_name: string }
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; dot: string }> = {
    Active:     { bg: "bg-emerald-100/80 text-emerald-700", dot: "bg-emerald-500" },
    Inactive:   { bg: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
    Upcoming:   { bg: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    Scheduled:  { bg: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
    InProgress: { bg: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
    Completed:  { bg: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
  }
  const style = map[status] || { bg: "bg-gray-100 text-gray-600", dot: "bg-gray-400" }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${style.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  )
}

// ── Days Remaining Badge ─────────────────────────────────────────────────────
function DaysRemaining({ days }: { days: number }) {
  const label = days <= 0 ? "Due Today" : days === 1 ? "Tomorrow" : `${days} Days`
  const color = days <= 0 ? "text-red-600" : days <= 7 ? "text-orange-500" : "text-blue-600"
  return <span className={`font-bold text-sm ${color}`}>{label}</span>
}

// ── Animal Type Icon ─────────────────────────────────────────────────────────
function AnimalEmoji({ type }: { type: string }) {
  const map: Record<string, string> = { Goat: "🐐", Cattle: "🐄", Cow: "🐄", Camel: "🐪" }
  return <span className="text-xl">{map[type] || "🐾"}</span>
}

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ c, role, onSchedule, onStart, onComplete, onView }:
  { c: Campaign; role: string; onSchedule: (c: Campaign) => void; onStart: (c: Campaign) => void; onComplete: (c: Campaign) => void; onView: (c: Campaign) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
            <AnimalEmoji type={c.animal_type} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{c.campaign_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{c.vaccine?.vaccine_name} · {c.animal_type}</p>
          </div>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-50 rounded-xl">
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Animals Due</div>
          <div className="text-lg font-extrabold text-slate-700">{c.animals_due}</div>
        </div>
        <div className="text-center border-x border-slate-200">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Due Date</div>
          <div className="text-xs font-bold text-slate-700">{new Date(c.due_date).toLocaleDateString()}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
            {c.status === 'Completed' ? 'Vaccinated' : 'Remaining'}
          </div>
          {c.status === 'Completed' ? (
            <span className="font-bold text-sm text-teal-600 inline-flex items-center gap-1">
              <CheckCircleIcon className="w-3.5 h-3.5" /> Done
            </span>
          ) : (
            <DaysRemaining days={c.days_remaining} />
          )}
        </div>
      </div>

      {c.scheduled_date && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
          <CalendarIcon className="w-3.5 h-3.5" />
          Scheduled: <span className="font-semibold text-slate-700">{new Date(c.scheduled_date).toLocaleDateString()}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {role === 'Doctor' && c.status === 'Upcoming' && (
          <Button size="sm" onClick={() => onSchedule(c)}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs h-8 px-3">
            <CalendarIcon className="w-3.5 h-3.5 mr-1" /> Schedule
          </Button>
        )}
        {role === 'Doctor' && c.status === 'Scheduled' && (
          <Button size="sm" onClick={() => onStart(c)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs h-8 px-3">
            <PlayIcon className="w-3.5 h-3.5 mr-1" /> Start Vaccination
          </Button>
        )}
        {role === 'Doctor' && c.status === 'InProgress' && (
          <Button size="sm" onClick={() => onComplete(c)}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs h-8 px-3">
            <CheckCircleIcon className="w-3.5 h-3.5 mr-1" /> Vaccinate Now
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onView(c)}
          className="rounded-lg text-xs h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50">
          <ChevronRightIcon className="w-3.5 h-3.5 mr-1" />
          {c.status === 'Completed' ? 'View Vaccinated' : 'View Animals'}
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RoutineVaccinationPage() {
  const [role, setRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [tab, setTab] = useState<'templates' | 'campaigns'>('campaigns')

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])

  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  // Loading
  const [loading, setLoading] = useState(false)

  // Dialogs
  const [templateDialog, setTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [scheduleDialog, setScheduleDialog] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [completeDialog, setCompleteDialog] = useState(false)
  const [detailsDialog, setDetailsDialog] = useState(false)
  const [detailsData, setDetailsData] = useState<CampaignDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Forms
  const [tForm, setTForm] = useState({ campaign_name: '', animal_type: 'Goat', vaccine_id: '', frequency_months: '12', reminder_days_before: '30', start_date: '' })
  const [schedDate, setSchedDate] = useState('')
  const [completeForm, setCompleteForm] = useState({ stock_id: '', administered_by: '', date_administered: todayLocalYmd(), dosage_ml: '1' })
  const [stocks, setStocks] = useState<any[]>([])
  const [completeDetails, setCompleteDetails] = useState<CampaignDetails | null>(null)
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<number[]>([])
  const [animalSearch, setAnimalSearch] = useState('')
  const [expandedRecordAnimalId, setExpandedRecordAnimalId] = useState<number | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    const r = localStorage.getItem('role')
    let uid = localStorage.getItem('userId')
    // Fallback: haddii userId aan localStorage ku jirin, ka soo akhri token-ka JWT
    if (!uid) {
      const t = localStorage.getItem('token')
      try {
        if (t) {
          const b64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(atob(b64))
          if (payload?.userId != null) {
            uid = String(payload.userId)
            localStorage.setItem('userId', uid)
          }
        }
      } catch { /* token decode failed – uid waa null */ }
    }
    setRole(r)
    setUserId(uid ? parseInt(uid) : null)
    if (r === 'Admin') setTab('templates')
    fetchCampaigns()
    fetchVaccines()
    fetchTemplates()
  }, [])

  const fetchTemplates = useCallback(async () => {
    const res = await fetch(`${API}/api/routine-templates`, { headers })
    if (res.ok) setTemplates(await res.json())
  }, [])

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`${API}/api/routine-campaigns`, { headers })
    if (res.ok) setCampaigns(await res.json())
    setLoading(false)
  }, [])

  const fetchVaccines = useCallback(async () => {
    const res = await fetch(`${API}/api/vaccines`, { headers })
    if (res.ok) setVaccines(await res.json())
  }, [])

  const fetchStocks = useCallback(async () => {
    const res = await fetch(`${API}/api/stock`, { headers })
    if (res.ok) setStocks(await res.json())
  }, [])

  // ── Template CRUD ──────────────────────────────────────────────────────────
  const openCreateTemplate = () => {
    setEditingTemplate(null)
    setTForm({ campaign_name: '', animal_type: 'Goat', vaccine_id: '', frequency_months: '12', reminder_days_before: '30', start_date: '' })
    setTemplateDialog(true)
  }

  const openEditTemplate = (t: Template) => {
    setEditingTemplate(t)
    setTForm({
      campaign_name: t.campaign_name,
      animal_type: t.animal_type,
      vaccine_id: String(t.vaccine_id),
      frequency_months: String(t.frequency_months),
      reminder_days_before: String(t.reminder_days_before),
      start_date: t.start_date.split('T')[0],
    })
    setTemplateDialog(true)
  }

  const saveTemplate = async () => {
    const url = editingTemplate ? `${API}/api/routine-templates/${editingTemplate.id}` : `${API}/api/routine-templates`
    const method = editingTemplate ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers, body: JSON.stringify(tForm) })
    if (res.ok) { setTemplateDialog(false); fetchTemplates() }
    else alertBox('Error', (await res.json()).error || 'Failed to save template.', 'error')
  }

  const toggleStatus = async (t: Template) => {
    const newStatus = t.status === 'Active' ? 'Inactive' : 'Active'
    await fetch(`${API}/api/routine-templates/${t.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: newStatus }) })
    fetchTemplates()
  }

  const deleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    const res = await fetch(`${API}/api/routine-templates/${id}`, { method: 'DELETE', headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alertBox('Error', data.error || 'Failed to delete template.', 'error')
      return
    }
    fetchTemplates()
  }

  const triggerCheck = async () => {
    const res = await fetch(`${API}/api/routine-campaigns/trigger-check`, { method: 'POST', headers })
    const data = await res.json()
    alertBox(data.error ? 'Error' : 'Success', data.message || data.error || '', data.error ? 'error' : 'success')
    fetchCampaigns()
  }

  // ── Campaign Actions ──────────────────────────────────────────────────────
  const openSchedule = (c: Campaign) => { setSelectedCampaign(c); setSchedDate(''); setScheduleDialog(true) }
  const submitSchedule = async () => {
    if (!selectedCampaign) return
    const res = await fetch(`${API}/api/routine-campaigns/${selectedCampaign.id}/schedule`, {
      method: 'PATCH', headers, body: JSON.stringify({ scheduled_date: schedDate, doctor_id: userId })
    })
    if (res.ok) { setScheduleDialog(false); fetchCampaigns() }
    else alertBox('Error', (await res.json()).error || 'Failed to schedule.', 'error')
  }

  const startCampaign = async (c: Campaign) => {
    const res = await fetch(`${API}/api/routine-campaigns/${c.id}/start`, { method: 'PATCH', headers })
    if (res.ok) fetchCampaigns()
    else alertBox('Error', (await res.json()).error || 'Failed to start campaign.', 'error')
  }

  const openComplete = async (c: Campaign) => {
    setSelectedCampaign(c)
    setCompleteForm({ stock_id: '', administered_by: String(userId || ''), date_administered: todayLocalYmd(), dosage_ml: '1' })
    setCompleteDetails(null)
    setSelectedAnimalIds([])
    setAnimalSearch('')
    await fetchStocks()
    const res = await fetch(`${API}/api/routine-campaigns/${c.id}`, { headers })
    if (res.ok) {
      const data: CampaignDetails = await res.json()
      // Always use fresh campaign (vaccine_id) from API — list card can be stale
      setSelectedCampaign({
        ...c,
        ...data,
        vaccine_id: data.vaccine_id,
        vaccine: data.vaccine,
      })
      setCompleteDetails(data)
      const unvaccinatedIds = data.animals
        .filter(a => !data.vaccinated_animal_ids.includes(a.animal_id))
        .map(a => a.animal_id)
      setSelectedAnimalIds(unvaccinatedIds)
    }
    setCompleteDialog(true)
  }

  const openDetails = async (c: Campaign) => {
    setSelectedCampaign(c)
    setDetailsData(null)
    setDetailsLoading(true)
    setDetailsDialog(true)
    const res = await fetch(`${API}/api/routine-campaigns/${c.id}`, { headers })
    if (res.ok) setDetailsData(await res.json())
    setDetailsLoading(false)
  }

  const submitComplete = async () => {
    if (!selectedCampaign) return
    // Use toast while dialog is open (SweetAlert OK is blocked by dialog focus trap)
    if (!completeForm.stock_id) {
      toast.warning('Please select a Vaccine Stock.')
      return
    }
    if (!completeForm.administered_by) {
      toast.warning('User not recognized. Please log in again.')
      return
    }
    if (selectedAnimalIds.length === 1 && (!completeForm.dosage_ml || Number(completeForm.dosage_ml) <= 0)) {
      toast.warning('Please enter a valid dosage for single-animal vaccination.')
      return
    }
    if (selectedAnimalIds.length === 0) {
      toast.warning('Please select at least one animal.')
      return
    }
    const today = todayLocalYmd()
    if (!completeForm.date_administered || completeForm.date_administered !== today) {
      toast.warning('Date Administered must be today only. Past and future dates are not allowed.')
      setCompleteForm((prev) => ({ ...prev, date_administered: today }))
      return
    }
    const res = await fetch(`${API}/api/routine-campaigns/${selectedCampaign.id}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...completeForm, selected_animal_ids: selectedAnimalIds })
    })
    if (res.ok) {
      const data = await res.json()
      setCompleteDialog(false)
      fetchCampaigns()
      toast.success(data.message || 'Vaccination saved successfully.')
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to complete vaccination.')
    }
  }

  // ── Filter campaigns by role/tab ───────────────────────────────────────────
  const upcomingCampaigns = campaigns.filter(c => ['Upcoming', 'Scheduled', 'InProgress'].includes(c.status))
  const completedCampaigns = campaigns.filter(c => c.status === 'Completed')
  const isBulkSelection = selectedAnimalIds.length > 1
  const usableStocks = stocks.filter((s: any) =>
    isUsableStock(s, selectedCampaign?.vaccine_id, selectedCampaign?.animal_type)
  )

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Active Templates', value: templates.filter(t => t.status === 'Active').length, icon: <LayersIcon className="w-5 h-5" />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600', bar: 'bg-emerald-500' },
    { label: 'Upcoming', value: campaigns.filter(c => ['Upcoming', 'InProgress'].includes(c.status)).length, icon: <ClockIcon className="w-5 h-5" />, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-blue-600', bar: 'bg-blue-500' },
    { label: 'Scheduled', value: campaigns.filter(c => c.status === 'Scheduled' || (c.status === 'InProgress' && c.scheduled_date)).length, icon: <CalendarIcon className="w-5 h-5" />, iconBg: 'bg-violet-50', iconColor: 'text-violet-600', valueColor: 'text-violet-600', bar: 'bg-violet-500' },
    { label: 'Completed', value: completedCampaigns.length, icon: <CheckCircleIcon className="w-5 h-5" />, iconBg: 'bg-teal-50', iconColor: 'text-teal-600', valueColor: 'text-teal-600', bar: 'bg-teal-500' },
  ]

  return (
    <div className="bg-[#f8faff] min-h-screen p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <SyringeIcon className="w-6 h-6 text-blue-600" /> Routine Vaccination
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage recurring vaccination templates, campaigns, and schedules</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchCampaigns(); fetchTemplates() }} variant="outline" size="sm" className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50">
            <RefreshCwIcon className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {role === 'Admin' && (
            <>
              <Button onClick={triggerCheck} variant="outline" size="sm" className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50">
                <PlayIcon className="w-4 h-4 mr-1" /> Trigger Check
              </Button>
              <Button onClick={openCreateTemplate} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                <PlusIcon className="w-4 h-4 mr-1" /> New Template
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="relative bg-white rounded-2xl px-5 pt-5 pb-6 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.08)] border border-slate-100/80 overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${s.iconBg} ${s.iconColor} flex items-center justify-center shrink-0`}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className={`text-[28px] leading-none font-extrabold tracking-tight ${s.valueColor}`}>{s.value}</div>
                <div className="mt-1.5 text-[13px] font-semibold text-slate-600">{s.label}</div>
              </div>
            </div>
            <div className="absolute bottom-3 left-5 right-5 h-[3px] rounded-full bg-slate-100 overflow-hidden">
              <span className={`absolute right-0 top-0 h-full w-8 rounded-full ${s.bar}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {role === 'Admin' && (
          <button onClick={() => setTab('templates')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${tab === 'templates' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-blue-600 border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
            <FileTextIcon className="w-4 h-4" /> Templates
          </button>
        )}
        <button onClick={() => setTab('campaigns')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${tab === 'campaigns' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-blue-600 border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
          <MegaphoneIcon className="w-4 h-4" /> Campaigns
        </button>
      </div>

      {/* ── Templates Tab (Admin only) ──────────────────────────────────────── */}
      {tab === 'templates' && role === 'Admin' && (
        <Card className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <CardHeader className="p-6 pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 text-white shrink-0">
                <FileTextIcon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-extrabold text-slate-800">Vaccination Templates</CardTitle>
                <p className="text-sm text-slate-500 mt-0.5">Create and manage vaccination templates for different animals</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">
                <FilterIcon className="w-4 h-4 mr-2" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">
                <ArrowUpDownIcon className="w-4 h-4 mr-2" /> Sort by
              </Button>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center">
                <MoreVerticalIcon className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {templates.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Template ma jirto weli. Ku dar mid cusub.</div>
            ) : (
              <div className="divide-y divide-slate-100/60">
                {/* Table Header */}
                <div className="grid grid-cols-7 px-8 py-3.5 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="col-span-2">Campaign</span>
                  <span>Animal</span>
                  <span>Vaccine</span>
                  <span>Frequency</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                {templates.map(t => (
                  <div key={t.id} className="grid grid-cols-7 px-8 py-5 items-center hover:bg-slate-50/50 transition-colors">
                    <div className="col-span-2 flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <div>
                        <div className="font-extrabold text-slate-800 text-[13px]">{t.campaign_name}</div>
                        <div className="text-[12px] font-medium text-slate-400 mt-0.5">Start: {new Date(t.start_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-3 text-[13px] font-semibold text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100/50 shrink-0">
                        <AnimalEmoji type={t.animal_type} />
                      </div>
                      {t.animal_type}
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">{t.vaccine?.vaccine_name}</span>
                    <span className="text-[13px] font-medium text-slate-600">Every {t.frequency_months} months</span>
                    <div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditTemplate(t)} className="w-9 h-9 flex items-center justify-center text-blue-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all bg-white shadow-sm">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatus(t)} className="w-9 h-9 flex items-center justify-center text-orange-500 border border-slate-200 hover:border-orange-200 hover:bg-orange-50 rounded-xl transition-all bg-white shadow-sm" title={t.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <PowerIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTemplate(t.id)} className="w-9 h-9 flex items-center justify-center text-red-500 border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all bg-white shadow-sm">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination Footer */}
            {templates.length > 0 && (
              <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[13px] font-medium text-slate-500">
                  Showing 1 to {templates.length} of {templates.length} templates
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="w-8 h-8 p-0 rounded-lg border-slate-200 text-slate-400">
                    <ChevronRightIcon className="w-4 h-4 rotate-180" />
                  </Button>
                  <Button variant="outline" size="sm" className="w-8 h-8 p-0 rounded-lg bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:text-white">
                    1
                  </Button>
                  <Button variant="outline" size="sm" className="w-8 h-8 p-0 rounded-lg border-slate-200 text-slate-400">
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Campaigns Tab ──────────────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        <div className="space-y-6">
          {/* Upcoming / Active */}
          <div>
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-blue-500" /> Upcoming & Active Campaigns ({upcomingCampaigns.length})
            </h2>
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
            ) : upcomingCampaigns.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-slate-100">
                Campaign upcoming ma jirto.
                {role === 'Admin' && <> Abuur template, kadib "Trigger Check" riix.</>}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingCampaigns.map(c => (
                  <CampaignCard key={c.id} c={c} role={role || ''} onSchedule={openSchedule} onStart={startCampaign} onComplete={openComplete} onView={openDetails} />
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          {completedCampaigns.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-teal-500" /> Completed Campaigns ({completedCampaigns.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedCampaigns.map(c => (
                  <CampaignCard key={c.id} c={c} role={role || ''} onSchedule={() => {}} onStart={() => {}} onComplete={() => {}} onView={openDetails} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dialog: Create / Edit Template ─────────────────────────────────── */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              {editingTemplate ? 'Edit Template' : 'Create Vaccination Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Campaign Name</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={tForm.campaign_name} onChange={e => setTForm({ ...tForm, campaign_name: e.target.value })} placeholder="e.g. January PPR Vaccination" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Animal Type</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  value={tForm.animal_type} onChange={e => setTForm({ ...tForm, animal_type: e.target.value })}>
                  <option>Goat</option><option>Cattle</option><option>Camel</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Vaccine</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  value={tForm.vaccine_id} onChange={e => setTForm({ ...tForm, vaccine_id: e.target.value })}>
                  <option value="">-- Select --</option>
                  {vaccines.map(v => <option key={v.vaccine_id} value={v.vaccine_id}>{v.vaccine_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Frequency (months)</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  value={tForm.frequency_months} onChange={e => setTForm({ ...tForm, frequency_months: e.target.value })}>
                  <option value="6">6 Months</option><option value="12">12 Months</option><option value="3">3 Months</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Reminder (days before)</label>
                <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  value={tForm.reminder_days_before} onChange={e => setTForm({ ...tForm, reminder_days_before: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Start Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                value={tForm.start_date} onChange={e => setTForm({ ...tForm, start_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveTemplate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              {editingTemplate ? 'Update' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Schedule Campaign ───────────────────────────────────────── */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">Schedule Vaccination</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm text-slate-600">Campaign: <span className="font-bold">{selectedCampaign?.campaign_name}</span></p>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Vaccination Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                value={schedDate} onChange={e => setSchedDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={submitSchedule} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">Confirm Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Complete Campaign ───────────────────────────────────────── */}
      <Dialog open={completeDialog} onOpenChange={setCompleteDialog}>
        <DialogContent className="!w-[min(880px,94vw)] !max-w-[880px] sm:!max-w-[880px] !h-[min(820px,88vh)] !max-h-[min(820px,88vh)] rounded-3xl border border-slate-100/80 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.35)] !p-0 !gap-0 flex flex-col overflow-hidden bg-white">
          <DialogHeader className="shrink-0 px-6 pt-5 pb-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white">
            <DialogTitle className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                <CheckCircleIcon className="w-4 h-4" />
              </span>
              Complete Vaccination
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-5 min-h-0 flex-1 overflow-hidden">
            {/* Left column — no scroll cut-off; compact so all fields show */}
            <div className="space-y-3 min-h-0 overflow-y-auto pr-1">
              <div className="bg-emerald-50 rounded-2xl p-3 text-emerald-800 flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
                  <AnimalEmoji type={selectedCampaign?.animal_type || ''} />
                </div>
                <div>
                  <p className="font-extrabold text-sm leading-tight">{fullVaccineName(selectedCampaign?.campaign_name)}</p>
                  <p className="mt-1 text-[11px] text-emerald-700/90 leading-relaxed">
                    Select specific <strong>{selectedCampaign?.animal_type}</strong> animals to vaccinate now. You can complete in batches.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                  Dosage (ml)
                  <InfoIcon className="w-3.5 h-3.5 text-slate-400" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 pr-12 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    value="1"
                    disabled
                    onChange={e => setCompleteForm({ ...completeForm, dosage_ml: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ml</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Fixed dose: system uses exactly 1 dose for each animal.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Vaccine Stock</label>
                <div className="relative">
                  <PackageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 appearance-none bg-white"
                    value={completeForm.stock_id}
                    onChange={e => setCompleteForm({ ...completeForm, stock_id: e.target.value })}
                  >
                    <option value="">-- Select Stock --</option>
                    {usableStocks.map((s: any) => (
                      <option key={s.stock_id} value={s.stock_id}>
                        {s.vaccine?.vaccine_name} – Batch {s.batch_number || 'N/A'} ({s.quantity_remaining} remaining)
                      </option>
                    ))}
                    {usableStocks.length === 0 && (
                      <option disabled value="">No usable stock available</option>
                    )}
                  </select>
                </div>
                {usableStocks.length === 0 && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-start gap-1.5">
                    <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      No usable (non-expired) stock found for{" "}
                      <strong>{selectedCampaign?.vaccine?.vaccine_name}</strong>.
                      Inventory stock must be registered under this same vaccine name
                      (not a different camel vaccine). Add/check it in Inventory (Stock).
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Date Administered</label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    min={todayLocalYmd()}
                    max={todayLocalYmd()}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    value={completeForm.date_administered}
                    onChange={e => {
                      const today = todayLocalYmd()
                      const next = e.target.value
                      if (next && next !== today) {
                        toast.warning('Only today is allowed. Past and future dates cannot be selected.')
                        setCompleteForm({ ...completeForm, date_administered: today })
                        return
                      }
                      setCompleteForm({ ...completeForm, date_administered: next || today })
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Today only — past and future dates are blocked.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Next Due Date</label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    readOnly
                    tabIndex={-1}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-slate-50 text-slate-600 cursor-not-allowed focus:outline-none"
                    value={
                      addMonthsYmd(
                        completeForm.date_administered,
                        completeDetails?.template?.frequency_months ||
                          (selectedCampaign as CampaignDetails | null)?.template?.frequency_months ||
                          0
                      )
                    }
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Auto-calculated (Date Administered + every{" "}
                  {completeDetails?.template?.frequency_months ||
                    (selectedCampaign as CampaignDetails | null)?.template?.frequency_months ||
                    "—"}{" "}
                  month(s)). Read only.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 text-xs text-amber-800 flex gap-2">
                <InfoIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>Stock will be reduced only for selected animals vaccinated in this batch.</span>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-2 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <label className="text-sm font-extrabold text-slate-700">Select Animals</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-blue-600 hover:underline"
                    onClick={() => {
                      const ids = (completeDetails?.animals || [])
                        .filter(a => !completeDetails?.vaccinated_animal_ids.includes(a.animal_id))
                        .map(a => a.animal_id)
                      setSelectedAnimalIds(Array.from(new Set(ids)))
                    }}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-slate-500 hover:underline"
                    onClick={() => setSelectedAnimalIds([])}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative shrink-0">
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search animals..."
                  value={animalSearch}
                  onChange={e => setAnimalSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-2xl bg-white divide-y divide-slate-50">
                {(completeDetails?.animals || [])
                  .filter(a => {
                    // Hide already vaccinated animals — only show those needing vaccination
                    if (completeDetails?.vaccinated_animal_ids.includes(a.animal_id)) return false
                    const q = animalSearch.trim().toLowerCase()
                    if (!q) return true
                    return (
                      String(a.animal_id).includes(q) ||
                      (a.nickname || '').toLowerCase().includes(q) ||
                      (a.farm?.farm_name || '').toLowerCase().includes(q) ||
                      (a.animal_type || '').toLowerCase().includes(q) ||
                      (a.biological_type || '').toLowerCase().includes(q)
                    )
                  })
                  .map(a => {
                    const alreadyVaccinated = completeDetails?.vaccinated_animal_ids.includes(a.animal_id)
                    const checked = selectedAnimalIds.includes(a.animal_id)
                    // Latest record for this animal in this campaign (for the details panel)
                    const record = alreadyVaccinated
                      ? [...(completeDetails?.records || [])]
                          .filter(r => r.animal_id === a.animal_id)
                          .sort((x, y) => new Date(y.date_administered).getTime() - new Date(x.date_administered).getTime())[0]
                      : undefined
                    const isExpanded = expandedRecordAnimalId === a.animal_id
                    return (
                      <div key={a.animal_id}>
                        <label
                          className={`flex items-center gap-3 px-3 py-2 text-sm ${
                            alreadyVaccinated
                              ? 'bg-slate-50 text-slate-400'
                              : 'hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-emerald-600 rounded"
                            checked={checked}
                            disabled={alreadyVaccinated}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAnimalIds(prev => Array.from(new Set([...prev, a.animal_id])))
                              else setSelectedAnimalIds(prev => prev.filter(id => id !== a.animal_id))
                            }}
                          />
                          <span className="font-bold text-slate-700 shrink-0">#{a.animal_id}</span>
                          <span className="flex flex-col min-w-0">
                            <span className={`truncate font-semibold ${alreadyVaccinated ? 'text-slate-400' : 'text-slate-700'}`}>
                              {a.nickname || 'Unnamed'}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {a.animal_type}{a.biological_type ? ` · ${a.biological_type}` : ''}{a.age != null && a.age > 0 ? ` · ${formatAnimalAge(a.age)}` : ''}
                            </span>
                          </span>
                          {alreadyVaccinated ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                setExpandedRecordAnimalId(isExpanded ? null : a.animal_id)
                              }}
                              className={`ml-auto inline-flex items-center gap-1 text-xs shrink-0 cursor-pointer transition-colors ${
                                isExpanded ? 'text-slate-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              already vaccinated
                              <ChevronRightIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          ) : (
                            <span className="ml-auto text-xs text-slate-400 truncate max-w-[35%] text-right shrink-0">
                              {a.farm?.farm_name || 'No farm'}
                            </span>
                          )}
                        </label>

                        {alreadyVaccinated && isExpanded && (
                          <div className="mx-3 mb-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                            {record ? (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Vaccine</p>
                                  <p className="font-bold text-slate-700">{record.vaccine?.vaccine_name || completeDetails?.vaccine?.vaccine_name || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Given By</p>
                                  <p className="font-bold text-slate-700">{record.administered_user?.full_name || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Dose</p>
                                  <p className="font-bold text-slate-700">{record.dosage_ml != null ? `${record.dosage_ml} ml` : '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Date Given</p>
                                  <p className="font-bold text-slate-700">{new Date(record.date_administered).toLocaleDateString()}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Next Due</p>
                                  <p className="font-bold text-blue-600">{new Date(record.next_due_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400">No record details found.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                {(completeDetails?.animals || []).length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-10">No animals found.</div>
                )}
              </div>

              <p className="text-xs font-semibold text-blue-600 shrink-0">
                Selected: {selectedAnimalIds.length} animal{selectedAnimalIds.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <DialogFooter className="!mx-0 !mb-0 shrink-0 px-6 py-4 rounded-b-3xl border-t border-slate-100 bg-slate-50/60 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCompleteDialog(false)}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-white"
            >
              <XIcon className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button
              onClick={submitComplete}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <CheckCircleIcon className="w-4 h-4 mr-1.5" /> Complete Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Campaign Details (Vaccinated Animals) ───────────────────── */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent
          className="!w-[min(920px,94vw)] !max-w-[920px] sm:!max-w-[920px] rounded-2xl border border-slate-100/80 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.35)] !p-0 !gap-0 flex flex-col overflow-hidden bg-white"
        >
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 text-left shrink-0">
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-start gap-3 pr-10">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <SyringeIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="leading-snug whitespace-normal break-words">
                  {fullVaccineName(selectedCampaign?.campaign_name) || selectedCampaign?.campaign_name}
                  {selectedCampaign?.animal_type ? ` – ${selectedCampaign.animal_type}` : ""}
                </div>
                {detailsData?.template?.frequency_months ? (
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Frequency: every {detailsData.template.frequency_months} month(s)
                  </p>
                ) : null}
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
          ) : !detailsData ? (
            <div className="py-16 text-center text-slate-400 text-sm">No data found.</div>
          ) : (
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                    <ClockIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</div>
                    <div className="text-sm font-extrabold text-blue-700">{detailsData.status}</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vaccinated</div>
                    <div className="text-sm font-extrabold text-emerald-700">{detailsData.records.length}</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                    <UsersIcon className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Eligible</div>
                    <div className="text-sm font-extrabold text-violet-700">{detailsData.animals.length}</div>
                  </div>
                </div>
              </div>

              {/* Vaccinated animals table only */}
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                  </span>
                  Vaccinated Animals ({detailsData.records.length})
                </h4>

                {detailsData.records.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                    No vaccinated animals yet.
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <div className="max-h-80 overflow-auto">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            <th className="px-4 py-3 font-bold">Animal</th>
                            <th className="px-4 py-3 font-bold">Farm</th>
                            <th className="px-4 py-3 font-bold">Given On</th>
                            <th className="px-4 py-3 font-bold">Dose</th>
                            <th className="px-4 py-3 font-bold">Next Due</th>
                            <th className="px-4 py-3 font-bold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailsData.records.map((r) => (
                            <tr key={r.id} className="border-t border-slate-50 text-[13px]">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 font-semibold text-slate-800">
                                  <span className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-sm">
                                    <AnimalEmoji type={r.animal?.animal_type || detailsData.animal_type} />
                                  </span>
                                  {r.animal?.nickname || `#${r.animal_id}`}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{r.animal?.farm?.farm_name || "—"}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(r.date_administered).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.dosage_ml == null ? "—" : `${r.dosage_ml} ml`}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(r.next_due_date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  Completed
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <InfoIcon className="w-3.5 h-3.5" />
              Total records: {detailsData?.records.length ?? 0}
            </p>
            <Button
              onClick={() => setDetailsDialog(false)}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-10 px-5"
            >
              <XIcon className="w-4 h-4 mr-1.5" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
