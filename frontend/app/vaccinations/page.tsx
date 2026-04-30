"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, PlusIcon, MoreHorizontalIcon, Loader2Icon, ActivityIcon, CalendarCheckIcon, UserCircleIcon } from 'lucide-react';

interface Vaccination {
  vaccination_id: number;
  animal_id: number;
  vaccine_id: number;
  administered_by: number;
  date_administered: string;
  next_due_date: string;
  dosage_ml: number;
  animal?: { nickname?: string };
  vaccine?: { vaccine_name: string };
  user?: { full_name: string };
}

export default function VaccinationsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    animal_id: '',
    vaccine_id: '',
    administered_by: '',
    stock_id: '',
    dosage_ml: '',
    date_administered: ''
  });

  const fetchVaccinations = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/vaccinations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setVaccinations(data);
      }
    } catch (error) {
      console.error("Failed to fetch vaccinations", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccinations();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        animal_id: parseInt(formData.animal_id),
        vaccine_id: parseInt(formData.vaccine_id),
        administered_by: parseInt(formData.administered_by),
        stock_id: parseInt(formData.stock_id),
        dosage_ml: parseFloat(formData.dosage_ml),
        date_administered: formData.date_administered,
      };

      const res = await fetch('http://localhost:9999/api/vaccinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ animal_id: '', vaccine_id: '', administered_by: '', stock_id: '', dosage_ml: '', date_administered: '' });
        fetchVaccinations();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to log vaccination'}`);
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredVaccinations = vaccinations.filter(v =>
    v.animal?.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vaccine?.vaccine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Vaccination Records</h2>
          <p className="text-muted-foreground text-sm mt-1">Log and track all immunization events across the farm.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchVaccinations} variant="outline" className="hidden sm:flex border-dashed bg-background shadow-xs hover:bg-muted/50 rounded-xl">
            Refresh
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md transition-all hover:scale-[1.02] bg-fuchsia-600 hover:bg-fuchsia-700">
                <PlusIcon className="w-4 h-4 mr-2" />
                Log Vaccination
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-2xl">
              <form onSubmit={handleSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">Record Immunization Event</DialogTitle>
                  <DialogDescription>
                    Log a new vaccination, assigning it to a specific animal and stock batch.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="animal_id" className="text-right text-sm font-medium text-muted-foreground">Animal ID</Label>
                    <Input id="animal_id" type="number" required value={formData.animal_id} onChange={e => setFormData({ ...formData, animal_id: e.target.value })} placeholder="e.g. 101" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vaccine_id" className="text-right text-sm font-medium text-muted-foreground">Vaccine ID</Label>
                    <Input id="vaccine_id" type="number" required value={formData.vaccine_id} onChange={e => setFormData({ ...formData, vaccine_id: e.target.value })} placeholder="e.g. 5" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="stock_id" className="text-right text-sm font-medium text-muted-foreground">Stock Batch ID</Label>
                    <Input id="stock_id" type="number" required value={formData.stock_id} onChange={e => setFormData({ ...formData, stock_id: e.target.value })} placeholder="e.g. 25" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="administered_by" className="text-right text-sm font-medium text-muted-foreground">Administered By (User ID)</Label>
                    <Input id="administered_by" type="number" required value={formData.administered_by} onChange={e => setFormData({ ...formData, administered_by: e.target.value })} placeholder="e.g. 2" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dosage_ml" className="text-right text-sm font-medium text-muted-foreground">Dosage (ml)</Label>
                    <Input id="dosage_ml" type="number" step="0.1" required value={formData.dosage_ml} onChange={e => setFormData({ ...formData, dosage_ml: e.target.value })} placeholder="e.g. 2.5" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date_administered" className="text-right text-sm font-medium text-muted-foreground">Date</Label>
                    <Input id="date_administered" type="date" required value={formData.date_administered} onChange={e => setFormData({ ...formData, date_administered: e.target.value })} className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl hover:bg-muted" disabled={isSaving}>Cancel</Button>
                  <Button type="submit" className="rounded-xl shadow-md bg-fuchsia-600 hover:bg-fuchsia-700" disabled={isSaving}>
                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm Log
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
            <CardTitle className="text-lg font-semibold">Immunization History</CardTitle>
            <CardDescription className="text-xs">Complete audit trail of all vaccines administered.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72 group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-fuchsia-600" />
            <Input
              placeholder="Search assigned animal, vaccine..."
              className="pl-9 rounded-full bg-background border-muted/60 shadow-sm focus-visible:ring-fuchsia-600/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent border-b-muted/40">
                <TableHead className="w-[280px] font-medium text-muted-foreground/80 pl-6 h-12">Event Details</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Target Animal</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12 hidden md:table-cell">Given By</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12 hidden md:table-cell">Next Due</TableHead>
                <TableHead className="text-right pr-6 h-12 w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50" />
                      <p>Loading records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredVaccinations.length > 0 ? (
                filteredVaccinations.map((v) => (
                  <TableRow key={v.vaccination_id} className="cursor-pointer hover:bg-muted/30 transition-colors border-b-muted/30 group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-900 border text-fuchsia-600 dark:text-fuchsia-300 flex items-center justify-center shadow-sm">
                          <ActivityIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{v.vaccine?.vaccine_name || `Vaccine ID: ${v.vaccine_id}`}</span>
                          <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <CalendarCheckIcon className="w-3 h-3 text-emerald-500" />
                            {new Date(v.date_administered).toLocaleDateString()}
                            <span className="ml-2 font-medium text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">{v.dosage_ml} ml</span>
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      <Badge variant="outline" className="border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50">
                        {v.animal?.nickname || `Animal ID: ${v.animal_id}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <UserCircleIcon className="w-3.5 h-3.5" />
                          {v.user?.full_name || `User ID: ${v.administered_by}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                        {new Date(v.next_due_date).toLocaleDateString()}
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
                      <ActivityIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p>No vaccination records found.</p>
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