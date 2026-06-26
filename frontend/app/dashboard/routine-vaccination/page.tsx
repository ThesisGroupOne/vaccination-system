"use client"

import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  CalendarIcon, SyringeIcon, PlusIcon, PlayIcon, CheckCircleIcon,
  ClockIcon, RefreshCwIcon, TrashIcon, PencilIcon, PowerIcon,
  ChevronRightIcon, AlertCircleIcon, LayersIcon
} from "lucide-react"

const API = "http://localhost:9999"

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
  const map: Record<string, string> = {
    Active:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    Inactive:   "bg-slate-100 text-slate-500 border-slate-200",
    Upcoming:   "bg-blue-100 text-blue-700 border-blue-200",
    Scheduled:  "bg-purple-100 text-purple-700 border-purple-200",
    InProgress: "bg-orange-100 text-orange-700 border-orange-200",
    Completed:  "bg-teal-100 text-teal-700 border-teal-200",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${map[status] || "bg-gray-100 text-gray-600"}`}>
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
  const [completeForm, setCompleteForm] = useState({ stock_id: '', administered_by: '', date_administered: new Date().toISOString().split('T')[0], dosage_ml: '1' })
  const [stocks, setStocks] = useState<any[]>([])
  const [completeDetails, setCompleteDetails] = useState<CampaignDetails | null>(null)
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<number[]>([])

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
    if (r === 'Admin') fetchTemplates()
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
    else alert((await res.json()).error)
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
      alert(data.error || 'Failed to delete template.')
      return
    }
    fetchTemplates()
  }

  const triggerCheck = async () => {
    const res = await fetch(`${API}/api/routine-campaigns/trigger-check`, { method: 'POST', headers })
    const data = await res.json()
    alert(data.message || data.error)
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
    else alert((await res.json()).error)
  }

  const startCampaign = async (c: Campaign) => {
    const res = await fetch(`${API}/api/routine-campaigns/${c.id}/start`, { method: 'PATCH', headers })
    if (res.ok) fetchCampaigns()
    else alert((await res.json()).error)
  }

  const openComplete = async (c: Campaign) => {
    setSelectedCampaign(c)
    setCompleteForm({ stock_id: '', administered_by: String(userId || ''), date_administered: new Date().toISOString().split('T')[0], dosage_ml: '1' })
    setCompleteDetails(null)
    setSelectedAnimalIds([])
    await fetchStocks()
    const res = await fetch(`${API}/api/routine-campaigns/${c.id}`, { headers })
    if (res.ok) {
      const data: CampaignDetails = await res.json()
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
    if (!completeForm.stock_id) { alert('Fadlan dooro Vaccine Stock.'); return }
    if (!completeForm.administered_by) { alert('User-ka lama aqoonsan. Fadlan dib u gal (re-login).'); return }
    if (selectedAnimalIds.length === 1 && (!completeForm.dosage_ml || Number(completeForm.dosage_ml) <= 0)) {
      alert('Please enter a valid dosage for single-animal vaccination.')
      return
    }
    if (selectedAnimalIds.length === 0) { alert('Please select at least one animal.'); return }
    const res = await fetch(`${API}/api/routine-campaigns/${selectedCampaign.id}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...completeForm, selected_animal_ids: selectedAnimalIds })
    })
    if (res.ok) {
      const data = await res.json()
      setCompleteDialog(false)
      fetchCampaigns()
      alert(data.message || 'Vaccination saved.')
    }
    else alert((await res.json()).error)
  }

  // ── Filter campaigns by role/tab ───────────────────────────────────────────
  const upcomingCampaigns = campaigns.filter(c => ['Upcoming', 'Scheduled', 'InProgress'].includes(c.status))
  const completedCampaigns = campaigns.filter(c => c.status === 'Completed')
  const isBulkSelection = selectedAnimalIds.length > 1

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Active Templates', value: templates.filter(t => t.status === 'Active').length, color: 'bg-emerald-50 text-emerald-700', icon: <LayersIcon className="w-5 h-5" /> },
    { label: 'Upcoming', value: campaigns.filter(c => c.status === 'Upcoming').length, color: 'bg-blue-50 text-blue-700', icon: <ClockIcon className="w-5 h-5" /> },
    { label: 'Scheduled', value: campaigns.filter(c => c.status === 'Scheduled').length, color: 'bg-purple-50 text-purple-700', icon: <CalendarIcon className="w-5 h-5" /> },
    { label: 'Completed', value: completedCampaigns.length, color: 'bg-teal-50 text-teal-700', icon: <CheckCircleIcon className="w-5 h-5" /> },
  ]

  return (
    <div className="bg-[#f8faff] min-h-screen p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <SyringeIcon className="w-6 h-6 text-blue-600" /> Routine Vaccination
          </h1>
          <p className="text-slate-500 text-sm mt-1">Maamulka tallaalka joogtada ah – Animals, Campaigns, Jadwalka</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCampaigns} variant="outline" size="sm" className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50">
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
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}>{s.icon}</div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {role === 'Admin' && (
          <button onClick={() => setTab('templates')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'templates' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
            📋 Templates
          </button>
        )}
        <button onClick={() => setTab('campaigns')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'campaigns' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
          📅 Campaigns
        </button>
      </div>

      {/* ── Templates Tab (Admin only) ──────────────────────────────────────── */}
      {tab === 'templates' && role === 'Admin' && (
        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader className="p-6 border-b border-slate-50">
            <CardTitle className="text-base font-extrabold text-slate-800">Vaccination Templates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {templates.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Template ma jirto weli. Ku dar mid cusub.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {/* Table Header */}
                <div className="grid grid-cols-7 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span className="col-span-2">Campaign</span>
                  <span>Animal</span>
                  <span>Vaccine</span>
                  <span>Frequency</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                {templates.map(t => (
                  <div key={t.id} className="grid grid-cols-7 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-2">
                      <div className="font-bold text-slate-800 text-sm">{t.campaign_name}</div>
                      <div className="text-[11px] text-slate-400">Start: {new Date(t.start_date).toLocaleDateString()}</div>
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <AnimalEmoji type={t.animal_type} /> {t.animal_type}
                    </span>
                    <span className="text-sm text-slate-600">{t.vaccine?.vaccine_name}</span>
                    <span className="text-sm text-slate-600">Every {t.frequency_months} months</span>
                    <StatusBadge status={t.status} />
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEditTemplate(t)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatus(t)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title={t.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <PowerIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTemplate(t.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
        <DialogContent className="w-[95vw] max-w-4xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-teal-600" /> Complete Vaccination
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 grid lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-teal-50 rounded-xl p-3 text-sm text-teal-700">
                <p className="font-bold">{selectedCampaign?.campaign_name}</p>
                <p className="mt-1">Select specific <strong>{selectedCampaign?.animal_type}</strong> animals to vaccinate now. You can complete in batches.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Dosage (ml)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  value={isBulkSelection ? '1' : completeForm.dosage_ml}
                  disabled={isBulkSelection}
                  onChange={e => setCompleteForm({ ...completeForm, dosage_ml: e.target.value })}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {isBulkSelection
                    ? 'Bulk selection active: system uses 1 dose for each selected animal.'
                    : 'Single selection: doctor-defined dosage will be used.'}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Vaccine Stock</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  value={completeForm.stock_id} onChange={e => setCompleteForm({ ...completeForm, stock_id: e.target.value })}>
                  <option value="">-- Select Stock --</option>
                  {stocks.map((s: any) => (
                    <option key={s.stock_id} value={s.stock_id}>
                      {s.vaccine?.vaccine_name} – Batch {s.batch_number || 'N/A'} ({s.quantity_remaining} remaining)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Date Administered</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  value={completeForm.date_administered} onChange={e => setCompleteForm({ ...completeForm, date_administered: e.target.value })} />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex gap-2">
                <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                Stock will be reduced only for selected animals vaccinated in this batch.
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">Select Animals</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
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
                    className="text-[11px] font-semibold text-slate-500 hover:underline"
                    onClick={() => setSelectedAnimalIds([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="h-64 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                {(completeDetails?.animals || []).map(a => {
                  const alreadyVaccinated = completeDetails?.vaccinated_animal_ids.includes(a.animal_id)
                  const checked = selectedAnimalIds.includes(a.animal_id)
                  return (
                    <label key={a.animal_id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${alreadyVaccinated ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50 cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={alreadyVaccinated}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedAnimalIds(prev => Array.from(new Set([...prev, a.animal_id])))
                          else setSelectedAnimalIds(prev => prev.filter(id => id !== a.animal_id))
                        }}
                      />
                      <span className="font-semibold">#{a.animal_id}</span>
                      <span>{a.nickname || 'Unnamed'}</span>
                      <span className="text-slate-400">· {a.farm?.farm_name || 'No farm'}</span>
                      {alreadyVaccinated && <span className="ml-auto text-[10px]">already vaccinated</span>}
                    </label>
                  )
                })}
                {(completeDetails?.animals || []).length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-3">No animals found.</div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Selected: <span className="font-bold">{selectedAnimalIds.length}</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={submitComplete} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
              <CheckCircleIcon className="w-4 h-4 mr-1" /> Complete Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Campaign Details (Vaccinated Animals) ───────────────────── */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <SyringeIcon className="w-5 h-5 text-blue-600" />
              {selectedCampaign?.campaign_name} – {selectedCampaign?.animal_type}
            </DialogTitle>
            {detailsData?.template?.frequency_months && (
              <p className="text-xs text-slate-500 mt-1">
                Frequency: every <span className="font-semibold">{detailsData.template.frequency_months}</span> month(s)
              </p>
            )}
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-10 text-center text-slate-400 text-sm">Loading...</div>
          ) : !detailsData ? (
            <div className="py-10 text-center text-slate-400 text-sm">No data found.</div>
          ) : (
            <div className="py-2 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Status</div>
                  <div className="text-sm font-bold text-slate-700">{detailsData.status}</div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Vaccinated</div>
                  <div className="text-sm font-bold text-teal-600">{detailsData.records.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    {detailsData.status === 'Completed' ? 'Date' : 'Eligible'}
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {detailsData.completed_date
                      ? new Date(detailsData.completed_date).toLocaleDateString()
                      : detailsData.animals.length}
                  </div>
                </div>
              </div>

              {detailsData.records.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-teal-500" /> Vaccinated Animals ({detailsData.records.length})
                  </h4>
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <div className="grid grid-cols-5 px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400 sticky top-0">
                      <span>Animal</span>
                      <span>Farm</span>
                      <span>Given On</span>
                      <span>Dose</span>
                      <span>Next Due</span>
                    </div>
                    {detailsData.records.map(r => (
                      <div key={r.id} className="grid grid-cols-5 px-3 py-2 text-xs items-center border-t border-slate-50">
                        <span className="font-medium text-slate-700 flex items-center gap-1.5">
                          <AnimalEmoji type={r.animal?.animal_type || detailsData.animal_type} />
                          {r.animal?.nickname || `#${r.animal_id}`}
                        </span>
                        <span className="text-slate-500">{r.animal?.farm?.farm_name || '—'}</span>
                        <span className="text-slate-600">{new Date(r.date_administered).toLocaleDateString()}</span>
                        <span className="text-slate-600">{r.dosage_ml == null ? '—' : `${r.dosage_ml} ml`}</span>
                        <span className="text-slate-600">{new Date(r.next_due_date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4 text-blue-500" /> Eligible Animals ({detailsData.animals.length})
                  </h4>
                  {detailsData.animals.length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-6">No eligible animals.</div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                      <div className="grid grid-cols-3 px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400 sticky top-0">
                        <span>Animal</span>
                        <span>Farm</span>
                        <span>Age</span>
                      </div>
                      {detailsData.animals.map(a => (
                        <div key={a.animal_id} className="grid grid-cols-3 px-3 py-2 text-xs items-center border-t border-slate-50">
                          <span className="font-medium text-slate-700 flex items-center gap-1.5">
                            <AnimalEmoji type={a.animal_type} />
                            {a.nickname || `#${a.animal_id}`}
                          </span>
                          <span className="text-slate-500">{a.farm?.farm_name || '—'}</span>
                          <span className="text-slate-600">{a.age ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
