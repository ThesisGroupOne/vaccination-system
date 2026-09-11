"use client"

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { PlusIcon, Loader2Icon, MapPinIcon, WarehouseIcon, EditIcon, TrashIcon, MoreHorizontalIcon, PawPrintIcon, SearchIcon, ArrowUpDownIcon, Columns3Icon, ChevronDownIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { toast } from 'sonner';
import { canEdit, canDelete } from '@/lib/permissions';

interface FarmAnimal {
    animal_id: number;
    nickname?: string | null;
    animal_type: string;
    biological_type?: string | null;
    age: number;
    status: string;
    created_at: string;
}

interface Farm {
    farm_id: number;
    farm_name: string;
    location: string;
    created_at: string;
    animals?: FarmAnimal[];
}

const formatAnimalID = (type: string, id: number) => {
    if (type === 'Goat') return `GT-${id}`;
    if (type === 'Cattle') return `CT-${id}`;
    if (type === 'Camel') return `CM-${id}`;
    if (type === 'Sheep') return `SH-${id}`;
    return `ID-${id}`;
};

// DB stores age in years (float): < 1 year shows months, otherwise years
const formatAge = (ageYears: number) => {
    if (!ageYears || ageYears <= 0) return '—';
    if (ageYears < 1) return `${Math.round(ageYears * 12)} month${Math.round(ageYears * 12) === 1 ? '' : 's'}`;
    const rounded = Number.isInteger(ageYears) ? ageYears : Number(ageYears.toFixed(1));
    return `${rounded} year${rounded === 1 ? '' : 's'}`;
};

const statusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'sold') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'deceased') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
};

export default function FarmTable() {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingFarmId, setEditingFarmId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [animalsFarm, setAnimalsFarm] = useState<Farm | null>(null);
    const [animalSearch, setAnimalSearch] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'location' | 'animals' | 'created'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [visibleCols, setVisibleCols] = useState({
        name: true,
        location: true,
        animals: true,
        created: true,
    });

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

    const displayedFarms = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = farms.filter((f) => {
            if (!q) return true;
            return (
                f.farm_name.toLowerCase().includes(q) ||
                f.location.toLowerCase().includes(q)
            );
        });
        list = [...list].sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'name') cmp = a.farm_name.localeCompare(b.farm_name);
            else if (sortBy === 'location') cmp = a.location.localeCompare(b.location);
            else if (sortBy === 'animals') cmp = (a.animals?.length || 0) - (b.animals?.length || 0);
            else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [farms, searchQuery, sortBy, sortDir]);

    const totalPages = Math.max(1, Math.ceil(displayedFarms.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pagedFarms = displayedFarms.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const startItem = displayedFarms.length ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = Math.min(currentPage * pageSize, displayedFarms.length);

    const colCount = 1 + Number(visibleCols.name) + Number(visibleCols.location) + Number(visibleCols.animals) + Number(visibleCols.created);

    const toggleSort = (key: typeof sortBy) => {
        if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortBy(key); setSortDir('asc'); }
    };

    useEffect(() => {
        setPage(1);
    }, [searchQuery, sortBy, sortDir, pageSize]);

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
                            <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">Manage livestock vaccination farm units and centers.</CardDescription>
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

            <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-50/40">
                <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search farms..."
                        className="pl-9 h-9 rounded-xl bg-white border-slate-200 text-xs font-medium focus-visible:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 text-xs font-semibold">
                                <ArrowUpDownIcon className="w-3.5 h-3.5 mr-1.5" />
                                Sort by
                                <ChevronDownIcon className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl border-slate-200 shadow-lg">
                            {([
                                ['name', 'Farm Name'],
                                ['location', 'Location'],
                                ['animals', 'Animals'],
                                ['created', 'Created'],
                            ] as const).map(([key, label]) => (
                                <DropdownMenuItem
                                    key={key}
                                    className="cursor-pointer text-xs font-medium rounded-lg m-1"
                                    onClick={() => toggleSort(key)}
                                >
                                    {label}
                                    {sortBy === key && <span className="ml-auto text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 text-xs font-semibold">
                                <Columns3Icon className="w-3.5 h-3.5 mr-1.5" />
                                Columns
                                <ChevronDownIcon className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl border-slate-200 shadow-lg">
                            {([
                                ['name', 'Farm Name'],
                                ['location', 'Location'],
                                ['animals', 'Animals'],
                                ['created', 'Created'],
                            ] as const).map(([key, label]) => (
                                <DropdownMenuCheckboxItem
                                    key={key}
                                    checked={visibleCols[key]}
                                    onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, [key]: !!v }))}
                                    className="text-xs font-medium capitalize"
                                >
                                    {label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-b border-gray-50">
                            {visibleCols.name && (
                                <TableHead className="w-[200px] font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-11 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                                    Farm Name {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                                </TableHead>
                            )}
                            {visibleCols.location && (
                                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11 cursor-pointer select-none" onClick={() => toggleSort('location')}>
                                    Location {sortBy === 'location' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                                </TableHead>
                            )}
                            {visibleCols.animals && (
                                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11 text-center cursor-pointer select-none" onClick={() => toggleSort('animals')}>
                                    Animals {sortBy === 'animals' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                                </TableHead>
                            )}
                            {visibleCols.created && (
                                <TableHead className="text-right h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest cursor-pointer select-none" onClick={() => toggleSort('created')}>
                                    Created {sortBy === 'created' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                                </TableHead>
                            )}
                            <TableHead className="text-right pr-6 h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={colCount} className="h-32 text-center">
                                    <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                                </TableCell>
                            </TableRow>
                        ) : displayedFarms.length > 0 ? (
                            pagedFarms.map((farm) => (
                                <TableRow key={farm.farm_id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 group h-[88px]">
                                    {visibleCols.name && (
                                        <TableCell className="pl-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                                    <WarehouseIcon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-extrabold text-slate-800 text-[15px] truncate">{farm.farm_name}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    )}
                                    {visibleCols.location && (
                                        <TableCell className="py-5">
                                            <div className="flex items-start gap-2.5 text-slate-600">
                                                <MapPinIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-700 truncate">{farm.location}</p>
                                                    <p className="text-xs text-slate-400 font-medium">Somalia</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    )}
                                    {visibleCols.animals && (
                                        <TableCell className="text-center py-5">
                                            <button
                                                type="button"
                                                onClick={() => { setAnimalSearch(''); setAnimalsFarm(farm); }}
                                                title={`View animals in ${farm.farm_name}`}
                                                className="inline-flex items-center gap-2 font-extrabold text-blue-600 bg-blue-50/90 border border-blue-100 px-4 py-2 rounded-full text-sm cursor-pointer hover:bg-blue-100 hover:border-blue-200 hover:shadow-sm transition-all"
                                            >
                                                <PawPrintIcon className="w-4 h-4" />
                                                {farm.animals?.length || 0}
                                            </button>
                                        </TableCell>
                                    )}
                                    {visibleCols.created && (
                                        <TableCell className="py-5">
                                            <div className="flex items-start justify-end gap-2.5">
                                                <CalendarIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-slate-700">
                                                        {new Date(farm.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        {new Date(farm.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right pr-6 py-5">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-2xl border border-slate-100 shadow-sm">
                                                    <MoreHorizontalIcon className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 bg-white border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] rounded-xl">
                                                <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-slate-100" />
                                                <DropdownMenuItem onClick={() => { setAnimalSearch(''); setAnimalsFarm(farm); }} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                                    <PawPrintIcon className="mr-2 h-4 w-4" /> View Animals
                                                </DropdownMenuItem>
                                                {canEdit('Farms', role) && (
                                                    <DropdownMenuItem onClick={() => openEditModal(farm)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                                        <EditIcon className="mr-2 h-4 w-4" /> Edit Farm
                                                    </DropdownMenuItem>
                                                )}
                                                {canDelete('Farms', role) && (
                                                    <DropdownMenuItem onClick={() => handleDelete(farm.farm_id)} className="text-sm font-medium text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 rounded-lg m-1">
                                                        <TrashIcon className="mr-2 h-4 w-4" /> Delete Farm
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={colCount} className="h-32 text-center text-muted-foreground">
                                    {searchQuery.trim() ? 'No farms match your search.' : 'No farms found. Add your first farm to begin.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-slate-500 font-medium">
                        Showing {startItem} to {endItem} of {displayedFarms.length} results
                    </p>
                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white text-slate-700 font-semibold px-4">
                                    {pageSize} / page
                                    <ChevronDownIcon className="w-4 h-4 ml-2 text-slate-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-lg">
                                {[10, 20, 50].map((size) => (
                                    <DropdownMenuItem key={size} onClick={() => setPageSize(size)} className="cursor-pointer">
                                        {size} / page
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={currentPage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="h-11 w-11 rounded-2xl border-slate-200 text-slate-500"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <div className="h-11 min-w-[44px] px-4 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-lg shadow-blue-600/20">
                                {currentPage}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={currentPage >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="h-11 w-11 rounded-2xl border-slate-200 text-slate-500"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Farm Animals Modal */}
            <Dialog open={!!animalsFarm} onOpenChange={(open) => { if (!open) setAnimalsFarm(null); }}>
                <DialogContent className="sm:max-w-[640px] rounded-[24px] border-none shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] bg-white p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 px-6 pt-6 pb-4 border-b border-slate-100">
                        <DialogHeader className="text-left space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-100 text-blue-600 flex items-center justify-center">
                                    <PawPrintIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-extrabold tracking-tight text-slate-900">
                                        {animalsFarm?.farm_name}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 font-medium">
                                        <span className="font-bold text-blue-600">{animalsFarm?.animals?.length || 0}</span> animal{(animalsFarm?.animals?.length || 0) === 1 ? '' : 's'} registered · {animalsFarm?.location}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="relative mt-4">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                value={animalSearch}
                                onChange={e => setAnimalSearch(e.target.value)}
                                placeholder="Search by name, type or ID..."
                                className="pl-9 h-10 rounded-xl bg-white border-slate-200 text-xs font-medium focus-visible:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                        {(() => {
                            const list = (animalsFarm?.animals || []).filter(a => {
                                if (!animalSearch.trim()) return true;
                                const q = animalSearch.trim().toLowerCase();
                                return (
                                    (a.nickname || '').toLowerCase().includes(q) ||
                                    a.animal_type.toLowerCase().includes(q) ||
                                    formatAnimalID(a.animal_type, a.animal_id).toLowerCase().includes(q)
                                );
                            });
                            if (!list.length) {
                                return (
                                    <div className="py-12 text-center text-sm text-slate-400 font-medium">
                                        {animalsFarm?.animals?.length ? 'No animals match your search.' : 'No animals registered on this farm yet.'}
                                    </div>
                                );
                            }
                            return (
                                <Table>
                                    <TableHeader className="bg-slate-50/70 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                                            <TableHead className="pl-6 h-10 font-bold text-[10px] text-slate-400 uppercase tracking-widest">ID</TableHead>
                                            <TableHead className="h-10 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Nickname & Type</TableHead>
                                            <TableHead className="h-10 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Age</TableHead>
                                            <TableHead className="h-10 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Status</TableHead>
                                            <TableHead className="pr-6 h-10 text-right font-bold text-[10px] text-slate-400 uppercase tracking-widest">Registered</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {list.map(a => (
                                            <TableRow key={a.animal_id} className="hover:bg-slate-50/60 border-b border-slate-50">
                                                <TableCell className="pl-6 py-2.5 font-bold text-blue-600 text-xs">
                                                    {formatAnimalID(a.animal_type, a.animal_id)}
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700">{a.nickname?.trim() || '—'}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{a.animal_type}{a.biological_type ? ` · ${a.biological_type}` : ''}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-xs font-semibold text-slate-600">
                                                    {formatAge(a.age)}
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <span className={`inline-flex items-center border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(a.status)}`}>
                                                        {a.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="pr-6 py-2.5 text-right text-[11px] font-bold text-slate-500">
                                                    {new Date(a.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            );
                        })()}
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAnimalsFarm(null)}
                            className="rounded-xl h-10 px-6 border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
