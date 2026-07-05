"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2Icon, AlertTriangleIcon, PackageIcon, PlusIcon, EditIcon, TrashIcon, MoreHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { canEdit } from '@/lib/permissions';

interface StockItem {
  stock_id: number;
  vaccine?: { vaccine_name: string };
  vaccine_id: number;
  supplier_name?: string;
  batch_number: string;
  quantity_remaining: number;
  quantity_purchased: number;
  purchase_price: number;
  purchase_date: string;
  expiry_date: string;
}

export default function StockTable() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStockId, setEditingStockId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    vaccine_id: '',
    supplier_name: '',
    batch_number: '',
    quantity_purchased: '',
    purchase_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: ''
  });
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const fetchStocks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/stock', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
      }
    } catch (error) {
      console.error("Failed to fetch stock", error);
      toast.error("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };

  const [role, setRole] = useState<string | null>(null);

  const fetchDependencies = async () => {
    try {
      const token = localStorage.getItem('token');
      const [vacRes] = await Promise.all([
        fetch('http://localhost:9999/api/vaccines', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (vacRes.ok) setVaccines(await vacRes.json());
    } catch (error) {
      console.error("Failed to fetch dependencies", error);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        vaccine_id: parseInt(formData.vaccine_id),
        supplier_name: formData.supplier_name,
        batch_number: formData.batch_number,
        quantity_purchased: parseInt(formData.quantity_purchased),
        purchase_price: parseFloat(formData.purchase_price),
        purchase_date: formData.purchase_date,
        expiry_date: formData.expiry_date
      };
      
      const res = await fetch('http://localhost:9999/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success("Stock registered successfully");
        setIsAddModalOpen(false);
        setFormData({
            vaccine_id: '',
            supplier_name: '',
            batch_number: '',
            quantity_purchased: '',
            purchase_price: '',
            purchase_date: new Date().toISOString().split('T')[0],
            expiry_date: ''
        });
        fetchStocks();
      } else {
        toast.error("Failed to register stock");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockId) return;
    try {
      const token = localStorage.getItem('token');
      const payload = {
        vaccine_id: parseInt(formData.vaccine_id),
        supplier_name: formData.supplier_name,
        batch_number: formData.batch_number,
        quantity_purchased: parseInt(formData.quantity_purchased),
        purchase_price: parseFloat(formData.purchase_price),
        purchase_date: formData.purchase_date,
        expiry_date: formData.expiry_date
      };
      
      const res = await fetch(`http://localhost:9999/api/stock/${editingStockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success("Stock updated successfully");
        setIsEditModalOpen(false);
        setEditingStockId(null);
        setFormData({
            vaccine_id: '',
            supplier_name: '',
            batch_number: '',
            quantity_purchased: '',
            purchase_price: '',
            purchase_date: new Date().toISOString().split('T')[0],
            expiry_date: ''
        });
        fetchStocks();
      } else {
        toast.error("Failed to update stock");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: number) => {
      if (!confirm("Are you sure you want to delete this stock entry?")) return;
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`http://localhost:9999/api/stock/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              toast.success("Stock deleted successfully");
              fetchStocks();
          } else {
              toast.error("Failed to delete stock");
          }
      } catch (error) {
          console.error(error);
      }
  };

  const openEditModal = (stock: StockItem) => {
      setFormData({
          vaccine_id: stock.vaccine_id.toString(),
          supplier_name: stock.supplier_name || '',
          batch_number: stock.batch_number,
          quantity_purchased: stock.quantity_purchased.toString(),
          purchase_price: stock.purchase_price.toString(),
          purchase_date: new Date(stock.purchase_date).toISOString().split('T')[0],
          expiry_date: new Date(stock.expiry_date).toISOString().split('T')[0]
      });
      setEditingStockId(stock.stock_id);
      setIsEditModalOpen(true);
  };

  useEffect(() => {
    setRole(localStorage.getItem('role'));
    fetchStocks();
    fetchDependencies();
  }, []);

  return (
    <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <PackageIcon className="w-6 h-6" />
             </div>
             <div className="flex flex-col space-y-0.5">
               <CardTitle className="text-base font-extrabold text-slate-800">Vaccine Inventory</CardTitle>
               <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">Real-time tracking of vaccine doses and shelf life.</CardDescription>
             </div>
          </div>
        </div>
        {canEdit('Stock', role) && (
        <>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg shadow-sm font-semibold px-4 h-9 text-xs border-none">
                <PlusIcon className="w-4 h-4 mr-1.5" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
              <form onSubmit={handleAddStock}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-extrabold text-slate-800">Register New Stock</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">Enter the details for the new vaccine batch.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vaccine</Label>
                      <Select value={formData.vaccine_id} onValueChange={(v) => setFormData({...formData, vaccine_id: v})}>
                        <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-[#2FA4D7] transition-all">
                          <SelectValue placeholder="Select vaccine" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                          {vaccines.map(v => (
                            <SelectItem key={v.vaccine_id} value={v.vaccine_id.toString()} className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">
                              {v.vaccine_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier Name</Label>
                      <Input required placeholder="e.g. Mumin Meds" className="rounded-lg bg-muted/20" value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input required placeholder="e.g. BATCH-2026-X" className="rounded-lg bg-muted/20" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity (Doses)</Label>
                      <Input required type="number" placeholder="e.g. 1000" className="rounded-lg bg-muted/20" value={formData.quantity_purchased} onChange={e => setFormData({...formData, quantity_purchased: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Price ($)</Label>
                      <Input required type="number" step="0.01" placeholder="e.g. 500" className="rounded-lg bg-muted/20" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <Input required type="date" className="rounded-lg bg-muted/20" value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input required type="date" className="rounded-lg bg-muted/20" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button type="submit" className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-md w-full font-semibold text-sm h-11">Save Stock Batch</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[500px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
              <form onSubmit={handleEditSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-extrabold text-slate-800">Edit Stock Record</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">Update the details for the vaccine batch.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vaccine</Label>
                      <Select value={formData.vaccine_id} onValueChange={(v) => setFormData({...formData, vaccine_id: v})}>
                        <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-[#2FA4D7] transition-all">
                          <SelectValue placeholder="Select vaccine" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                          {vaccines.map(v => (
                            <SelectItem key={v.vaccine_id} value={v.vaccine_id.toString()} className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">
                              {v.vaccine_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier Name</Label>
                      <Input required placeholder="e.g. Mumin Meds" className="rounded-lg bg-muted/20" value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input required placeholder="e.g. BATCH-2026-X" className="rounded-lg bg-muted/20" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity (Doses)</Label>
                      <Input required type="number" placeholder="e.g. 1000" className="rounded-lg bg-muted/20" value={formData.quantity_purchased} onChange={e => setFormData({...formData, quantity_purchased: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Price ($)</Label>
                      <Input required type="number" step="0.01" placeholder="e.g. 500" className="rounded-lg bg-muted/20" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <Input required type="date" className="rounded-lg bg-muted/20" value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input required type="date" className="rounded-lg bg-muted/20" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button type="submit" className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-md w-full font-semibold text-sm h-11">Update Stock Batch</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="hover:bg-transparent border-b border-gray-50">
              <TableHead className="w-[200px] font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-11">Vaccine & Batch</TableHead>
              <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Supplier</TableHead>
              <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Remaining Stock</TableHead>
              <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Expiry Date</TableHead>
              <TableHead className="text-right h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-right pr-6 h-11 w-[80px] font-bold text-[10px] text-slate-400 uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                </TableCell>
              </TableRow>
            ) : stocks.length > 0 ? (
              stocks.map((stock) => {
                const isLow = stock.quantity_remaining < 10;
                const isExpired = new Date(stock.expiry_date) < new Date();

                return (
                  <TableRow key={stock.stock_id} className="hover:bg-slate-50 transition-colors border-b border-gray-50 group cursor-pointer">
                    <TableCell className="pl-6 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-xs">{stock.vaccine?.vaccine_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Batch: {stock.batch_number || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-medium py-3">{stock.supplier_name || 'N/A'}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${isLow ? 'text-orange-500' : 'text-emerald-600'}`}>
                          {stock.quantity_remaining}
                        </span>
                        <span className="text-[10px] text-slate-400">/ {stock.quantity_purchased} doses</span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-xs py-3 ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-500 font-medium'}`}>
                      {new Date(stock.expiry_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {isExpired ? (
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 border-rose-200 text-rose-600 bg-rose-50 text-[10px] font-bold uppercase tracking-wider">Expired</Badge>
                      ) : isLow ? (
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 bg-orange-50 text-orange-600 border-orange-200 text-[10px] font-bold uppercase tracking-wider">
                          <AlertTriangleIcon className="h-3 w-3 mr-1" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] font-bold uppercase tracking-wider">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-3">
                        {canEdit('Stock', role) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50 rounded-lg transition-opacity">
                                        <MoreHorizontalIcon className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 bg-white border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-xl">
                                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-slate-100" />
                                    <DropdownMenuItem onClick={() => openEditModal(stock)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                        <EditIcon className="mr-2 h-4 w-4" /> Edit Stock
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(stock.stock_id)} className="text-sm font-medium text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 rounded-lg m-1">
                                        <TrashIcon className="mr-2 h-4 w-4" /> Delete Stock
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No stock records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}