"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusIcon, Loader2Icon, SyringeIcon, CalendarIcon, InfoIcon } from 'lucide-react';
import { toast } from 'sonner';

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

    useEffect(() => {
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

    return (
        <Card className="rounded-2xl border-muted/60 shadow-xs bg-background overflow-hidden font-inter">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-muted/40 bg-muted/10 pb-4 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2FA4D7]/10 text-[#2FA4D7] flex items-center justify-center">
                        <SyringeIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold">Vaccine Master List</CardTitle>
                        <CardDescription className="text-xs">Database of approved vaccine types and protocols.</CardDescription>
                    </div>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="rounded-xl bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white">
                            <PlusIcon className="w-4 h-4 mr-2" />
                            New Vaccine
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] rounded-2xl border-none shadow-2xl">
                        <form onSubmit={handleSave}>
                            <DialogHeader>
                                <DialogTitle>Register New Vaccine</DialogTitle>
                                <DialogDescription>Define a new vaccine and its administration protocol.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 font-inter">
                                <div className="space-y-2">
                                    <Label htmlFor="vaccine_name">Vaccine Name</Label>
                                    <Input id="vaccine_name" required value={formData.vaccine_name} onChange={e => setFormData({ ...formData, vaccine_name: e.target.value })} placeholder="e.g. Foot and Mouth Disease" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Short purpose of the vaccine" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="validity">Validity (Days)</Label>
                                        <Input id="validity" type="number" required value={formData.validity_period_days} onChange={e => setFormData({ ...formData, validity_period_days: e.target.value })} placeholder="365" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="interval">Interval (Days)</Label>
                                        <Input id="interval" type="number" required value={formData.recommended_interval_days} onChange={e => setFormData({ ...formData, recommended_interval_days: e.target.value })} placeholder="180" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-[#2FA4D7] text-white">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Vaccine
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-muted/40">
                            <TableHead className="pl-6 h-12">Vaccine Name</TableHead>
                            <TableHead className="h-12">Description</TableHead>
                            <TableHead className="h-12 text-center">Validity</TableHead>
                            <TableHead className="h-12 text-center">Interval</TableHead>
                            <TableHead className="h-12 text-right pr-6">Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                                </TableCell>
                            </TableRow>
                        ) : vaccines.length > 0 ? (
                            vaccines.map((v) => (
                                <TableRow key={v.vaccine_id} className="hover:bg-muted/30 transition-colors border-b-muted/30">
                                    <TableCell className="pl-6 font-semibold text-slate-800">{v.vaccine_name}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                        {v.description || 'No description'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                            <CalendarIcon className="h-3 w-3" />
                                            {v.validity_period_days} Days
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-xs font-medium px-2 py-1 bg-green-50 text-green-600 rounded-lg border border-green-100">
                                            <InfoIcon className="h-3 w-3" />
                                            {v.recommended_interval_days} Days
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 text-muted-foreground text-[10px]">
                                        {new Date(v.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
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
