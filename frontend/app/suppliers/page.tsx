"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchIcon, PlusIcon, MoreHorizontalIcon, Loader2Icon, TruckIcon, MapPinIcon, PhoneIcon } from 'lucide-react';

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  phone: string;
  address: string;
}

export default function SuppliersPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    supplier_name: '',
    phone: '',
    address: ''
  });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/suppliers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData };

      const res = await fetch('http://localhost:9999/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ supplier_name: '', phone: '', address: '' });
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to create supplier'}`);
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Suppliers</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage external vendors and vaccine suppliers.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchSuppliers} variant="outline" className="hidden sm:flex border-dashed bg-background shadow-xs hover:bg-muted/50 rounded-xl">
            Refresh
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md transition-all hover:scale-[1.02]">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-2xl border-none shadow-2xl">
              <form onSubmit={handleSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">Register Supplier</DialogTitle>
                  <DialogDescription>
                    Enter the details of a new vendor who supplies vaccines and stock.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="supplier_name" className="text-right text-sm font-medium text-muted-foreground">Supplier Name</Label>
                    <Input id="supplier_name" required value={formData.supplier_name} onChange={e => setFormData({ ...formData, supplier_name: e.target.value })} placeholder="e.g. MedVet Corp" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right text-sm font-medium text-muted-foreground">Phone</Label>
                    <Input id="phone" value={formData.phone} required onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+252..." className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="address" className="text-right text-sm font-medium text-muted-foreground">Address</Label>
                    <Input id="address" required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Main St, Mogadishu" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl hover:bg-muted" disabled={isSaving}>Cancel</Button>
                  <Button type="submit" className="rounded-xl shadow-md" disabled={isSaving}>
                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    Save Vendor
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
            <CardTitle className="text-lg font-semibold">Vendor Directory</CardTitle>
            <CardDescription className="text-xs">A comprehensive list of trusted suppliers and partners.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72 group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search by name, phone or address..."
              className="pl-9 rounded-full bg-background border-muted/60 shadow-sm focus-visible:ring-primary/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent border-b-muted/40">
                <TableHead className="w-[300px] font-medium text-muted-foreground/80 pl-6 h-12">Supplier</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Phone Contact</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12 hidden md:table-cell">Area / Address</TableHead>
                <TableHead className="text-right pr-6 h-12 w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50" />
                      <p>Loading suppliers...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.supplier_id} className="cursor-pointer hover:bg-muted/30 transition-colors border-b-muted/30 group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900 border text-orange-600 dark:text-orange-300 flex items-center justify-center shadow-sm">
                          <TruckIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{supplier.supplier_name}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">ID: VEN-{supplier.supplier_id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                        {supplier.phone || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-4 h-4" />
                        {supplier.address || 'N/A'}
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
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <TruckIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p>No suppliers found matching your criteria.</p>
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