"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusIcon, Loader2Icon, MapPinIcon, WarehouseIcon, EditIcon, TrashIcon, MoreHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { canEdit } from '@/lib/permissions';

interface Farm {
    farm_id: number;
    farm_name: string;
    location: string;
    created_at: string;
    animals?: unknown[];
}

export default function FarmTable() {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingFarmId, setEditingFarmId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        farm_name: '',
        location: ''
    });

    const fetchFarms = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:9999/api/farms', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFarms(data);
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
        fetchFarms();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:9999/api/farms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("Farm created successfully");
                setIsAddModalOpen(false);
                setFormData({ farm_name: '', location: '' });
                fetchFarms();
            } else {
                toast.error("Failed to create farm");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFarmId) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:9999/api/farms/${editingFarmId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("Farm updated successfully");
                setIsEditModalOpen(false);
                setEditingFarmId(null);
                setFormData({ farm_name: '', location: '' });
                fetchFarms();
            } else {
                toast.error("Failed to update farm");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this farm?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:9999/api/farms/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Farm deleted successfully");
                fetchFarms();
            } else {
                toast.error("Failed to delete farm");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const openEditModal = (farm: Farm) => {
        setFormData({
            farm_name: farm.farm_name,
            location: farm.location
        });
        setEditingFarmId(farm.farm_id);
        setIsEditModalOpen(true);
    };

    return (
        <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <WarehouseIcon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col space-y-0.5">
                            <CardTitle className="text-base font-extrabold text-slate-800">Farm Locations</CardTitle>
                            <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">Manage Mumin Group farm units and centers.</CardDescription>
                        </div>
                    </div>
                </div>
                {canEdit('Farms', role) && (
                <>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg shadow-sm font-semibold px-4 h-9 text-xs border-none mt-4 sm:mt-0">
                            <PlusIcon className="w-4 h-4 mr-1.5" />
                            Add Farm
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
                        <form onSubmit={handleSave}>
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-xl font-extrabold text-slate-800">Create New Farm</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">Add a new farm location to the system.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="farm_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Farm Name</Label>
                                    <Input id="farm_name" required value={formData.farm_name} onChange={e => setFormData({ ...formData, farm_name: e.target.value })} placeholder="e.g. Afgooye Farm" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Location</Label>
                                    <Input id="location" required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Lower Shabelle" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-blue-500" />
                                </div>
                            </div>
                            <DialogFooter className="mt-6 gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-md font-semibold text-sm h-11 px-6">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Farm
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-[400px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
                        <form onSubmit={handleEditSave}>
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-xl font-extrabold text-slate-800">Edit Farm</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">Update the farm details below.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_farm_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Farm Name</Label>
                                    <Input id="edit_farm_name" required value={formData.farm_name} onChange={e => setFormData({ ...formData, farm_name: e.target.value })} placeholder="e.g. Afgooye Farm" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_location" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Location</Label>
                                    <Input id="edit_location" required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Lower Shabelle" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-blue-500" />
                                </div>
                            </div>
                            <DialogFooter className="mt-6 gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-md font-semibold text-sm h-11 px-6">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Update Farm
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
                            <TableHead className="w-[200px] font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-11">Farm Name</TableHead>
                            <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Location</TableHead>
                            <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11 text-center">Animals</TableHead>
                            <TableHead className="text-right h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Created</TableHead>
                            <TableHead className="text-right pr-6 h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                                </TableCell>
                            </TableRow>
                        ) : farms.length > 0 ? (
                            farms.map((farm) => (
                                <TableRow key={farm.farm_id} className="hover:bg-slate-50 transition-colors border-b border-gray-50 group">
                                    <TableCell className="pl-6 py-3 font-bold text-slate-700 text-xs">{farm.farm_name}</TableCell>
                                    <TableCell className="text-slate-500 text-xs font-medium py-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center">
                                                <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                                            </div>
                                            {farm.location}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-3">
                                        <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[10px]">
                                            {farm.animals?.length || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right py-3 text-slate-500 text-[10px] font-bold">
                                        {new Date(farm.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right pr-6 py-3">
                                        {canEdit('Farms', role) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontalIcon className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 bg-white border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-xl">
                                                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-slate-100" />
                                                    <DropdownMenuItem onClick={() => openEditModal(farm)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                                        <EditIcon className="mr-2 h-4 w-4" /> Edit Farm
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(farm.farm_id)} className="text-sm font-medium text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 rounded-lg m-1">
                                                        <TrashIcon className="mr-2 h-4 w-4" /> Delete Farm
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No farms found. Add your first farm to begin.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
