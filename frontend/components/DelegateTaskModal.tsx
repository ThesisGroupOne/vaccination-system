"use client"

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2Icon, UserCheckIcon, SearchIcon, ListIcon, ChevronDownIcon } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  user_id: number
  full_name: string
  role: string
  email?: string
}

interface Schedule {
  schedule_id: number
  status?: string
  vaccine?: { vaccine_name: string }
  animal?: { animal_id: number; nickname?: string }
}

interface DelegateTaskModalProps {
  open: boolean
  onClose: () => void
  schedule: Schedule | null
  onSuccess?: () => void
}

function vaccineCode(name?: string) {
  if (!name) return 'VA'
  const upper = name.toUpperCase()
  if (upper.includes('PPR') || upper.startsWith('PRJ')) return 'PR'
  if (upper.includes('ANTHRAX') || upper.includes('ANTX')) return 'AN'
  if (upper.includes('FMD')) return 'FM'
  const word = name.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/)[0] || 'VA'
  return word.slice(0, 2).toUpperCase()
}

function vaccineBadgeClass(name?: string) {
  const code = vaccineCode(name)
  if (code === 'FM') return 'bg-pink-400'
  if (code === 'AN') return 'bg-teal-500'
  if (code === 'PR') return 'bg-sky-400'
  const colors = ['bg-sky-400', 'bg-teal-500', 'bg-pink-400', 'bg-violet-400', 'bg-amber-400']
  let h = 0
  for (const c of code) h += c.charCodeAt(0)
  return colors[h % colors.length]
}

function scheduleLabel(s: Schedule) {
  const vaccine = s.vaccine?.vaccine_name || 'Vaccination'
  const animal = `Animal #${s.animal?.animal_id ?? '?'}`
  const nick = s.animal?.nickname ? ` (${s.animal.nickname})` : ''
  return `${vaccine} → ${animal}${nick}`
}

export default function DelegateTaskModal({ open, onClose, schedule, onSuccess }: DelegateTaskModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [selectedFromUserId, setSelectedFromUserId] = useState<string>('')
  const taskDropdownRef = useRef<HTMLDivElement>(null)

  const currentUserId = typeof window !== 'undefined' ? parseInt(localStorage.getItem('userId') || '0') : 0
  const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('role') : null

  const selectedSchedule = schedules.find((s) => String(s.schedule_id) === selectedScheduleId) || null

  useEffect(() => {
    if (!open) return
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:9999/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data: User[] = await res.json()
          const staff = data.filter(u => u.role === 'Doctor' || u.role === 'FarmWorker')
          if (schedule) {
             setUsers(staff.filter(u => u.user_id !== currentUserId))
          } else {
             setUsers(staff)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchUsers()

    if (!schedule) {
      const fetchSchedules = async () => {
        try {
          const token = localStorage.getItem('token')
          const res = await fetch('http://localhost:9999/api/schedules', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const data: Schedule[] = await res.json()
            setSchedules(data.filter(s => s.status === 'Pending'))
          }
        } catch (e) {
          console.error(e)
        }
      }
      fetchSchedules()
    }

    setSelectedUser(null)
    setSearchQuery('')
    setReason('')
    setSelectedScheduleId('')
    setSelectedFromUserId('')
    setIsTaskDropdownOpen(false)
    setIsDropdownOpen(false)
  }, [open, schedule, currentUserId])

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      setFilteredUsers(users)
    } else {
      setFilteredUsers(users.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      ))
    }
  }, [searchQuery, users])

  useEffect(() => {
    if (!isTaskDropdownOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (!taskDropdownRef.current?.contains(e.target as Node)) {
        setIsTaskDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isTaskDropdownOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || (!schedule && (!selectedScheduleId || (currentUserRole === 'Admin' && !selectedFromUserId)))) return
    if (currentUserRole === 'Admin' && !selectedUser) return

    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      const targetScheduleId = schedule ? schedule.schedule_id : parseInt(selectedScheduleId)

      const payload: Record<string, unknown> = {
        schedule_id: targetScheduleId,
        reason: reason.trim(),
      }

      if (currentUserRole === 'Admin' && selectedUser) {
        payload.to_user_id = selectedUser.user_id
      }

      if (!schedule && selectedFromUserId) {
        payload.from_user_id = parseInt(selectedFromUserId)
      }

      const res = await fetch('http://localhost:9999/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast.success(
          selectedUser
            ? `Task delegated to ${selectedUser.full_name} successfully!`
            : 'Delegation request submitted successfully!'
        )
        onClose()
        onSuccess?.()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to delegate task')
      }
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const roleColor = (role: string) => {
    if (role === 'Doctor') return 'bg-blue-100 text-blue-700'
    if (role === 'Admin') return 'bg-purple-100 text-purple-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:!max-w-[460px] rounded-[24px] border-none shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] bg-white p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <UserCheckIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-800">Delegate Task</DialogTitle>
                {schedule && (
                  <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                    {schedule.vaccine?.vaccine_name} → Animal #{schedule.animal?.animal_id}
                    {schedule.animal?.nickname ? ` (${schedule.animal.nickname})` : ''}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[min(70vh,640px)] overflow-y-auto">
          <div className="px-6 space-y-5">
            {!schedule && (
              <>
                {currentUserRole === 'Admin' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">Take Task From</Label>
                    <select
                      required
                      value={selectedFromUserId}
                      onChange={(e) => setSelectedFromUserId(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/60 outline-none focus:border-blue-400 transition-colors text-sm text-slate-700"
                    >
                      <option value="" disabled>Select staff to take task from</option>
                      {users.map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2" ref={taskDropdownRef}>
                  <Label className="text-sm font-bold text-blue-700 flex items-center gap-2">
                    <span className="inline-block w-1 h-4 rounded-full bg-blue-600" />
                    Select Task
                  </Label>
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsTaskDropdownOpen((v) => !v)}
                      className={`w-full flex items-center gap-2.5 border rounded-2xl px-4 h-12 bg-white transition-colors text-left ${
                        isTaskDropdownOpen
                          ? 'border-blue-400 ring-2 ring-blue-100 rounded-b-none border-b-blue-100'
                          : 'border-blue-200 hover:border-blue-300'
                      }`}
                    >
                      <ListIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      {selectedSchedule ? (
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className={`w-7 h-7 rounded-full ${vaccineBadgeClass(selectedSchedule.vaccine?.vaccine_name)} text-white text-[10px] font-black flex items-center justify-center flex-shrink-0`}>
                            {vaccineCode(selectedSchedule.vaccine?.vaccine_name)}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {scheduleLabel(selectedSchedule)}
                          </span>
                        </div>
                      ) : (
                        <span className="flex-1 text-sm text-slate-400">Select a pending task to delegate</span>
                      )}
                      <ChevronDownIcon className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${isTaskDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Inline list inside the card (not floating outside) */}
                    {isTaskDropdownOpen && (
                      <div className="border border-t-0 border-blue-200 rounded-b-2xl bg-white overflow-hidden max-h-[220px] overflow-y-auto shadow-inner">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedScheduleId('')
                            setIsTaskDropdownOpen(false)
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-left bg-blue-50 text-blue-700"
                        >
                          <ListIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-semibold">Select a pending task to delegate</span>
                        </button>

                        {schedules.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-sm">No pending tasks found</div>
                        ) : (
                          schedules.map((s) => {
                            const active = String(s.schedule_id) === selectedScheduleId
                            return (
                              <button
                                key={s.schedule_id}
                                type="button"
                                onClick={() => {
                                  setSelectedScheduleId(String(s.schedule_id))
                                  setIsTaskDropdownOpen(false)
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-t border-slate-50 ${
                                  active ? 'bg-blue-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className={`w-8 h-8 rounded-full ${vaccineBadgeClass(s.vaccine?.vaccine_name)} text-white text-[11px] font-black flex items-center justify-center flex-shrink-0`}>
                                  {vaccineCode(s.vaccine?.vaccine_name)}
                                </span>
                                <span className="text-sm font-semibold text-slate-800 truncate">
                                  {scheduleLabel(s)}
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {currentUserRole === 'Admin' && (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Delegate To</Label>
                <div className="relative">
                  <div
                    className="w-full flex items-center gap-2 border border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/60 cursor-pointer hover:border-blue-300 transition-colors"
                    onClick={() => setIsDropdownOpen(v => !v)}
                  >
                    <SearchIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {selectedUser ? (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                          {selectedUser.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{selectedUser.full_name}</span>
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor(selectedUser.role)}`}>{selectedUser.role}</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Search and select user..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true) }}
                        onClick={e => { e.stopPropagation(); setIsDropdownOpen(true) }}
                        className="flex-1 bg-transparent outline-none text-sm text-slate-600 placeholder:text-slate-400"
                      />
                    )}
                    {selectedUser && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setSelectedUser(null); setSearchQuery(''); setIsDropdownOpen(true) }}
                        className="text-slate-400 hover:text-slate-600 text-xs ml-auto"
                      >✕</button>
                    )}
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      {!selectedUser && (
                        <div className="p-2 border-b border-slate-50">
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm rounded-xl bg-slate-50 border border-slate-100 outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                      {filteredUsers.filter(u => u.user_id.toString() !== selectedFromUserId).length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">No valid users found</div>
                      ) : (
                        filteredUsers.filter(u => u.user_id.toString() !== selectedFromUserId).map(u => (
                          <button
                            key={u.user_id}
                            type="button"
                            onClick={() => { setSelectedUser(u); setIsDropdownOpen(false); setSearchQuery('') }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                              <p className="text-[11px] text-slate-400">{u.role}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${roleColor(u.role)}`}>{u.role}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Reason</Label>
              <Textarea
                placeholder="e.g. Delegating due to an emergency, vacation, or other commitments..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                rows={4}
                className="rounded-2xl bg-slate-50/60 border-slate-200 resize-none text-sm focus:ring-blue-400 focus:border-blue-400"
              />
            </div>
          </div>

          <div className="px-6 py-5 mt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-2xl h-11 font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !reason.trim() || (!schedule && (!selectedScheduleId || (currentUserRole === 'Admin' && !selectedFromUserId))) || (currentUserRole === 'Admin' && !selectedUser)}
              className="flex-1 rounded-2xl h-11 font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-md shadow-blue-200 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : <UserCheckIcon className="w-4 h-4 mr-2" />}
              {currentUserRole === 'Admin' ? 'Delegate Task' : 'Request Delegation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
