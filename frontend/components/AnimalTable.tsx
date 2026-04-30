"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchIcon, PlusIcon, MoreHorizontalIcon, Loader2Icon, PrinterIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Farm {
  farm_id: number;
  farm_name: string;
}

interface Animal {
  animal_id: number;
  nickname?: string;
  animal_type: string;
  age: number;
  biological_type: string;
  is_pregnant: boolean;
  status: string;
  farm_id: number;
  farm?: { farm_name: string };
  vaccinations?: unknown[];
}

export default function AnimalTable() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nickname: '',
    animal_type: '',
    age: '',
    biological_type: '',
    is_pregnant: false,
    status: 'Active',
    farm_id: ''
  });

  const [farms, setFarms] = useState<Farm[]>([]);

  const fetchFarms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/farms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFarms(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, farm_id: data[0].farm_id.toString() }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAnimals = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/animals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAnimals(data);
      }
    } catch (error) {
      console.error("Failed to fetch animals", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setRole(localStorage.getItem('role'));
    fetchAnimals();
    fetchFarms();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        nickname: formData.nickname,
        animal_type: formData.animal_type,
        age: parseInt(formData.age),
        biological_type: formData.biological_type,
        is_pregnant: formData.is_pregnant,
        status: formData.status,
        farm_id: parseInt(formData.farm_id)
      };

      const res = await fetch('http://localhost:9999/api/animals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          nickname: '',
          animal_type: '',
          age: '',
          biological_type: '',
          is_pregnant: false,
          status: 'Active',
          farm_id: farms.length > 0 ? farms[0].farm_id.toString() : ''
        });
        fetchAnimals();
        toast.success("Animal registered successfully");
      } else {
        const err = await res.json();
        toast.error(`Error: ${err.error || 'Failed to save'}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (animalId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:9999/api/animals/${animalId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Animal status updated to ${newStatus}`);
        fetchAnimals();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  const downloadIDCard = async (animalId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:9999/api/animals/${animalId}/id-card`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ID_Card_${animalId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("ID Card downloaded");
      } else {
        toast.error("Failed to download ID Card");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error downloading ID Card");
    }
  };

  const [role, setRole] = useState<string | null>(null);

  const filteredAnimals = animals.filter(animal => {
    if (role === 'Doctor' && animal.status !== 'Active') return false;
    return animal.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.animal_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.farm?.farm_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.biological_type?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Animals</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage livestock records and health status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchAnimals} variant="outline" className="hidden sm:flex border-dashed bg-background shadow-xs hover:bg-muted/50 rounded-xl">
            Refresh
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md transition-all hover:scale-[1.02] bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white border-none">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Animal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-2xl">
              <form onSubmit={handleSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">Register New Animal</DialogTitle>
                  <DialogDescription>
                    Enter the livestock details below to add them to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 py-6">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="nickname" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Animal Nickname</Label>
                    <Input
                      id="nickname"
                      value={formData.nickname}
                      onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                      placeholder="e.g. Cadey or Qamaerey"
                      className="rounded-xl border-slate-200 focus-visible:ring-[#2FA4D7] h-11 bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Animal Type</Label>
                    <Select value={formData.animal_type} onValueChange={v => setFormData({ ...formData, animal_type: v, biological_type: '' })}>
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-[#2FA4D7] transition-all">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        <SelectItem value="Camel" className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">Camel</SelectItem>
                        <SelectItem value="Cattle" className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">Cattle</SelectItem>
                        <SelectItem value="Goat" className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">Goat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Biological Type</Label>
                    <Select value={formData.biological_type} onValueChange={v => {
                      const isMale = v.includes('Male');
                      setFormData({ ...formData, biological_type: v, is_pregnant: isMale ? false : formData.is_pregnant });
                    }}>
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-[#2FA4D7] transition-all">
                        <SelectValue placeholder="Select bio type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        {(formData.animal_type === 'Goat' ? ['Rii (Female)', 'Orgi (Male)'] :
                          formData.animal_type === 'Cattle' ? ['Sac (Female)', 'Dibi (Male)'] :
                          formData.animal_type === 'Camel' ? ['Nirig (Female)', 'Awr (Male)'] : []
                        ).map(t => (
                           <SelectItem key={t} value={t} className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Pregnancy Status</Label>
                    <Select 
                      value={formData.is_pregnant ? 'Yes' : 'No'} 
                      onValueChange={v => setFormData({ ...formData, is_pregnant: v === 'Yes' })}
                      disabled={formData.biological_type?.includes('Male')}
                    >
                      <SelectTrigger className={`rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-[#2FA4D7] transition-all ${formData.biological_type?.includes('Male') ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}>
                        <SelectValue placeholder="Is pregnant?" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        <SelectItem value="No" className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">No</SelectItem>
                        <SelectItem value="Yes" className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Age (Years)</Label>
                    <Input id="age" type="number" required value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} placeholder="e.g. 3" className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="farm" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Farm Location</Label>
                    <Select value={formData.farm_id} onValueChange={v => setFormData({ ...formData, farm_id: v })}>
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-[#2FA4D7] transition-all">
                        <SelectValue placeholder="Choose farm" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        {farms.map(farm => (
                          <SelectItem key={farm.farm_id} value={farm.farm_id.toString()} className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors font-medium">
                            {farm.farm_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-8 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={isSaving} className="rounded-xl border-slate-200">Cancel</Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white rounded-xl px-8 shadow-lg shadow-[#2FA4D7]/20">
                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    Register Animal
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Main Table Card */}
      < Card className="rounded-2xl border-muted/60 shadow-xs bg-background overflow-hidden font-inter" >
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-muted/40 bg-muted/10 pb-4 pt-5 px-6">
          <div className="flex flex-col space-y-1.5">
            <CardTitle className="text-lg font-semibold">Animal Directory</CardTitle>
            <CardDescription className="text-xs">A complete timeline of registered livestock.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72 group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#2FA4D7]" />
            <Input
              placeholder="Search by code, nickname, type..."
              className="pl-9 rounded-full bg-background border-muted/60 shadow-sm focus-visible:ring-[#2FA4D7]/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent border-b-muted/40">
                <TableHead className="w-[120px] font-medium text-muted-foreground/80 pl-6 h-12">ID</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Nickname & Type</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12 hidden md:table-cell">Bio Type & Age</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Status</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Farm</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Vaccines</TableHead>
                <TableHead className="text-right pr-6 h-12 w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50 text-[#2FA4D7]" />
                      <p>Loading records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAnimals.length > 0 ? (
                filteredAnimals.map((animal) => (
                  <TableRow key={animal.animal_id} className="cursor-pointer hover:bg-muted/30 transition-colors border-b-muted/30 group">
                    <TableCell className="pl-6">
                      <span className="font-semibold text-foreground">#{animal.animal_id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#2FA4D7]/10 text-[#2FA4D7] flex items-center justify-center font-bold text-xs ring-1 ring-[#2FA4D7]/20 uppercase">
                          {animal.animal_type?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{animal.nickname || 'Unnamed'}</span>
                          <span className="text-[10px] text-muted-foreground">{animal.animal_type}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell text-sm">
                      <div className="flex flex-col gap-1">
                        <span>{animal.biological_type}, {animal.age} yrs</span>
                        {animal.is_pregnant && (
                          <Badge variant="outline" className="w-fit text-[10px] py-0 px-1 border-amber-500 text-amber-600 bg-amber-50">Pregnant</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={animal.status}
                          onValueChange={(newStatus) => handleStatusChange(animal.animal_id, newStatus)}
                        >
                          <SelectTrigger className={`h-8 border-0 shadow-none px-2 rounded-md font-medium text-xs w-[110px] ${
                            animal.status === 'Active' ? 'bg-green-500/10 text-green-700' :
                            animal.status === 'Sold' ? 'bg-slate-100 text-slate-700' :
                            'bg-red-500/10 text-red-700'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={4}>
                            <SelectItem value="Active" className="rounded-lg m-1 cursor-pointer hover:bg-green-50 focus:bg-green-50 focus:text-green-700 py-2 transition-colors font-medium text-xs">Active</SelectItem>
                            <SelectItem value="Sold" className="rounded-lg m-1 cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 py-2 transition-colors font-medium text-xs">Sold</SelectItem>
                            <SelectItem value="Deceased" className="rounded-lg m-1 cursor-pointer hover:bg-red-50 focus:bg-red-50 focus:text-red-700 py-2 transition-colors font-medium text-xs">Deceased</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{animal.farm?.farm_name || `Farm ${animal.farm_id}`}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-md font-medium px-2 py-0.5 border-[#2FA4D7]/20 text-[#2FA4D7] bg-[#2FA4D7]/5">
                        {animal.vaccinations?.length || 0} Doses
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#2FA4D7] hover:bg-[#2FA4D7]/10 rounded-lg"
                          onClick={() => downloadIDCard(animal.animal_id)}
                          title="Print ID Card"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <SearchIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p>No animals found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card >
    </div >
  );
}