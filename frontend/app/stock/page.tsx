"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, PlusIcon, MoreHorizontalIcon, Loader2Icon, PackageIcon, CalendarIcon, DollarSignIcon } from 'lucide-react';

interface StockItem {
  stock_id: number;
  vaccine_id: number;
  supplier_id: number;
  quantity_purchased: number;
  purchase_price: number;
  expiry_date: string;
  vaccine?: { vaccine_name: string };
  supplier?: { supplier_name: string };
}

export default function StockPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vaccine_id: '',
    supplier_id: '',
    quantity_purchased: '',
    purchase_price: '',
    purchase_date: '',
    expiry_date: ''
  });

  const fetchStocks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/stock', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
      }
    } catch (error) {
      console.error("Failed to fetch stock", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        vaccine_id: parseInt(formData.vaccine_id),
        supplier_id: parseInt(formData.supplier_id),
        quantity_purchased: parseInt(formData.quantity_purchased),
        purchase_price: parseFloat(formData.purchase_price),
        purchase_date: formData.purchase_date,
        expiry_date: formData.expiry_date,
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
        setIsAddModalOpen(false);
        setFormData({ vaccine_id: '', supplier_id: '', quantity_purchased: '', purchase_price: '', purchase_date: '', expiry_date: '' });
        fetchStocks();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to add stock'}`);
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStocks = stocks.filter(stock =>
    stock.vaccine?.vaccine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.supplier?.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Vaccine Stock</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage physical inventory, batches, and expiry dates.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchStocks} variant="outline" className="hidden sm:flex border-dashed bg-background shadow-xs hover:bg-muted/50 rounded-xl">
            Refresh
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md transition-all hover:scale-[1.02] bg-indigo-600 hover:bg-indigo-700">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Stock Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-2xl">
              <form onSubmit={handleSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">Receive Stock Inventory</DialogTitle>
                  <DialogDescription>
                    Record a new delivery of vaccines into the main inventory warehouse.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vaccine_id" className="text-right text-sm font-medium text-muted-foreground">Vaccine ID</Label>
                    <Input id="vaccine_id" type="number" required value={formData.vaccine_id} onChange={e => setFormData({ ...formData, vaccine_id: e.target.value })} placeholder="e.g. 1" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="supplier_id" className="text-right text-sm font-medium text-muted-foreground">Vendor ID</Label>
                    <Input id="supplier_id" type="number" required value={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })} placeholder="e.g. 2" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity_purchased" className="text-right text-sm font-medium text-muted-foreground">Quantity</Label>
                    <Input id="quantity_purchased" type="number" required value={formData.quantity_purchased} onChange={e => setFormData({ ...formData, quantity_purchased: e.target.value })} placeholder="Doses" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="purchase_price" className="text-right text-sm font-medium text-muted-foreground">Total Price</Label>
                    <Input id="purchase_price" type="number" step="0.01" required value={formData.purchase_price} onChange={e => setFormData({ ...formData, purchase_price: e.target.value })} placeholder="$" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="purchase_date" className="text-right text-sm font-medium text-muted-foreground">Date Received</Label>
                    <Input id="purchase_date" type="date" required value={formData.purchase_date} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expiry_date" className="text-right text-sm font-medium text-muted-foreground">Expiry Date</Label>
                    <Input id="expiry_date" type="date" required value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl hover:bg-muted" disabled={isSaving}>Cancel</Button>
                  <Button type="submit" className="rounded-xl shadow-md bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm Entry
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border-muted/60 shadow-xs bg-background overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-muted/40 bg-muted/10 pb-4 pt-5 px-6">
          <div className="flex flex-col space-y-1.5">
            <CardTitle className="text-lg font-semibold">Inventory Log</CardTitle>
            <CardDescription className="text-xs">Real-time tracking of acquired vaccine batches.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72 group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-indigo-600" />
            <Input
              placeholder="Search vaccine or supplier..."
              className="pl-9 rounded-full bg-background border-muted/60 shadow-sm focus-visible:ring-indigo-600/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent border-b-muted/40">
                <TableHead className="w-[250px] font-medium text-muted-foreground/80 pl-6 h-12">Batch Info</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12 hidden md:table-cell">Source</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Quantity</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12 hidden md:table-cell">Expiry</TableHead>
                <TableHead className="text-right pr-6 h-12 w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50" />
                      <p>Loading inventory...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStocks.length > 0 ? (
                filteredStocks.map((stock) => (
                  <TableRow key={stock.stock_id} className="cursor-pointer hover:bg-muted/30 transition-colors border-b-muted/30 group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 border text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-sm">
                          <PackageIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{stock.vaccine?.vaccine_name || `Vaccine ID: ${stock.vaccine_id}`}</span>
                          <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <DollarSignIcon className="w-3 h-3 text-emerald-500" />
                            {stock.purchase_price} total
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium hidden md:table-cell">
                      {stock.supplier?.supplier_name || `Supplier ID: ${stock.supplier_id}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">
                        {stock.quantity_purchased} Doses
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-4 h-4 text-rose-400" />
                        {new Date(stock.expiry_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <PackageIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p>No inventory found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}