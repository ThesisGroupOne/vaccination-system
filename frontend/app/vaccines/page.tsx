"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, PlusIcon, MoreHorizontalIcon, Loader2Icon, SyringeIcon, ClockIcon } from 'lucide-react';

interface Vaccine {
  vaccine_id: number;
  vaccine_name: string;
  description?: string;
  validity_period_days: number;
  recommended_interval_days: number;
}

export default function VaccinesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vaccine_name: '',
    description: '',
    validity_period_days: '',
    recommended_interval_days: ''
  });

  const fetchVaccines = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/vaccines', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setVaccines(data);
      }
    } catch (error) {
      console.error("Failed to fetch vaccines", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccines();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        vaccine_name: formData.vaccine_name,
        description: formData.description,
        validity_period_days: parseInt(formData.validity_period_days),
        recommended_interval_days: parseInt(formData.recommended_interval_days)
      };

      const res = await fetch('http://localhost:9999/api/vaccines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ vaccine_name: '', description: '', validity_period_days: '', recommended_interval_days: '' });
        fetchVaccines();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to create vaccine'}`);
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredVaccines = vaccines.filter(vaccine =>
    vaccine.vaccine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vaccine.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Vaccines</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage vaccine types, descriptions, and interval schedules.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchVaccines} variant="outline" className="hidden sm:flex border-dashed bg-background shadow-xs hover:bg-muted/50 rounded-xl">
            Refresh
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md transition-all hover:scale-[1.02] bg-teal-600 hover:bg-teal-700">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Vaccine
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-2xl">
              <form onSubmit={handleSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">Register Vaccine Formula</DialogTitle>
                  <DialogDescription>
                    Enter the details of a new vaccine, including its validity and dosage intervals.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vaccine_name" className="text-right text-sm font-medium text-muted-foreground">Name</Label>
                    <Input id="vaccine_name" required value={formData.vaccine_name} onChange={e => setFormData({ ...formData, vaccine_name: e.target.value })} placeholder="e.g. FMD Vaccine" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right text-sm font-medium text-muted-foreground">Description</Label>
                    <Input id="description" value={formData.description} required onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Protects against..." className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="validity_period_days" className="text-right text-sm font-medium text-muted-foreground">Validity (Days)</Label>
                    <Input id="validity_period_days" type="number" required value={formData.validity_period_days} onChange={e => setFormData({ ...formData, validity_period_days: e.target.value })} placeholder="365" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="interval" className="text-right text-sm font-medium text-muted-foreground">Next Dose (Days)</Label>
                    <Input id="interval" type="number" required value={formData.recommended_interval_days} onChange={e => setFormData({ ...formData, recommended_interval_days: e.target.value })} placeholder="180" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl hover:bg-muted" disabled={isSaving}>Cancel</Button>
                  <Button type="submit" className="rounded-xl shadow-md bg-teal-600 hover:bg-teal-700" disabled={isSaving}>
                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    Save Vaccine
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
            <CardTitle className="text-lg font-semibold">Vaccine Master List</CardTitle>
            <CardDescription className="text-xs">Database of all approved vaccine formulas.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72 group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-teal-600" />
            <Input
              placeholder="Search formulas..."
              className="pl-9 rounded-full bg-background border-muted/60 shadow-sm focus-visible:ring-teal-600/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent border-b-muted/40">
                <TableHead className="w-[300px] font-medium text-muted-foreground/80 pl-6 h-12">Vaccine Formula</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12 hidden md:table-cell">Usage / Description</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Validity & Protocol</TableHead>
                <TableHead className="text-right pr-6 h-12 w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50" />
                      <p>Loading formulas...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredVaccines.length > 0 ? (
                filteredVaccines.map((vaccine) => (
                  <TableRow key={vaccine.vaccine_id} className="cursor-pointer hover:bg-muted/30 transition-colors border-b-muted/30 group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900 border text-teal-600 dark:text-teal-300 flex items-center justify-center shadow-sm">
                          <SyringeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{vaccine.vaccine_name}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">VAC-{vaccine.vaccine_id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-xs truncate">
                      {vaccine.description || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#2FA4D7]/50 transition-all">
                        <Badge variant="outline" className="w-fit text-xs border-blue-200 text-blue-700 bg-blue-50">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          Valid: {vaccine.validity_period_days} Days
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-1">
                          Repeat every: {vaccine.recommended_interval_days} Days
                        </span>
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
                      <SyringeIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p>No vaccines found matching your criteria.</p>
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