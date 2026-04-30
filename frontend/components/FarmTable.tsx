"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusIcon, Loader2Icon, MapPinIcon, WarehouseIcon } from 'lucide-react';
import { toast } from 'sonner';

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

    useEffect(() => {
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

    return (
        <Card className="rounded-2xl border-muted/60 shadow-xs bg-background overflow-hidden font-inter">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-muted/40 bg-muted/10 pb-4 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2FA4D7]/10 text-[#2FA4D7] flex items-center justify-center">
                        <WarehouseIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold">Farm Locations</CardTitle>
                        <CardDescription className="text-xs">Manage Mumin Group farm units and centers.</CardDescription>
                    </div>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="rounded-xl bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white">
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Farm
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px] rounded-2xl">
                        <form onSubmit={handleSave}>
                            <DialogHeader>
                                <DialogTitle>Create New Farm</DialogTitle>
                                <DialogDescription>Add a new farm location to the system.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="farm_name">Farm Name</Label>
                                    <Input id="farm_name" required value={formData.farm_name} onChange={e => setFormData({ ...formData, farm_name: e.target.value })} placeholder="e.g. Afgooye Farm" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input id="location" required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Lower Shabelle" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-[#2FA4D7] text-white">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Farm
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-muted/40 text-[11px] uppercase tracking-wider">
                            <TableHead className="pl-6 h-10">Farm Name</TableHead>
                            <TableHead className="h-10">Location</TableHead>
                            <TableHead className="h-10 text-center">Animals</TableHead>
                            <TableHead className="h-10 text-right pr-6">Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center">
                                    <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                                </TableCell>
                            </TableRow>
                        ) : farms.length > 0 ? (
                            farms.map((farm) => (
                                <TableRow key={farm.farm_id} className="hover:bg-muted/30 transition-colors border-b-muted/30">
                                    <TableCell className="pl-6 font-semibold text-slate-800">{farm.farm_name}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        <div className="flex items-center gap-1">
                                            <MapPinIcon className="h-3 w-3 text-[#2FA4D7]" />
                                            {farm.location}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="font-bold text-[#2FA4D7] bg-[#2FA4D7]/5 px-2 py-0.5 rounded-md border border-[#2FA4D7]/10 text-xs">
                                            {farm.animals?.length || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 text-muted-foreground text-[10px]">
                                        {new Date(farm.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
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
