"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { canCreate, canDelete, canEdit } from "@/lib/permissions"
import {
  AlertTriangleIcon,
  CalendarIcon,
  Loader2Icon,
  MapPinIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  StoreIcon,
  TrashIcon,
  PencilIcon,
  WarehouseIcon,
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

interface StockItem {
  stock_id: number
  vaccine_id: number
  store_id?: number | null
  batch_number?: string | null
  quantity_remaining: number
  quantity_purchased: number
  expiry_date: string
  vaccine?: { vaccine_name: string }
  store?: { store_id: number; store_name: string; store_address?: string } | null
}

export default function VaccineStoresPage() {
  const [activeTab, setActiveTab] = useState("store")
  const [stores, setStores] = useState<VaccineStore[]>([])
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stockLoading, setStockLoading] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [stockSearch, setStockSearch] = useState("")
  const [storeFilter, setStoreFilter] = useState<string>("all")
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

  const fetchStocks = async () => {
    setStockLoading(true)
    try {
      const res = await fetch(`${API}/api/stock`, { headers: headers() })
      if (!res.ok) throw new Error("Failed to load store stock")
      const data = await res.json()
      setStocks(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load store stock")
    } finally {
      setStockLoading(false)
    }
  }

  useEffect(() => {
    setRole(localStorage.getItem("role"))
    fetchStores()
  }, [])

  useEffect(() => {
    if (activeTab === "store-stock") {
      fetchStocks()
    }
  }, [activeTab])

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return stores
    return stores.filter(
      (s) =>
        s.store_name.toLowerCase().includes(q) ||
        s.store_address.toLowerCase().includes(q)
    )
  }, [stores, search])

  const filteredStocks = useMemo(() => {
    let list = stocks.filter((s) => s.store_id || s.store?.store_id)
    if (storeFilter !== "all") {
      const id = parseInt(storeFilter, 10)
      list = list.filter((s) => (s.store_id || s.store?.store_id) === id)
    }
    const q = stockSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => {
      const vaccine = s.vaccine?.vaccine_name?.toLowerCase() || ""
      const batch = s.batch_number?.toLowerCase() || ""
      const storeName = s.store?.store_name?.toLowerCase() || ""
      return vaccine.includes(q) || batch.includes(q) || storeName.includes(q)
    })
  }, [stocks, stockSearch, storeFilter])

  const stockByStore = useMemo(() => {
    const map = new Map<number, { store: VaccineStore | { store_id: number; store_name: string; store_address?: string }; items: StockItem[]; totalDoses: number }>()
    for (const item of filteredStocks) {
      const sid = item.store_id || item.store?.store_id
      if (!sid) continue
      const storeMeta =
        stores.find((s) => s.store_id === sid) ||
        item.store ||
        { store_id: sid, store_name: `Store #${sid}`, store_address: "" }
      if (!map.has(sid)) {
        map.set(sid, { store: storeMeta, items: [], totalDoses: 0 })
      }
      const entry = map.get(sid)!
      entry.items.push(item)
      entry.totalDoses += Number(item.quantity_remaining) || 0
    }
    return Array.from(map.values()).sort((a, b) =>
      a.store.store_name.localeCompare(b.store.store_name)
    )
  }, [filteredStocks, stores])

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
      title: "Delete store?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete",
    })
    if (!result.isConfirmed) return
    try {
      const res = await fetch(`${API}/api/vaccine-stores/${id}`, {
        method: "DELETE",
        headers: headers(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete store")
      }
      toast.success("Store deleted")
      fetchStores()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete store")
    }
  }

  const stockStatus = (stock: StockItem) => {
    const remaining = Number(stock.quantity_remaining) || 0
    const isExpired = new Date(stock.expiry_date) < new Date()
    const isOut = remaining <= 0
    const isLow = remaining > 0 && remaining < 10
    if (isExpired) return { label: "Expired", className: "border-rose-200 text-rose-600 bg-rose-50" }
    if (isOut) return { label: "Out of Stock", className: "bg-slate-100 text-slate-600 border-slate-200" }
    if (isLow) return { label: "Low Stock", className: "bg-orange-50 text-orange-600 border-orange-200", warn: true }
    return { label: "Normal", className: "bg-emerald-50 text-emerald-600 border-emerald-200" }
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      <Card className="rounded-[24px] border border-slate-100/80 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] bg-white overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full flex-col gap-0">
          {/* Header with tabs */}
          <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
              <TabsList className="h-11 shrink-0 rounded-2xl bg-slate-100 p-1 gap-1">
                <TabsTrigger
                  value="store"
                  className="h-9 rounded-xl px-4 text-[13px] font-bold data-active:bg-white data-active:text-blue-600 data-active:shadow-sm"
                >
                  <StoreIcon className="w-4 h-4" />
                  Store
                </TabsTrigger>
                <TabsTrigger
                  value="store-stock"
                  className="h-9 rounded-xl px-4 text-[13px] font-bold data-active:bg-white data-active:text-blue-600 data-active:shadow-sm"
                >
                  <PackageIcon className="w-4 h-4" />
                  Store Stock
                </TabsTrigger>
              </TabsList>
              <div className="hidden sm:block w-px h-10 bg-slate-200 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-[18px] font-extrabold text-slate-900 tracking-tight">
                  {activeTab === "store" ? "Vaccine Stores" : "Store Stock"}
                </h1>
                <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                  {activeTab === "store"
                    ? "Register store locations where vaccines are kept."
                    : "See what vaccine stock is inside each store."}
                </p>
              </div>
            </div>

            {activeTab === "store" ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
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
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="all">All stores</option>
                  {stores.map((s) => (
                    <option key={s.store_id} value={s.store_id.toString()}>
                      {s.store_name}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1 xl:w-[280px]">
                  <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search vaccine, batch, store..."
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pl-10 text-sm font-medium placeholder:text-slate-400 focus-visible:ring-blue-100 focus-visible:border-blue-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tab: Store */}
          <TabsContent value="store" className="m-0 w-full">
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
          </TabsContent>

          {/* Tab: Store Stock */}
          <TabsContent value="store-stock" className="m-0 w-full">
            <CardContent className="p-0">
              {stockLoading ? (
                <div className="p-16 flex flex-col items-center gap-3 text-slate-400">
                  <Loader2Icon className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-sm">Loading store stock...</span>
                </div>
              ) : stockByStore.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-sm">
                  No stock assigned to stores yet. Register stock and select a store.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stockByStore.map(({ store, items, totalDoses }) => (
                    <div key={store.store_id} className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <WarehouseIcon className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 text-[15px] truncate">{store.store_name}</p>
                            <p className="text-[12px] text-slate-500 font-medium mt-0.5 inline-flex items-center gap-1">
                              <MapPinIcon className="w-3.5 h-3.5 text-blue-500" />
                              {"store_address" in store ? store.store_address || "—" : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full px-3 py-1 border-blue-200 text-blue-700 bg-blue-50 text-[11px] font-bold">
                            {items.length} batch{items.length !== 1 ? "es" : ""}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1 border-emerald-200 text-emerald-700 bg-emerald-50 text-[11px] font-bold">
                            {totalDoses} doses left
                          </Badge>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full min-w-[640px] text-left">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Vaccine & Batch</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Remaining</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Expiry</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((stock) => {
                              const status = stockStatus(stock)
                              return (
                                <tr key={stock.stock_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                  <td className="px-4 py-3">
                                    <p className="font-bold text-slate-800 text-xs">{stock.vaccine?.vaccine_name || "Vaccine"}</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Batch: {stock.batch_number || "N/A"}</p>
                                  </td>
                                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                    {stock.quantity_remaining}
                                    <span className="text-slate-400 font-medium"> / {stock.quantity_purchased}</span>
                                  </td>
                                  <td className="px-4 py-3 text-xs font-medium text-slate-600">
                                    {new Date(stock.expiry_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                                      {"warn" in status && status.warn ? <AlertTriangleIcon className="h-3 w-3 mr-1 inline" /> : null}
                                      {status.label}
                                    </Badge>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
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
