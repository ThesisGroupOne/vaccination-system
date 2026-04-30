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
import { Loader2Icon, AlertTriangleIcon, PackageIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

interface StockItem {
  stock_id: number;
  vaccine?: { vaccine_name: string };
  supplier_name?: string;
  batch_number: string;
  quantity_remaining: number;
  quantity_purchased: number;
  expiry_date: string;
}

export default function StockTable() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
        fetchStocks();
      } else {
        toast.error("Failed to register stock");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  useEffect(() => {
    fetchStocks();
    fetchDependencies();
  }, []);

  return (
    <Card className="rounded-2xl border-muted/60 shadow-xs bg-background overflow-hidden font-inter">
      <CardHeader className="border-b border-muted/40 bg-muted/10 pb-4 pt-5 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#2FA4D7]/10 text-[#2FA4D7] flex items-center justify-center">
              <PackageIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Vaccine Inventory</CardTitle>
              <CardDescription className="text-xs">Real-time tracking of vaccine doses and shelf life.</CardDescription>
            </div>
          </div>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white rounded-lg shadow-md">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-2xl">
              <form onSubmit={handleAddStock}>
                <DialogHeader className="mb-4">
                  <DialogTitle>Register New Stock</DialogTitle>
                  <DialogDescription>Enter the details for the new vaccine batch.</DialogDescription>
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
                  <Button type="submit" className="bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white rounded-xl shadow-md w-full">Save Stock Batch</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-muted/40">
              <TableHead className="pl-6">Vaccine & Batch</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Remaining Stock</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-right pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                </TableCell>
              </TableRow>
            ) : stocks.length > 0 ? (
              stocks.map((stock) => {
                const isLow = stock.quantity_remaining < 10;
                const isExpired = new Date(stock.expiry_date) < new Date();

                return (
                  <TableRow key={stock.stock_id} className="hover:bg-muted/30 transition-colors border-b-muted/30">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{stock.vaccine?.vaccine_name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Batch: {stock.batch_number || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{stock.supplier_name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isLow ? 'text-orange-500' : 'text-foreground'}`}>
                          {stock.quantity_remaining}
                        </span>
                        <span className="text-[10px] text-muted-foreground text-xs">/ {stock.quantity_purchased} doses</span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-sm ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {new Date(stock.expiry_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {isExpired ? (
                        <Badge variant="destructive" className="rounded-md">Expired</Badge>
                      ) : isLow ? (
                        <Badge variant="outline" className="rounded-md bg-orange-500/10 text-orange-600 border-orange-500/20">
                          <AlertTriangleIcon className="h-3 w-3 mr-1" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-md bg-green-500/10 text-green-600 border-green-500/20">Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
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