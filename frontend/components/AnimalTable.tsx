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
import { SearchIcon, PlusIcon, MoreHorizontalIcon, Loader2Icon, PrinterIcon, LayersIcon, EditIcon, TrashIcon, AlertTriangleIcon, RefreshCwIcon, DownloadIcon, FilterIcon, ArrowDownUpIcon, LayoutGridIcon, SyringeIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, DnaIcon, HeartIcon, ScaleIcon, MapPinIcon, ArrowRightIcon, BellIcon, CheckIcon, CalendarIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { canEdit, canDelete } from '@/lib/permissions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Farm {
  farm_id: number;
  farm_name: string;
}

interface Animal {
  animal_id: number;
  nickname?: string;
  animal_type: string;
  age: number;
  date_of_birth?: string | null;
  weight?: number;
  biological_type?: string;
  is_pregnant?: boolean;
  status: string;
  farm_id: number;
  farm?: Farm;
  vaccinations?: unknown[];
  routineRecords?: unknown[];
  total_doses?: number;
}

const formatAnimalID = (type: string, id: number) => {
  if (type === 'Goat') return `GT-${id}`;
  if (type === 'Cattle') return `CT-${id}`;
  if (type === 'Camel') return `CM-${id}`;
  return `ID-${id}`;
};

export default function AnimalTable() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAnimalId, setEditingAnimalId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'nameAsc' | 'nameDesc'>('latest');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isVaccineDetailsOpen, setIsVaccineDetailsOpen] = useState(false);
  const [selectedVaccineAnimal, setSelectedVaccineAnimal] = useState<any>(null);

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isMortalityModalOpen, setIsMortalityModalOpen] = useState(false);
  const [mortalityAnimal, setMortalityAnimal] = useState<Animal | null>(null);
  const [deleteAnimalTarget, setDeleteAnimalTarget] = useState<Animal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mortalityData, setMortalityData] = useState({
    death_date: new Date().toISOString().split('T')[0],
    cause_of_death: 'Vaccine Reaction',
    notes: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    nickname: '',
    animal_type: '',
    age: '',
    age_unit: 'years' as 'months' | 'years',
    weight: '',
    biological_type: '',
    is_pregnant: false,
    pregnancy_start_date: '',
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
      if (!token) {
        toast.error('Authentication token missing. Please log in.');
        setIsLoading(false);
        return;
      }
      const res = await fetch('http://localhost:9999/api/animals', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        mode: 'cors',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAnimals(data);
      } else {
        const err = await res.json();
        toast.error(`Failed to fetch animals: ${err.error || res.statusText}`);
      }
    } catch (error) {
      console.error('Failed to fetch animals', error);
      toast.error('Network error while fetching animals');
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
      const age_months = formData.age_unit === 'years'
        ? Math.round(parseFloat(formData.age) * 12)
        : (parseFloat(formData.age) || 0);

      let minPregAge = 999;
      if (formData.animal_type === 'Camel') minPregAge = 48;
      else if (formData.animal_type === 'Cattle') minPregAge = 24;
      else if (formData.animal_type === 'Goat') minPregAge = 18;

      const isMale = formData.biological_type?.includes('Male');
      const actual_is_pregnant = (!isMale && age_months >= minPregAge) 
        ? formData.is_pregnant 
        : false;

      const payload = {
        nickname: formData.nickname,
        animal_type: formData.animal_type,
        age_months: age_months,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        biological_type: formData.biological_type,
        is_pregnant: actual_is_pregnant,
        pregnancy_start_date: formData.pregnancy_start_date || null,
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
          age_unit: 'months',
          weight: '',
          biological_type: '',
          is_pregnant: false,
          pregnancy_start_date: '',
          status: 'Active',
          farm_id: farms.length > 0 ? farms[0].farm_id.toString() : ''
        });
        fetchAnimals();
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful!',
          text: 'The new animal was registered successfully.',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'OK',
          customClass: {
            popup: '!rounded-3xl shadow-2xl pb-4',
            title: 'font-extrabold text-slate-800',
            confirmButton: 'rounded-xl font-medium px-8 py-2.5'
          }
        });
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
        age_months: formData.age_unit === 'years'
          ? Math.round(parseFloat(formData.age) * 12)
          : parseFloat(formData.age),
        weight: formData.weight ? parseFloat(formData.weight) : null,
        biological_type: formData.biological_type,
        is_pregnant: formData.is_pregnant,
        pregnancy_start_date: formData.pregnancy_start_date || null,
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
          age_unit: 'months',
          weight: '',
          biological_type: '',
          is_pregnant: false,
          pregnancy_start_date: '',
          status: 'Active',
          farm_id: farms.length > 0 ? farms[0].farm_id.toString() : ''
        });
        fetchAnimals();
        Swal.fire({
          icon: 'success',
          title: 'Update Successful!',
          text: 'The animal details were updated successfully.',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'OK',
          customClass: {
            popup: '!rounded-3xl shadow-2xl pb-4',
            title: 'font-extrabold text-slate-800',
            confirmButton: 'rounded-xl font-medium px-8 py-2.5'
          }
        });
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

  const handleReportMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mortalityAnimal) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:9999/api/animals/${mortalityAnimal.animal_id}/report-death`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mortalityData)
      });
      if (res.ok) {
        toast.success("Mortality reported successfully. Animal marked as Deceased.");
        setIsMortalityModalOpen(false);
        setMortalityAnimal(null);
        fetchAnimals();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to report mortality.");
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (animal: Animal) => {
    setFormData({
      nickname: animal.nickname || '',
      animal_type: animal.animal_type || '',
      age: animal.age ? Math.round(animal.age * 12).toString() : '',
      age_unit: 'months',
      weight: animal.weight ? animal.weight.toString() : '',
      biological_type: animal.biological_type || '',
      is_pregnant: animal.is_pregnant || false,
      pregnancy_start_date: animal.pregnancy_start_date ? animal.pregnancy_start_date.split('T')[0] : '',
      status: animal.status || 'Active',
      farm_id: animal.farm_id.toString()
    });
    setEditingAnimalId(animal.animal_id);
    setIsEditModalOpen(true);
  };

  const confirmDeleteAnimal = async () => {
    if (!deleteAnimalTarget) return;
    const animal = deleteAnimalTarget;
    const label = animal.nickname?.trim() || formatAnimalID(animal.animal_type, animal.animal_id);
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:9999/api/animals/${animal.animal_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setDeleteAnimalTarget(null);
        toast.success(`${label} deleted successfully`);
        fetchAnimals();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete animal");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error. Check that the backend is running.");
    } finally {
      setIsDeleting(false);
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
    if (role === 'Doctor' && animal.status !== 'Active' && animal.status !== 'Completed') return false;
    const lowerQuery = searchQuery.toLowerCase();
    const formattedId = formatAnimalID(animal.animal_type, animal.animal_id).toLowerCase();
    
    return animal.nickname?.toLowerCase().includes(lowerQuery) ||
      animal.animal_type?.toLowerCase().includes(lowerQuery) ||
      animal.farm?.farm_name?.toLowerCase().includes(lowerQuery) ||
      animal.biological_type?.toLowerCase().includes(lowerQuery) ||
      formattedId.includes(lowerQuery) ||
      animal.animal_id.toString().includes(lowerQuery);
  });

  const sortedAnimals = [...filteredAnimals].sort((a, b) => {
    if (sortBy === 'latest') return b.animal_id - a.animal_id;
    if (sortBy === 'oldest') return a.animal_id - b.animal_id;
    if (sortBy === 'nameAsc') return (a.nickname || '').localeCompare(b.nickname || '');
    if (sortBy === 'nameDesc') return (b.nickname || '').localeCompare(a.nickname || '');
    return 0;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Livestock Directory", 14, 15);
    
    const tableColumn = ["ID", "Nickname", "Type", "Bio Type", "Age", "Status", "Farm", "Doses"];
    const tableRows: any[] = [];

    sortedAnimals.forEach(animal => {
      const animalData = [
        formatAnimalID(animal.animal_type, animal.animal_id),
        animal.nickname || 'Unnamed',
        animal.animal_type,
        animal.biological_type || 'N/A',
        animal.age ? `${Math.round(animal.age * 12)} mo` : 'N/A',
        animal.status,
        animal.farm?.farm_name || `Farm ${animal.farm_id}`,
        (animal.total_doses ?? ((animal.vaccinations?.length || 0) + (animal.routineRecords?.length || 0))).toString()
      ];
      tableRows.push(animalData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save(`livestock_directory_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const tableRows = sortedAnimals.map(animal => ({
      ID: formatAnimalID(animal.animal_type, animal.animal_id),
      Nickname: animal.nickname || 'Unnamed',
      Type: animal.animal_type,
      "Bio Type": animal.biological_type || 'N/A',
      "Age (Months)": animal.age ? Math.round(animal.age * 12) : 'N/A',
      Status: animal.status,
      Farm: animal.farm?.farm_name || `Farm ${animal.farm_id}`,
      Doses: (animal.total_doses ?? ((animal.vaccinations?.length || 0) + (animal.routineRecords?.length || 0)))
    }));

    const worksheet = XLSX.utils.json_to_sheet(tableRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Animals");
    XLSX.writeFile(workbook, `livestock_directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Animals Directory</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Manage livestock records and health status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchAnimals} variant="outline" className="hidden sm:flex border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 rounded-xl h-10 px-4 font-semibold text-sm">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden sm:flex border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 rounded-xl h-10 px-4 font-semibold text-sm">
                <DownloadIcon className="w-4 h-4 mr-2 text-blue-600" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-gray-100 bg-white z-[9999] min-w-[150px]">
              <DropdownMenuItem onClick={exportToPDF} className="text-sm font-medium cursor-pointer py-2 hover:bg-gray-50 focus:bg-gray-50">
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="text-sm font-medium cursor-pointer py-2 hover:bg-gray-50 focus:bg-gray-50">
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canEdit('Animals', role) && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-semibold px-5 h-10 text-sm border-none">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Animal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
              <form onSubmit={handleSave}>
                <DialogHeader className="mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <PlusIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col text-left">
                      <DialogTitle className="text-xl font-extrabold text-slate-800">Register Vaccination Animal</DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 font-medium mt-1">
                        Enter the livestock details below to add them to the system.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 py-6">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="nickname" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Animal Nickname</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                      <Input
                        id="nickname"
                        value={formData.nickname}
                        onChange={e => {
                          const val = e.target.value
                          if (/^[a-zA-Z\s]*$/.test(val)) {
                            setFormData({ ...formData, nickname: val })
                          }
                        }}
                        placeholder="e.g. Cadey or Qamaerey"
                        className={`rounded-xl border-slate-200 focus-visible:ring-blue-600 h-11 bg-white shadow-sm pl-9 font-medium ${
                          formData.nickname && !/^[a-zA-Z\s]+$/.test(formData.nickname)
                            ? 'border-red-400 focus-visible:ring-red-400'
                            : ''
                        }`}
                      />
                    </div>
                    {formData.nickname && !/^[a-zA-Z\s]+$/.test(formData.nickname) && (
                      <p className="text-[11px] text-red-500 font-semibold mt-1 ml-1 flex items-center gap-1">
                        <span>⚠</span> Only write letters
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Animal Type</Label>
                    <Select value={formData.animal_type} onValueChange={v => setFormData({ ...formData, animal_type: v, biological_type: '' })}>
                      <SelectTrigger className="w-full relative rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-600 transition-all pl-9">
                        <BellIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        <SelectItem value="Camel" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">Camel</SelectItem>
                        <SelectItem value="Cattle" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">Cattle</SelectItem>
                        <SelectItem value="Goat" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">Goat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Biological Type</Label>
                    <Select value={formData.biological_type} onValueChange={v => {
                      const isMale = v.includes('Male');
                      setFormData({ ...formData, biological_type: v, is_pregnant: isMale ? false : formData.is_pregnant });
                    }}>
                      <SelectTrigger className="w-full relative rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-600 transition-all pl-9">
                        <DnaIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                        <SelectValue placeholder="Select bio type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        {(formData.animal_type === 'Goat' ? ['Rii (Female)', 'Orgi (Male)'] :
                          formData.animal_type === 'Cattle' ? ['Sac (Female)', 'Dibi (Male)'] :
                          formData.animal_type === 'Camel' ? ['Nirig (Female)', 'Awr (Male)'] : []
                        ).map(t => (
                           <SelectItem key={t} value={t} className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Pregnancy Status</Label>
                    {(() => {
                      const ageMonths = formData.age ? (formData.age_unit === 'years' ? parseFloat(formData.age) * 12 : parseFloat(formData.age)) : 0;
                      let minPregAge = 999;
                      let durationText = '';
                      if (formData.animal_type === 'Camel') { minPregAge = 48; durationText = 'Uurkas waxay sidesa 13 bilood ama 1 sano'; }
                      else if (formData.animal_type === 'Cattle') { minPregAge = 24; durationText = 'Uurkas waxay sidesa 9 bilood'; }
                      else if (formData.animal_type === 'Goat') { minPregAge = 18; durationText = 'Uurkas waxay sidesa 5 bilood'; }

                      const isMale = formData.biological_type?.includes('Male');
                      const isTooYoung = !isMale && ageMonths > 0 && ageMonths < minPregAge;
                      const isDisabled = isMale || isTooYoung || !formData.biological_type;

                      return (
                        <div className="flex flex-col space-y-1.5">
                          <Select 
                            value={formData.is_pregnant && !isTooYoung && !isMale ? 'Yes' : 'No'} 
                            onValueChange={v => setFormData({ ...formData, is_pregnant: v === 'Yes' })}
                            disabled={isDisabled}
                          >
                            <SelectTrigger className={`w-full relative rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-600 transition-all pl-9 ${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}>
                              <HeartIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                              <SelectValue placeholder="Is pregnant?" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                              <SelectItem value="No" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">No</SelectItem>
                              <SelectItem value="Yes" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                          {!isMale && formData.biological_type && isTooYoung && (
                            <p className="text-[10px] ml-1 leading-tight text-slate-500">
                              <span className="text-amber-500 font-medium">
                                Lama ogola (Ugu yaraan: {formData.age_unit === 'years' ? `${minPregAge / 12} sano` : `${minPregAge} bilood`}).
                              </span>
                            </p>
                          )}
                          {!isMale && formData.is_pregnant && formData.pregnancy_start_date && !isTooYoung && (
                            <p className="text-[10px] ml-1 leading-tight mt-1">
                              {(() => {
                                const start = new Date(formData.pregnancy_start_date);
                                if (isNaN(start.getTime())) return null;
                                const monthsPregnant = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                                if (monthsPregnant < 0) return <span className="text-amber-500 font-medium">Mustaqbalka ma noqon karto.</span>;
                                
                                let totalDuration = 0;
                                if (formData.animal_type === 'Camel') totalDuration = 13;
                                else if (formData.animal_type === 'Cattle') totalDuration = 9;
                                else if (formData.animal_type === 'Goat') totalDuration = 5;

                                const passed = monthsPregnant.toFixed(1);
                                const remaining = (totalDuration - monthsPregnant).toFixed(1);

                                if (monthsPregnant >= totalDuration) return <span className="text-emerald-600 font-medium">Wakhtigii waa la gaaray (Waxay sidday {passed} bilood).</span>;
                                return <span className="text-blue-600 font-medium">Uurka: {passed} bilood ayaa dhammaaday. U dhiman {remaining} bilood.</span>;
                              })()}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {(() => {
                    const ageMonths = formData.age ? (formData.age_unit === 'years' ? parseFloat(formData.age) * 12 : parseFloat(formData.age)) : 0;
                    let minPregAge = 999;
                    if (formData.animal_type === 'Camel') minPregAge = 48;
                    else if (formData.animal_type === 'Cattle') minPregAge = 24;
                    else if (formData.animal_type === 'Goat') minPregAge = 18;
                    const isMale = formData.biological_type?.includes('Male');
                    const isTooYoung = !isMale && ageMonths > 0 && ageMonths < minPregAge;

                    if (formData.is_pregnant && !isTooYoung && !isMale) {
                      return (
                        <div className="space-y-1.5 transition-all duration-300">
                          <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Expected Date</Label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
                            <Input
                              type="date"
                              required
                              value={formData.pregnancy_start_date || ''}
                              onChange={e => setFormData({ ...formData, pregnancy_start_date: e.target.value })}
                              className="rounded-xl border-slate-200 h-11 bg-white shadow-sm w-full font-medium focus-visible:ring-blue-600 pl-9"
                              title="Pregnancy Start Date (or Last Mating Date)"
                            />
                          </div>
                        </div>
                      );
                    }
                    return <div className="hidden sm:block" />;
                  })()}

                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="age" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Age</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="age"
                        type="number"
                        step="1"
                        min={
                          formData.age_unit === 'months'
                            ? (formData.animal_type === 'Goat' ? 3 : formData.animal_type === 'Cattle' ? 4 : formData.animal_type === 'Camel' ? 6 : 1)
                            : 1
                        }
                        max={formData.age_unit === 'months' ? 180 : 15}
                        required
                        value={formData.age}
                        onKeyDown={e => {
                          // Allow: backspace, delete, tab, arrows, home, end
                          const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']
                          if (allowed.includes(e.key)) return
                          // Allow decimal point (only if not already present)
                          if (e.key === '.' && !formData.age.includes('.')) return
                          // Block anything that is not a digit
                          if (!/^\d$/.test(e.key)) e.preventDefault()
                        }}
                        onChange={e => {
                          const val = e.target.value
                          // Allow digits and a single decimal point
                          if (/^\d*\.?\d*$/.test(val)) {
                            setFormData({ ...formData, age: val })
                          }
                        }}
                        placeholder={formData.age_unit === 'months'
                          ? (formData.animal_type === 'Goat' ? 'e.g. 3' : formData.animal_type === 'Cattle' ? 'e.g. 4' : formData.animal_type === 'Camel' ? 'e.g. 6' : 'e.g. 12')
                          : 'e.g. 2'
                        }
                        className="rounded-xl border-slate-200 h-11 bg-white shadow-sm flex-1 font-medium"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" className="h-11 w-11 p-0 rounded-xl border-slate-200 shrink-0 shadow-sm bg-white hover:bg-slate-50 transition-colors">
                            <MoreHorizontalIcon className="w-5 h-5 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-xl w-32 bg-white">
                          <DropdownMenuItem 
                            onClick={() => setFormData({ ...formData, age_unit: 'months', age: '' })}
                            className={`rounded-lg m-1 cursor-pointer font-medium py-2 ${formData.age_unit === 'months' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
                          >
                            Months {formData.age_unit === 'months' && <CheckIcon className="w-4 h-4 ml-auto" />}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setFormData({ ...formData, age_unit: 'years', age: '' })}
                            className={`rounded-lg m-1 cursor-pointer font-medium py-2 ${formData.age_unit === 'years' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
                          >
                            Years {formData.age_unit === 'years' && <CheckIcon className="w-4 h-4 ml-auto" />}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {formData.animal_type && (
                      <p className="text-[10px] text-slate-400 ml-1">
                        {formData.age_unit === 'months'
                          ? `Min: ${formData.animal_type === 'Goat' ? '3' : formData.animal_type === 'Cattle' ? '4' : '6'} bilood · Max: 180 bilood (15 sano)`
                          : `Min: 1 sano · Max: 15 sano`
                        }
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="weight" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Weight (kg)</Label>
                    <div className="relative">
                      <ScaleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onKeyDown={e => {
                          const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']
                          if (allowed.includes(e.key)) return
                          // Allow decimal point only if not already present
                          if (e.key === '.' && !formData.weight.includes('.')) return
                          // Block anything that is not a digit
                          if (!/^\d$/.test(e.key)) e.preventDefault()
                        }}
                        onChange={e => {
                          const val = e.target.value
                          if (/^\d*\.?\d*$/.test(val)) {
                            setFormData({ ...formData, weight: val })
                          }
                        }}
                        placeholder="e.g. 50.5"
                        className="rounded-xl border-slate-200 h-11 bg-white shadow-sm pl-9 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="farm" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Farm Location</Label>
                    <Select value={formData.farm_id} onValueChange={v => setFormData({ ...formData, farm_id: v })}>
                      <SelectTrigger className="w-full relative rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-600 transition-all pl-9">
                        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                        <SelectValue placeholder="Choose farm" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        {farms.map(farm => (
                          <SelectItem key={farm.farm_id} value={farm.farm_id.toString()} className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">
                            {farm.farm_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-8 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={isSaving} className="rounded-xl border-slate-200 text-sm font-semibold h-11">Cancel</Button>
                  <Button
                    type="submit"
                    disabled={isSaving || !!(formData.nickname && !/^[a-zA-Z\s]+$/.test(formData.nickname))}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 shadow-md text-sm font-semibold h-11 flex items-center justify-center"
                  >
                    {isSaving ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Register Animal
                    {!isSaving && <ArrowRightIcon className="w-4 h-4 ml-2" />}
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
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <EditIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col text-left">
                      <DialogTitle className="text-xl font-extrabold text-slate-800">Edit Animal</DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 font-medium mt-1">
                        Update the livestock details below.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 py-6">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="edit_nickname" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Animal Nickname</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                      <Input
                        id="edit_nickname"
                        value={formData.nickname}
                        onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                        placeholder="e.g. Cadey or Qamaerey"
                        className="rounded-xl border-slate-200 focus-visible:ring-blue-600 h-11 bg-white shadow-sm pl-9 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Animal Type</Label>
                    <Select value={formData.animal_type} onValueChange={v => setFormData({ ...formData, animal_type: v, biological_type: '' })}>
                      <SelectTrigger className="w-full relative rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-600 transition-all pl-9">
                        <BellIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        <SelectItem value="Camel" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">Camel</SelectItem>
                        <SelectItem value="Cattle" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">Cattle</SelectItem>
                        <SelectItem value="Goat" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">Goat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Biological Type</Label>
                    <Select value={formData.biological_type} onValueChange={v => {
                      const isMale = v.includes('Male');
                      setFormData({ ...formData, biological_type: v, is_pregnant: isMale ? false : formData.is_pregnant });
                    }}>
                      <SelectTrigger className="w-full relative rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-600 transition-all pl-9">
                        <DnaIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                        <SelectValue placeholder="Select bio type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        {(formData.animal_type === 'Goat' ? ['Rii (Female)', 'Orgi (Male)'] :
                          formData.animal_type === 'Cattle' ? ['Sac (Female)', 'Dibi (Male)'] :
                          formData.animal_type === 'Camel' ? ['Nirig (Female)', 'Awr (Male)'] : []
                        ).map(t => (
                           <SelectItem key={t} value={t} className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Pregnancy Status</Label>
                    {(() => {
                      const ageMonths = formData.age ? (formData.age_unit === 'years' ? parseFloat(formData.age) * 12 : parseFloat(formData.age)) : 0;
                      let minPregAge = 999;
                      let durationText = '';
                      if (formData.animal_type === 'Camel') { minPregAge = 48; durationText = 'Uurkas waxay sidesa 13 bilood ama 1 sano'; }
                      else if (formData.animal_type === 'Cattle') { minPregAge = 24; durationText = 'Uurkas waxay sidesa 9 bilood'; }
                      else if (formData.animal_type === 'Goat') { minPregAge = 18; durationText = 'Uurkas waxay sidesa 5 bilood'; }

                      const isMale = formData.biological_type?.includes('Male');
                      const isTooYoung = !isMale && ageMonths > 0 && ageMonths < minPregAge;
                      const isDisabled = isMale || isTooYoung || !formData.biological_type;

                      return (
                        <div className="flex flex-col space-y-1.5">
                          <Select 
                            value={formData.is_pregnant && !isTooYoung && !isMale ? 'Yes' : 'No'} 
                            onValueChange={v => setFormData({ ...formData, is_pregnant: v === 'Yes' })}
                            disabled={isDisabled}
                          >
                            <SelectTrigger className={`w-full relative rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-600 transition-all pl-9 ${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}>
                              <HeartIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                              <SelectValue placeholder="Is pregnant?" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                              <SelectItem value="No" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">No</SelectItem>
                              <SelectItem value="Yes" className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                          {!isMale && formData.biological_type && isTooYoung && (
                            <p className="text-[10px] ml-1 leading-tight text-slate-500">
                              <span className="text-amber-500 font-medium">
                                Lama ogola (Ugu yaraan: {formData.age_unit === 'years' ? `${minPregAge / 12} sano` : `${minPregAge} bilood`}).
                              </span>
                            </p>
                          )}
                          {!isMale && formData.is_pregnant && formData.pregnancy_start_date && !isTooYoung && (
                            <p className="text-[10px] ml-1 leading-tight mt-1">
                              {(() => {
                                const start = new Date(formData.pregnancy_start_date);
                                if (isNaN(start.getTime())) return null;
                                const monthsPregnant = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                                if (monthsPregnant < 0) return <span className="text-amber-500 font-medium">Mustaqbalka ma noqon karto.</span>;
                                
                                let totalDuration = 0;
                                if (formData.animal_type === 'Camel') totalDuration = 13;
                                else if (formData.animal_type === 'Cattle') totalDuration = 9;
                                else if (formData.animal_type === 'Goat') totalDuration = 5;

                                const passed = monthsPregnant.toFixed(1);
                                const remaining = (totalDuration - monthsPregnant).toFixed(1);

                                if (monthsPregnant >= totalDuration) return <span className="text-emerald-600 font-medium">Wakhtigii waa la gaaray (Waxay sidday {passed} bilood).</span>;
                                return <span className="text-blue-600 font-medium">Uurka: {passed} bilood ayaa dhammaaday. U dhiman {remaining} bilood.</span>;
                              })()}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {(() => {
                    const ageMonths = formData.age ? (formData.age_unit === 'years' ? parseFloat(formData.age) * 12 : parseFloat(formData.age)) : 0;
                    let minPregAge = 999;
                    if (formData.animal_type === 'Camel') minPregAge = 48;
                    else if (formData.animal_type === 'Cattle') minPregAge = 24;
                    else if (formData.animal_type === 'Goat') minPregAge = 18;
                    const isMale = formData.biological_type?.includes('Male');
                    const isTooYoung = !isMale && ageMonths > 0 && ageMonths < minPregAge;

                    if (formData.is_pregnant && !isTooYoung && !isMale) {
                      return (
                        <div className="space-y-1.5 transition-all duration-300">
                          <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Expected Date</Label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
                            <Input
                              type="date"
                              required
                              value={formData.pregnancy_start_date || ''}
                              onChange={e => setFormData({ ...formData, pregnancy_start_date: e.target.value })}
                              className="rounded-xl border-slate-200 h-11 bg-white shadow-sm w-full font-medium focus-visible:ring-blue-600 pl-9"
                              title="Pregnancy Start Date (or Last Mating Date)"
                            />
                          </div>
                        </div>
                      );
                    }
                    return <div className="hidden sm:block" />;
                  })()}

                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="edit_age" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Age</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="edit_age"
                        type="number"
                        step="1"
                        min={
                          formData.age_unit === 'months'
                            ? (formData.animal_type === 'Goat' ? 3 : formData.animal_type === 'Cattle' ? 4 : formData.animal_type === 'Camel' ? 6 : 1)
                            : 1
                        }
                        max={formData.age_unit === 'months' ? 180 : 15}
                        required
                        value={formData.age}
                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                        placeholder={formData.age_unit === 'months'
                          ? (formData.animal_type === 'Goat' ? 'e.g. 3' : formData.animal_type === 'Cattle' ? 'e.g. 4' : formData.animal_type === 'Camel' ? 'e.g. 6' : 'e.g. 12')
                          : 'e.g. 2'
                        }
                        className="rounded-xl border-slate-200 h-11 bg-white shadow-sm flex-1 font-medium"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" className="h-11 w-11 p-0 rounded-xl border-slate-200 shrink-0 shadow-sm bg-white hover:bg-slate-50 transition-colors">
                            <MoreHorizontalIcon className="w-5 h-5 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-xl w-32 bg-white">
                          <DropdownMenuItem 
                            onClick={() => setFormData({ ...formData, age_unit: 'months', age: '' })}
                            className={`rounded-lg m-1 cursor-pointer font-medium py-2 ${formData.age_unit === 'months' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
                          >
                            Months {formData.age_unit === 'months' && <CheckIcon className="w-4 h-4 ml-auto" />}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setFormData({ ...formData, age_unit: 'years', age: '' })}
                            className={`rounded-lg m-1 cursor-pointer font-medium py-2 ${formData.age_unit === 'years' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
                          >
                            Years {formData.age_unit === 'years' && <CheckIcon className="w-4 h-4 ml-auto" />}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {formData.animal_type && (
                      <p className="text-[10px] text-slate-400 ml-1">
                        {formData.age_unit === 'months'
                          ? `Min: ${formData.animal_type === 'Goat' ? '3' : formData.animal_type === 'Cattle' ? '4' : '6'} bilood · Max: 180 bilood (15 sano)`
                          : `Min: 1 sano · Max: 15 sano`
                        }
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_weight" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Weight (kg)</Label>
                    <div className="relative">
                      <ScaleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                      <Input id="edit_weight" type="number" step="0.1" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} placeholder="e.g. 50.5" className="rounded-xl border-slate-200 h-11 bg-white shadow-sm pl-9 font-medium" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit_farm" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Farm Location</Label>
                    <Select value={formData.farm_id} onValueChange={v => setFormData({ ...formData, farm_id: v })}>
                      <SelectTrigger className="w-full relative rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-600 transition-all pl-9">
                        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                        <SelectValue placeholder="Choose farm" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={8}>
                        {farms.map(farm => (
                          <SelectItem key={farm.farm_id} value={farm.farm_id.toString()} className="rounded-lg m-1 cursor-pointer hover:bg-blue-600/10 focus:bg-blue-600/10 focus:text-blue-600 py-2.5 transition-colors font-medium">
                            {farm.farm_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-8 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSaving} className="rounded-xl border-slate-200 text-sm font-semibold h-11">Cancel</Button>
                  <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 shadow-md text-sm font-semibold h-11 flex items-center justify-center">
                    {isSaving ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Update Animal
                    {!isSaving && <ArrowRightIcon className="w-4 h-4 ml-2" />}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}

          {canEdit('Animals', role) && mortalityAnimal && (
            <Dialog open={isMortalityModalOpen} onOpenChange={setIsMortalityModalOpen}>
              <DialogContent className="sm:max-w-[400px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
                <form onSubmit={handleReportMortality}>
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-extrabold text-rose-600">Report Mortality</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 font-medium">
                      Report the death of {mortalityAnimal.nickname || 'Animal'} (#{mortalityAnimal.animal_id}).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Date of Death</Label>
                      <Input type="date" required value={mortalityData.death_date} onChange={e => setMortalityData({...mortalityData, death_date: e.target.value})} className="rounded-xl border-slate-200 h-11 bg-slate-50/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Cause of Death</Label>
                      <Select value={mortalityData.cause_of_death} onValueChange={v => setMortalityData({...mortalityData, cause_of_death: v})}>
                        <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-rose-500 transition-all">
                          <SelectValue placeholder="Select cause" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white overflow-hidden">
                          <SelectItem value="Vaccine Reaction" className="rounded-lg m-1 font-medium">Vaccine Reaction</SelectItem>
                          <SelectItem value="Illness" className="rounded-lg m-1 font-medium">Illness</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Details / Notes</Label>
                      <textarea required={mortalityData.cause_of_death === 'Vaccine Reaction'} placeholder="Explain the reaction or cause in detail..." className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-rose-500" rows={3} value={mortalityData.notes} onChange={e => setMortalityData({...mortalityData, notes: e.target.value})}></textarea>
                    </div>
                  </div>
                  <DialogFooter className="mt-4 gap-3">
                    <Button type="button" variant="ghost" onClick={() => setIsMortalityModalOpen(false)} disabled={isSaving} className="rounded-xl border-slate-200">Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-8 shadow-lg shadow-rose-600/20">
                      {isSaving ? 'Submitting...' : 'Report Death'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Dialog
            open={!!deleteAnimalTarget}
            onOpenChange={(open) => {
              if (!open && !isDeleting) setDeleteAnimalTarget(null);
            }}
          >
            <DialogContent className="sm:max-w-[420px] rounded-[24px] border-none shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] bg-white p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-rose-50 via-white to-slate-50 px-6 pt-6 pb-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
                  <AlertTriangleIcon className="w-7 h-7" />
                </div>
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-xl font-extrabold tracking-tight text-slate-900">
                    Delete this animal?
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-500 font-medium leading-relaxed">
                    You are about to permanently remove{" "}
                    <span className="inline-flex items-center rounded-full bg-slate-900 text-white text-xs font-bold px-2.5 py-0.5 mx-0.5">
                      {deleteAnimalTarget
                        ? deleteAnimalTarget.nickname?.trim() ||
                          formatAnimalID(deleteAnimalTarget.animal_type, deleteAnimalTarget.animal_id)
                        : ""}
                    </span>{" "}
                    from the directory.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-6 py-4">
                <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-[13px] text-rose-800 leading-relaxed">
                  Vaccination history, alerts, and schedules for this animal will also be removed. This action cannot be undone.
                </div>
              </div>

              <DialogFooter className="px-6 pb-6 gap-2 sm:gap-3 sm:justify-stretch">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setDeleteAnimalTarget(null)}
                  className="flex-1 rounded-xl h-11 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Keep animal
                </Button>
                <Button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteAnimal}
                  className="flex-1 rounded-xl h-11 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-lg shadow-rose-600/20"
                >
                  {isDeleting ? (
                    <>
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Yes, delete
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Main Table Card */}
      <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-gray-50 p-6 bg-white">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-[14px] bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                <LayersIcon className="w-6 h-6" />
             </div>
             <div className="flex flex-col">
               <CardTitle className="text-lg font-extrabold text-slate-800">Animal Directory</CardTitle>
               <CardDescription className="text-xs text-slate-500 font-medium mt-1">A complete timeline of registered livestock.</CardDescription>
             </div>
          </div>
        </CardHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-gray-50 bg-white gap-4">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-gray-200 h-9 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
                  <ArrowDownUpIcon className="w-3.5 h-3.5 mr-2 text-gray-400" /> Sort: {sortBy === 'latest' ? 'Latest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'nameAsc' ? 'Name (A-Z)' : 'Name (Z-A)'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-xl shadow-lg border-gray-100 min-w-[160px] bg-white z-[9999]">
                <DropdownMenuItem onClick={() => setSortBy('latest')} className="text-xs font-medium cursor-pointer py-2 hover:bg-gray-50 focus:bg-gray-50">Latest Registered</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('oldest')} className="text-xs font-medium cursor-pointer py-2 hover:bg-gray-50 focus:bg-gray-50">Oldest Registered</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('nameAsc')} className="text-xs font-medium cursor-pointer py-2 hover:bg-gray-50 focus:bg-gray-50">Name (A-Z)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('nameDesc')} className="text-xs font-medium cursor-pointer py-2 hover:bg-gray-50 focus:bg-gray-50">Name (Z-A)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-gray-200 h-9 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
                  <LayoutGridIcon className="w-3.5 h-3.5 mr-2 text-gray-400" /> View: {viewMode === 'table' ? 'Table' : 'Grid'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-xl shadow-lg border-gray-100 min-w-[120px] bg-white z-[9999]">
                <DropdownMenuItem onClick={() => setViewMode('table')} className="text-xs font-medium cursor-pointer py-2 hover:bg-gray-50 focus:bg-gray-50">Table View</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('grid')} className="text-xs font-medium cursor-pointer py-2 hover:bg-gray-50 focus:bg-gray-50">Grid View</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="relative w-full sm:w-[320px] group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              placeholder="Search by code, nickname, type..."
              className="pl-11 rounded-xl h-10 bg-white border border-gray-200 text-sm font-medium focus-visible:ring-blue-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <CardContent className="p-0">
          {viewMode === 'grid' ? (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50/30">
              {isLoading ? (
                <div className="col-span-full h-32 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50 text-blue-600" />
                  <p>Loading records...</p>
                </div>
              ) : sortedAnimals.length > 0 ? (
                sortedAnimals.map((animal) => (
                  <div key={animal.animal_id} className="rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden p-5 flex flex-col gap-4 relative group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm ring-1 ring-blue-100 uppercase">
                          {animal.animal_type?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-bold text-slate-800 text-sm leading-none">{animal.nickname || 'Unnamed'}</h3>
                          <span className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{formatAnimalID(animal.animal_type, animal.animal_id)} · {animal.animal_type}</span>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-md font-bold text-[9px] uppercase tracking-wider flex items-center gap-1.5 ${
                        animal.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                        animal.status === 'Sold' ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${
                           animal.status === 'Active' ? 'bg-emerald-500' :
                           animal.status === 'Sold' ? 'bg-slate-500' : 'bg-rose-500'
                         }`} />
                         {animal.status}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Bio Type</span>
                        <span className="font-semibold text-slate-700">{animal.biological_type}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Age</span>
                        <span className="font-semibold text-slate-700">{animal.age ? (animal.age >= 1 ? `${Math.round(animal.age * 12)} mo (${Number(animal.age.toFixed(1))} yr)` : `${Math.round(animal.age * 12)} mo`) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Weight</span>
                        <span className="font-semibold text-slate-700">{animal.weight ? `${animal.weight} kg` : '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Farm</span>
                        <span className="font-semibold text-slate-700">{animal.farm?.farm_name || `Farm ${animal.farm_id}`}</span>
                      </div>
                      {animal.is_pregnant && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-slate-500 font-medium">Pregnancy</span>
                          <span className="font-semibold text-amber-600">
                             Yes {animal.pregnancy_months !== undefined && animal.pregnancy_months !== null ? `(${animal.pregnancy_months >= 1 ? animal.pregnancy_months.toFixed(1) : Math.round(animal.pregnancy_months * 30.44)} ${animal.pregnancy_months >= 1 ? 'mo' : 'days'})` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-50">
                      <Badge 
                        variant="outline" 
                        className="rounded-md font-bold px-2 py-1 border-blue-100 text-blue-600 bg-blue-50/50 hover:bg-blue-100 transition-colors cursor-pointer text-[10px] flex items-center gap-1.5 w-fit"
                        onClick={() => {
                          setSelectedVaccineAnimal(animal);
                          setIsVaccineDetailsOpen(true);
                        }}
                      >
                        <SyringeIcon className="w-3 h-3 text-blue-400" />
                        {(animal.total_doses ?? ((animal.vaccinations?.length || 0) + (animal.routineRecords?.length || 0)))} Doses
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-lg">
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
                                <DropdownMenuItem onClick={() => openEditModal(animal)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                  <EditIcon className="mr-2 h-4 w-4" /> Edit Record
                                </DropdownMenuItem>
                            )}
                            
                            {canDelete('Animals', role) && (
                              <>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem onClick={() => setDeleteAnimalTarget(animal)} className="text-sm font-medium text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 rounded-lg m-1">
                                  <TrashIcon className="mr-2 h-4 w-4" /> Delete Animal
                                </DropdownMenuItem>
                              </>
                            )}

                            {canEdit('Animals', role) && animal.status === 'Active' && (
                                  <>
                                    <DropdownMenuSeparator className="bg-slate-100" />
                                    <DropdownMenuItem onClick={() => {
                                      setMortalityAnimal(animal);
                                      setMortalityData({
                                        death_date: new Date().toISOString().split('T')[0],
                                        cause_of_death: 'Vaccine Reaction',
                                        notes: ''
                                      });
                                      setIsMortalityModalOpen(true);
                                    }} className="text-sm font-medium text-rose-600 cursor-pointer focus:bg-rose-50 focus:text-rose-700 rounded-lg m-1">
                                      <span className="mr-2 h-4 w-4 flex items-center justify-center">☠️</span> Report Death
                                    </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full h-32 flex flex-col items-center justify-center text-muted-foreground">
                  <SearchIcon className="h-8 w-8 mb-2 opacity-20" />
                  <p>No animals found matching your search.</p>
                </div>
              )}
            </div>
          ) : (
          <Table>
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-transparent border-b border-gray-50">
                <TableHead className="w-[120px] font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-12">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => setSortBy(sortBy === 'latest' ? 'oldest' : 'latest')}>
                    ID <ArrowDownUpIcon className={`w-3 h-3 ${sortBy === 'latest' || sortBy === 'oldest' ? 'text-blue-500' : 'text-gray-300'}`} />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-12">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => setSortBy(sortBy === 'nameAsc' ? 'nameDesc' : 'nameAsc')}>
                    Nickname & Type <ArrowDownUpIcon className={`w-3 h-3 ${sortBy === 'nameAsc' || sortBy === 'nameDesc' ? 'text-blue-500' : 'text-gray-300'}`} />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-12 hidden md:table-cell">Bio Type & Age</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-12">
                  <div className="flex items-center gap-1.5">Status</div>
                </TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-12">Farm</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-12">Vaccines</TableHead>
                <TableHead className="text-right pr-6 h-12 w-[120px] font-bold text-[10px] text-slate-400 uppercase tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50 text-blue-600" />
                      <p>Loading records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedAnimals.length > 0 ? (
                sortedAnimals.map((animal) => (
                  <TableRow key={animal.animal_id} className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-gray-50 group">
                    <TableCell className="pl-6 py-3">
                      <span className="font-bold text-slate-700 text-xs">{formatAnimalID(animal.animal_type, animal.animal_id)}</span>
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
                        <span>{animal.biological_type}, {animal.age ? (animal.age >= 1 ? `${Math.round(animal.age * 12)} bilood (${Number(animal.age.toFixed(1))} yr)` : `${Math.round(animal.age * 12)} bilood`) : 'N/A'} {animal.weight ? `· ${animal.weight} kg` : ''}</span>
                        {animal.is_pregnant && (
                          <Badge variant="outline" className="w-fit text-[9px] py-0 px-1.5 border-amber-500 text-amber-600 bg-amber-50 font-bold uppercase tracking-wider rounded-full mt-1">
                            Pregnant {animal.pregnancy_months !== undefined && animal.pregnancy_months !== null 
                              ? (animal.pregnancy_months < 1 
                                  ? `(${Math.round(animal.pregnancy_months * 30.44)} days)` 
                                  : `(${animal.pregnancy_months.toFixed(1)} months)`) 
                              : ''}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={animal.status}
                          onValueChange={(newStatus) => handleStatusChange(animal.animal_id, newStatus)}
                          disabled={!canEdit('Animals', role) && role !== 'Farm Worker'}
                        >
                          <SelectTrigger className={`h-8 border-none shadow-none px-2 rounded-md font-bold text-[10px] uppercase tracking-wider w-[105px] ${
                            animal.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                            animal.status === 'Sold' ? 'bg-slate-100 text-slate-600' :
                            'bg-rose-50 text-rose-600'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                 animal.status === 'Active' ? 'bg-emerald-500' :
                                 animal.status === 'Sold' ? 'bg-slate-500' :
                                 'bg-rose-500'
                               }`} />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-gray-200 shadow-xl z-[9999] bg-white overflow-hidden" position="popper" sideOffset={4}>
                            <SelectItem value="Active" className="rounded-lg m-1 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-emerald-700 py-2 transition-colors font-bold text-xs">Active</SelectItem>
                            <SelectItem value="Sold" className="rounded-lg m-1 cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 py-2 transition-colors font-bold text-xs">Sold</SelectItem>
                            <SelectItem value="Deceased" className="rounded-lg m-1 cursor-pointer hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-700 py-2 transition-colors font-bold text-xs">Deceased</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs font-semibold py-4">{animal.farm?.farm_name || `Farm ${animal.farm_id}`}</TableCell>
                    <TableCell className="py-4">
                      <Badge 
                        variant="outline" 
                        className="rounded-md font-bold px-2 py-1 border-blue-100 text-blue-600 bg-blue-50/50 hover:bg-blue-100 transition-colors cursor-pointer text-[10px] flex items-center gap-1.5 w-fit"
                        onClick={() => {
                          setSelectedVaccineAnimal(animal);
                          setIsVaccineDetailsOpen(true);
                        }}
                      >
                        <SyringeIcon className="w-3 h-3 text-blue-400" />
                        {(animal.total_doses ?? ((animal.vaccinations?.length || 0) + (animal.routineRecords?.length || 0)))} Doses
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400 border-gray-200 hover:bg-slate-50 rounded-lg shadow-sm transition-opacity">
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
                                <DropdownMenuItem onClick={() => openEditModal(animal)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                  <EditIcon className="mr-2 h-4 w-4" /> Edit Record
                                </DropdownMenuItem>
                            )}
                            
                            {canDelete('Animals', role) && (
                              <>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem onClick={() => setDeleteAnimalTarget(animal)} className="text-sm font-medium text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 rounded-lg m-1">
                                  <TrashIcon className="mr-2 h-4 w-4" /> Delete Animal
                                </DropdownMenuItem>
                              </>
                            )}

                            {canEdit('Animals', role) && animal.status === 'Active' && (
                                  <>
                                    <DropdownMenuSeparator className="bg-slate-100" />
                                    <DropdownMenuItem onClick={() => {
                                      setMortalityAnimal(animal);
                                      setMortalityData({
                                        death_date: new Date().toISOString().split('T')[0],
                                        cause_of_death: 'Vaccine Reaction',
                                        notes: ''
                                      });
                                      setIsMortalityModalOpen(true);
                                    }} className="text-sm font-medium text-rose-600 cursor-pointer focus:bg-rose-50 focus:text-rose-700 rounded-lg m-1">
                                      <span className="mr-2 h-4 w-4 flex items-center justify-center">☠️</span> Report Death
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
          )}
        </CardContent>
        <div className="border-t border-gray-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between bg-white gap-4">
          <p className="text-xs text-gray-500 font-medium">Showing 1 to {filteredAnimals.length} of {filteredAnimals.length} results</p>
          <div className="flex items-center gap-4">
            <Select defaultValue="10">
              <SelectTrigger className="rounded-xl border-gray-200 h-9 w-[110px] text-xs font-semibold text-gray-700 shadow-sm bg-white">
                <SelectValue placeholder="10 / page" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                <SelectItem value="10" className="text-xs font-medium rounded-lg">10 / page</SelectItem>
                <SelectItem value="20" className="text-xs font-medium rounded-lg">20 / page</SelectItem>
                <SelectItem value="50" className="text-xs font-medium rounded-lg">50 / page</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-200 text-gray-400 shadow-sm" disabled>
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-white">
                1
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-200 text-gray-400 shadow-sm" disabled>
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isVaccineDetailsOpen} onOpenChange={setIsVaccineDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-extrabold text-slate-800">Vaccination History</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              {selectedVaccineAnimal ? `${selectedVaccineAnimal.nickname || 'Unnamed'} (${formatAnimalID(selectedVaccineAnimal.animal_type, selectedVaccineAnimal.animal_id)})` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {selectedVaccineAnimal?.vaccinations?.length === 0 && selectedVaccineAnimal?.routineRecords?.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-gray-200 rounded-xl">
                <p className="text-sm font-medium text-slate-500">No vaccinations recorded for this animal.</p>
              </div>
            ) : (
              <>
                {selectedVaccineAnimal?.vaccinations?.map((v: any, i: number) => (
                  <div key={`em-${i}`} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{v.vaccine?.vaccine_name || 'Unknown Vaccine'}</h4>
                      <p className="text-xs text-slate-500 mt-1">Standard / Emergency</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{new Date(v.date_administered).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {selectedVaccineAnimal?.routineRecords?.map((v: any, i: number) => (
                  <div key={`rt-${i}`} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{v.vaccine?.vaccine_name || 'Unknown Vaccine'}</h4>
                      <p className="text-xs text-slate-500 mt-1">Routine Campaign</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{new Date(v.date_administered).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}