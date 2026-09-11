"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { canCreate, canDelete, canEdit } from "@/lib/permissions"
import {
  CalendarIcon,
  Loader2Icon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  StoreIcon,
  TrashIcon,
  PencilIcon,
} from "lucide-react"
import { toast } from "sonner"
import Swal from "sweetalert2"

const API = "http://localhost:9999"

interface VaccineStore {
  store_id: number
  store_name: string
  store_address: string
  created_at: string
}

export default function VaccineStoresPage() {
  const [stores, setStores] = useState<VaccineStore[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<VaccineStore | null>(null)
  const [form, setForm] = useState({ store_name: "", store_address: "" })

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  })

  const fetchStores = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/vaccine-stores`, { headers: headers() })
      if (!res.ok) throw new Error("Failed to load stores")
      const data = await res.json()
      setStores(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load stores")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setRole(localStorage.getItem("role"))
    fetchStores()
  }, [])

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return stores
    return stores.filter(
      (s) =>
        s.store_name.toLowerCase().includes(q) ||
        s.store_address.toLowerCase().includes(q)
    )
  }, [stores, search])

  const resetForm = () => setForm({ store_name: "", store_address: "" })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.store_name.trim() || !form.store_address.trim()) {
      toast.warning("Store name and address are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/vaccine-stores`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create store")
      }
      toast.success("Store created")
      setIsAddOpen(false)
      resetForm()
      fetchStores()
    } catch (e: any) {
      toast.error(e.message || "Failed to create store")
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (store: VaccineStore) => {
    setEditing(store)
    setForm({ store_name: store.store_name, store_address: store.store_address })
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!form.store_name.trim() || !form.store_address.trim()) {
      toast.warning("Store name and address are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/vaccine-stores/${editing.store_id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update store")
      }
      toast.success("Store updated")
      setIsEditOpen(false)
      setEditing(null)
      resetForm()
      fetchStores()
    } catch (e: any) {
      toast.error(e.message || "Failed to update store")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;padding:8px 4px 4px;">
          <div style="position:relative;width:72px;height:72px;margin-bottom:18px;display:flex;align-items:center;justify-content:center;">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2z" fill="#EF4444"/>
              <path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8z" fill="#EF4444"/>
              <path d="M10 11v7M14 11v7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            <span style="position:absolute;top:2px;right:6px;width:5px;height:5px;border-radius:999px;background:#F87171;"></span>
            <span style="position:absolute;top:10px;right:0;width:4px;height:4px;border-radius:999px;background:#FCA5A5;"></span>
            <span style="position:absolute;top:0;left:10px;width:4px;height:4px;border-radius:999px;background:#F87171;"></span>
          </div>
          <h2 style="margin:0;font-size:1.35rem;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">Confirm Store Deletion?</h2>
          <p style="margin:10px 0 0;font-size:0.9rem;line-height:1.45;color:#64748b;max-width:280px;">
            Are you sure you want to delete this vaccine store? This action cannot be undone.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: false,
      heightAuto: false,
      customClass: {
        popup: "!rounded-[28px] !shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)] !px-6 !pt-6 !pb-5 !max-w-[380px]",
        htmlContainer: "!m-0 !p-0",
        actions: "!mt-6 !gap-3 !w-full !flex !justify-center",
        confirmButton:
          "!rounded-full !bg-red-500 hover:!bg-red-600 !text-white !font-bold !text-sm !px-8 !py-2.5 !m-0 !shadow-none !border-0",
        cancelButton:
          "!rounded-full !bg-white !text-red-500 !font-bold !text-sm !px-8 !py-2.5 !m-0 !border !border-red-400 hover:!bg-red-50 !shadow-none",
      },
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`${API}/api/vaccine-stores/${id}`, {
        method: "DELETE",
        headers: headers(),
      })
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete store")
      }
      toast.success("Store deleted")
      fetchStores()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete store")
    }
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      <Card className="rounded-[24px] border border-slate-100/80 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] bg-white overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/25 shrink-0">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div className="hidden sm:block w-px h-10 bg-slate-200 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[18px] font-extrabold text-slate-900 tracking-tight">Vaccine Stores</h1>
              <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                Register store locations where vaccines are kept.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-[320px]">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search store by name or address..."
                className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pl-10 text-sm font-medium placeholder:text-slate-400 focus-visible:ring-blue-100 focus-visible:border-blue-400"
              />
            </div>

            {canCreate("VaccineStores", role) && (
              <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetForm() }}>
                <DialogTrigger asChild>
                  <Button className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 shadow-sm shadow-blue-600/20 shrink-0">
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    Add Store
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:!max-w-[460px] !rounded-[28px] border-0 ring-0 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)] bg-white p-7 sm:p-8 gap-0 overflow-hidden">
                  <form onSubmit={handleCreate} className="space-y-6">
                    <DialogHeader className="pr-8">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
                          <StoreIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col text-left pt-0.5">
                          <DialogTitle className="text-[20px] font-extrabold text-slate-900 tracking-tight leading-tight">
                            Add Vaccine Store
                          </DialogTitle>
                          <DialogDescription className="text-[13px] text-slate-500 font-medium mt-1.5 leading-snug">
                            Enter store name and address.
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[13px] font-bold text-slate-800">Store Name</Label>
                        <Input
                          required
                          autoFocus
                          value={form.store_name}
                          onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                          placeholder="e.g. Main store"
                          className="h-12 rounded-xl border-slate-200 bg-white px-4 text-[14px] font-medium placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[13px] font-bold text-slate-800">Store Address</Label>
                        <Input
                          required
                          value={form.store_address}
                          onChange={(e) => setForm({ ...form, store_address: e.target.value })}
                          placeholder="e.g. KM4"
                          className="h-12 rounded-xl border-slate-200 bg-white px-4 text-[14px] font-medium placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-xl border-slate-300 bg-white px-5 text-[13px] font-bold text-slate-800 hover:bg-slate-50"
                        onClick={() => setIsAddOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 text-[13px] font-bold shadow-sm shadow-blue-600/25"
                      >
                        {saving ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save Store
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 flex flex-col items-center gap-3 text-slate-400">
              <Loader2Icon className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm">Loading stores...</span>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm">
              {stores.length === 0 ? (
                <>
                  No vaccine stores yet. Click <span className="font-bold text-slate-600">Add Store</span> to register one.
                </>
              ) : (
                <>No stores match your search.</>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Store Name</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Store Address</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Created</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map((store) => (
                    <tr key={store.store_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <StoreIcon className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 text-[14px] truncate">{store.store_name}</p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Vaccination storage location</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <MapPinIcon className="w-4 h-4 text-blue-500" />
                          {store.store_address}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          {new Date(store.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit("VaccineStores", role) && (
                            <button
                              type="button"
                              onClick={() => openEdit(store)}
                              className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete("VaccineStores", role) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(store.store_id)}
                              className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditing(null); resetForm() } }}>
        <DialogContent className="sm:!max-w-[460px] !rounded-[28px] border-0 ring-0 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)] bg-white p-7 sm:p-8 gap-0 overflow-hidden">
          <form onSubmit={handleUpdate} className="space-y-6">
            <DialogHeader className="pr-8">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
                  <StoreIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left pt-0.5">
                  <DialogTitle className="text-[20px] font-extrabold text-slate-900 tracking-tight leading-tight">
                    Edit Vaccine Store
                  </DialogTitle>
                  <DialogDescription className="text-[13px] text-slate-500 font-medium mt-1.5 leading-snug">
                    Update store name and address.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-800">Store Name</Label>
                <Input
                  required
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  placeholder="e.g. Main store"
                  className="h-12 rounded-xl border-slate-200 bg-white px-4 text-[14px] font-medium placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-800">Store Address</Label>
                <Input
                  required
                  value={form.store_address}
                  onChange={(e) => setForm({ ...form, store_address: e.target.value })}
                  placeholder="e.g. KM4"
                  className="h-12 rounded-xl border-slate-200 bg-white px-4 text-[14px] font-medium placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-300 bg-white px-5 text-[13px] font-bold text-slate-800 hover:bg-slate-50"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 text-[13px] font-bold shadow-sm shadow-blue-600/25"
              >
                {saving ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Store
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
