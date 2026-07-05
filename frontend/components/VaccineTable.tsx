"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusIcon, Loader2Icon, SyringeIcon, CalendarIcon, InfoIcon, EditIcon, TrashIcon, MoreHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { canEdit } from '@/lib/permissions';

interface Vaccine {
    vaccine_id: number;
    vaccine_name: string;
    description?: string;
    validity_period_days: number;
    recommended_interval_days: number;
    created_at: string;
}

export default function VaccineTable() {
    const [vaccines, setVaccines] = useState<Vaccine[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingVaccineId, setEditingVaccineId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

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
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setVaccines(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        setRole(localStorage.getItem('role'));
        fetchVaccines();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:9999/api/vaccines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("Vaccine created successfully");
                setIsAddModalOpen(false);
                setFormData({ vaccine_name: '', description: '', validity_period_days: '', recommended_interval_days: '' });
                fetchVaccines();
            } else {
                toast.error("Failed to create vaccine");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVaccineId) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:9999/api/vaccines/${editingVaccineId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("Vaccine updated successfully");
                setIsEditModalOpen(false);
                setEditingVaccineId(null);
                setFormData({ vaccine_name: '', description: '', validity_period_days: '', recommended_interval_days: '' });
                fetchVaccines();
            } else {
                toast.error("Failed to update vaccine");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this vaccine?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:9999/api/vaccines/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Vaccine deleted successfully");
                fetchVaccines();
            } else {
                toast.error("Failed to delete vaccine");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const openEditModal = (vaccine: Vaccine) => {
        setFormData({
            vaccine_name: vaccine.vaccine_name,
            description: vaccine.description || '',
            validity_period_days: vaccine.validity_period_days.toString(),
            recommended_interval_days: vaccine.recommended_interval_days.toString()
        });
        setEditingVaccineId(vaccine.vaccine_id);
        setIsEditModalOpen(true);
    };

    return (
        <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <SyringeIcon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col space-y-0.5">
                            <CardTitle className="text-base font-extrabold text-slate-800">Vaccine Master List</CardTitle>
                            <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">Database of approved vaccine types and protocols.</CardDescription>
                        </div>
                    </div>
                </div>
                {canEdit('Vaccines', role) && (
                <>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg shadow-sm font-semibold px-4 h-9 text-xs border-none mt-4 sm:mt-0">
                            <PlusIcon className="w-4 h-4 mr-1.5" />
                            New Vaccine
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
                        <form onSubmit={handleSave}>
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-xl font-extrabold text-slate-800">Register New Vaccine</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">Define a new vaccine and its administration protocol.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2 font-inter">
                                <div className="space-y-2">
                                    <Label htmlFor="vaccine_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Vaccine Name</Label>
                                    <Input id="vaccine_name" required value={formData.vaccine_name} onChange={e => setFormData({ ...formData, vaccine_name: e.target.value })} placeholder="e.g. Foot and Mouth Disease" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Description</Label>
                                    <Input id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Short purpose of the vaccine" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-emerald-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="validity" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Validity (Days)</Label>
                                        <Input id="validity" type="number" required value={formData.validity_period_days} onChange={e => setFormData({ ...formData, validity_period_days: e.target.value })} placeholder="365" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-emerald-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="interval" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Interval (Days)</Label>
                                        <Input id="interval" type="number" required value={formData.recommended_interval_days} onChange={e => setFormData({ ...formData, recommended_interval_days: e.target.value })} placeholder="180" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-emerald-500" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="mt-6 gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-md font-semibold text-sm h-11 px-6">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Vaccine
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-[450px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
                        <form onSubmit={handleEditSave}>
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-xl font-extrabold text-slate-800">Edit Vaccine</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">Update the details of the selected vaccine.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2 font-inter">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_vaccine_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Vaccine Name</Label>
                                    <Input id="edit_vaccine_name" required value={formData.vaccine_name} onChange={e => setFormData({ ...formData, vaccine_name: e.target.value })} placeholder="e.g. Foot and Mouth Disease" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_description" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Description</Label>
                                    <Input id="edit_description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Short purpose of the vaccine" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-emerald-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_validity" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Validity (Days)</Label>
                                        <Input id="edit_validity" type="number" required value={formData.validity_period_days} onChange={e => setFormData({ ...formData, validity_period_days: e.target.value })} placeholder="365" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-emerald-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_interval" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Interval (Days)</Label>
                                        <Input id="edit_interval" type="number" required value={formData.recommended_interval_days} onChange={e => setFormData({ ...formData, recommended_interval_days: e.target.value })} placeholder="180" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-emerald-500" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="mt-6 gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-md font-semibold text-sm h-11 px-6">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Update Vaccine
                                </Button>
                            </DialogFooter>
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
                            <TableHead className="pl-6 h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest w-[250px]">Vaccine Name</TableHead>
                            <TableHead className="h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Description</TableHead>
                            <TableHead className="h-11 text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest">Validity</TableHead>
                            <TableHead className="h-11 text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest">Interval</TableHead>
                            <TableHead className="h-11 text-right font-bold text-[10px] text-slate-400 uppercase tracking-widest">Created</TableHead>
                            <TableHead className="h-11 text-right pr-6 font-bold text-[10px] text-slate-400 uppercase tracking-widest w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                                </TableCell>
                            </TableRow>
                        ) : vaccines.length > 0 ? (
                            vaccines.map((v) => (
                                <TableRow key={v.vaccine_id} className="hover:bg-slate-50 transition-colors border-b border-gray-50 group">
                                    <TableCell className="pl-6 py-3 font-bold text-slate-700 text-xs">{v.vaccine_name}</TableCell>
                                    <TableCell className="text-slate-500 text-xs font-medium py-3 max-w-[200px] truncate">
                                        {v.description || 'No description'}
                                    </TableCell>
                                    <TableCell className="text-center py-3">
                                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 uppercase tracking-wider w-fit mx-auto">
                                            <CalendarIcon className="h-3 w-3" />
                                            {v.validity_period_days} Days
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-3">
                                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 uppercase tracking-wider w-fit mx-auto">
                                            <InfoIcon className="h-3 w-3" />
                                            {v.recommended_interval_days} Days
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-3 text-slate-500 text-[10px] font-bold">
                                        {new Date(v.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right pr-6 py-3">
                                        {canEdit('Vaccines', role) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50 rounded-lg transition-opacity">
                                                        <MoreHorizontalIcon className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 bg-white border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-xl">
                                                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-slate-100" />
                                                    <DropdownMenuItem onClick={() => openEditModal(v)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                                        <EditIcon className="mr-2 h-4 w-4" /> Edit Vaccine
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(v.vaccine_id)} className="text-sm font-medium text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 rounded-lg m-1">
                                                        <TrashIcon className="mr-2 h-4 w-4" /> Delete Vaccine
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No vaccines found. Add one to start tracking.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
