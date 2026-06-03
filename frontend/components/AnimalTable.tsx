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
import { SearchIcon, PlusIcon, MoreHorizontalIcon, Loader2Icon, PrinterIcon, LayersIcon, EditIcon, TrashIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { canEdit } from '@/lib/permissions';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAnimalId, setEditingAnimalId] = useState<number | null>(null);
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

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnimalId) return;
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

      const res = await fetch(`http://localhost:9999/api/animals/${editingAnimalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingAnimalId(null);
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
        toast.success("Animal updated successfully");
      } else {
        const err = await res.json();
        toast.error(`Error: ${err.error || 'Failed to update'}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (animal: Animal) => {
    setFormData({
      nickname: animal.nickname || '',
      animal_type: animal.animal_type || '',
      age: animal.age.toString(),
      biological_type: animal.biological_type || '',
      is_pregnant: animal.is_pregnant || false,
      status: animal.status || 'Active',
      farm_id: animal.farm_id.toString()
    });
    setEditingAnimalId(animal.animal_id);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this animal?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:9999/api/animals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Animal deleted successfully");
        fetchAnimals();
      } else {
        toast.error("Failed to delete animal");
      }
    } catch (error) {
      console.error(error);
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
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">Animals Directory</h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Manage livestock records and health status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchAnimals} variant="outline" className="hidden sm:flex border-dashed bg-background shadow-xs hover:bg-muted/50 rounded-xl">
            Refresh
          </Button>
          {canEdit('Animals', role) && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg shadow-sm font-semibold px-4 h-9 text-xs border-none">
                  <PlusIcon className="w-4 h-4 mr-1.5" />
                  Add Animal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
              <form onSubmit={handleSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-extrabold text-slate-800">Register New Animal</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
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
          )}

          {canEdit('Animals', role) && (
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="sm:max-w-[500px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
              <form onSubmit={handleEditSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-extrabold text-slate-800">Edit Animal</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    Update the livestock details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 py-6">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="edit_nickname" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Animal Nickname</Label>
                    <Input
                      id="edit_nickname"
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
                    <Label htmlFor="edit_age" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Age (Years)</Label>
                    <Input id="edit_age" type="number" required value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} placeholder="e.g. 3" className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_farm" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Farm Location</Label>
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
                  <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSaving} className="rounded-xl border-slate-200">Cancel</Button>
                  <Button type="submit" disabled={isSaving} className="bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white rounded-xl px-8 shadow-lg shadow-[#2FA4D7]/20">
                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    Update Animal
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>


      {/* Main Table Card */}
      <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LayersIcon className="w-6 h-6" />
             </div>
             <div className="flex flex-col space-y-0.5">
               <CardTitle className="text-base font-extrabold text-slate-800">Animal Directory</CardTitle>
               <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">A complete timeline of registered livestock.</CardDescription>
             </div>
          </div>
          <div className="relative w-full sm:w-72 group mt-4 sm:mt-0">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              placeholder="Search by code, nickname, type..."
              className="pl-9 rounded-xl h-10 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent border-b border-gray-50">
                <TableHead className="w-[120px] font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-11">ID</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Nickname & Type</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11 hidden md:table-cell">Bio Type & Age</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Status</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Farm</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Vaccines</TableHead>
                <TableHead className="text-right pr-6 h-11 w-[120px] font-bold text-[10px] text-slate-400 uppercase tracking-widest">Actions</TableHead>
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
                  <TableRow key={animal.animal_id} className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-gray-50 group">
                    <TableCell className="pl-6 py-3">
                      <span className="font-bold text-slate-700 text-xs">#{animal.animal_id}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs ring-1 ring-blue-100 uppercase">
                          {animal.animal_type?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs">{animal.nickname || 'Unnamed'}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{animal.animal_type}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 hidden md:table-cell text-xs font-medium py-3">
                      <div className="flex flex-col gap-1">
                        <span>{animal.biological_type}, {animal.age} yrs</span>
                        {animal.is_pregnant && (
                          <Badge variant="outline" className="w-fit text-[9px] py-0 px-1.5 border-amber-500 text-amber-600 bg-amber-50 font-bold uppercase tracking-wider rounded-full">Pregnant</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={animal.status}
                          onValueChange={(newStatus) => handleStatusChange(animal.animal_id, newStatus)}
                          disabled={!canEdit('Animals', role) && role !== 'Farm Worker'}
                        >
                          <SelectTrigger className={`h-8 border-none shadow-none px-2 rounded-lg font-bold text-[10px] uppercase tracking-wider w-[110px] ${
                            animal.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                            animal.status === 'Sold' ? 'bg-slate-100 text-slate-600' :
                            'bg-rose-50 text-rose-600'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-gray-200 shadow-xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={4}>
                            <SelectItem value="Active" className="rounded-lg m-1 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-emerald-700 py-2 transition-colors font-bold text-xs">Active</SelectItem>
                            <SelectItem value="Sold" className="rounded-lg m-1 cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 py-2 transition-colors font-bold text-xs">Sold</SelectItem>
                            <SelectItem value="Deceased" className="rounded-lg m-1 cursor-pointer hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-700 py-2 transition-colors font-bold text-xs">Deceased</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-medium py-3">{animal.farm?.farm_name || `Farm ${animal.farm_id}`}</TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="rounded-full font-bold px-2 py-0.5 border-blue-200 text-blue-600 bg-blue-50 text-[10px]">
                        {animal.vaccinations?.length || 0} Doses
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg"
                          onClick={() => downloadIDCard(animal.animal_id)}
                          title="Print ID Card"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-xl">
                            <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem onClick={() => downloadIDCard(animal.animal_id)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                              <PrinterIcon className="mr-2 h-4 w-4" /> Print ID Card
                            </DropdownMenuItem>
                            {canEdit('Animals', role) && (
                              <>
                                <DropdownMenuItem onClick={() => openEditModal(animal)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                  <EditIcon className="mr-2 h-4 w-4" /> Edit Record
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem onClick={() => handleDelete(animal.animal_id)} className="text-sm font-medium text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 rounded-lg m-1">
                                  <TrashIcon className="mr-2 h-4 w-4" /> Delete Animal
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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