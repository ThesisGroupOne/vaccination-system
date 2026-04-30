"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2Icon, SyringeIcon, CalendarIcon, AlertCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Schedule {
    schedule_id: number;
    vaccine_id: number;
    animal_id: number;
    scheduled_date: string;
    status: string;
    animal?: { animal_id: number; nickname?: string; status: string; is_pregnant: boolean; biological_type: string };
    vaccine?: { vaccine_name: string };
}

export default function DoctorQueue() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isVaccinateModalOpen, setIsVaccinateModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
    const [dosage, setDosage] = useState('');
    const [stockId, setStockId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [availableStocks, setAvailableStocks] = useState<any[]>([]);

    const fetchSchedules = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:9999/api/schedules', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSchedules(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    const openVaccinateModal = async (schedule: Schedule) => {
        setSelectedSchedule(schedule);
        setDosage('');
        setStockId('');
        setIsVaccinateModalOpen(true);
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:9999/api/stock`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter stocks for this specific vaccine that have quantity > 0
                const validStocks = data.filter((s: any) => s.vaccine_id === schedule.vaccine_id && s.quantity_remaining > 0);
                setAvailableStocks(validStocks);
                if (validStocks.length > 0) {
                    setStockId(validStocks[0].stock_id.toString());
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleVaccinate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchedule || !dosage) return;

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            // Mock stock_id to 1 for now or fetch it. Let's pass 1 and assume backend handles it if no specific batch is selected, or we just pass a random one. Wait, vaccination needs stock_id.
            // Let's pass stock_id: 1 for simplicity in this demo.
            const payload = {
                animal_id: selectedSchedule.animal_id,
                vaccine_id: selectedSchedule.vaccine_id,
                administered_by: 1, // backend should override from token
                stock_id: parseInt(stockId), 
                dosage_ml: parseFloat(dosage),
                date_administered: new Date().toISOString()
            };

            const res = await fetch('http://localhost:9999/api/vaccinations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Mark schedule as Completed instead of deleting
                await fetch(`http://localhost:9999/api/schedules/${selectedSchedule.schedule_id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ status: 'Completed' })
                });
                
                toast.success('Vaccination executed successfully!');
                setIsVaccinateModalOpen(false);
                fetchSchedules();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to vaccinate');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="rounded-2xl border-none shadow-lg bg-background overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <SyringeIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800">Vaccination Queue</CardTitle>
                        <CardDescription className="text-xs">Scheduled vaccinations waiting for execution.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2Icon className="h-8 w-8 animate-spin mx-auto text-indigo-500 opacity-50" />
                    </div>
                ) : schedules.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {schedules.map((schedule) => {
                            const isSoldOrDeceased = schedule.animal?.status === 'Sold' || schedule.animal?.status === 'Deceased';
                            const isPregnant = schedule.animal?.is_pregnant;
                            const canVaccinate = !isSoldOrDeceased && !isPregnant;

                            return (
                                <div key={schedule.schedule_id} className={`p-5 flex items-center justify-between gap-4 ${isSoldOrDeceased ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'} transition-colors`}>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className={`font-bold ${isSoldOrDeceased ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                                Animal #{schedule.animal?.animal_id} ({schedule.animal?.nickname || 'Unnamed'})
                                            </h4>
                                            {schedule.status === 'Completed' ? (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">Completed</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px]">Pending</Badge>
                                            )}
                                            {isSoldOrDeceased && (
                                                <Badge variant="destructive" className="bg-red-500 text-white text-[10px]">{schedule.animal?.status}</Badge>
                                            )}
                                            {isPregnant && (
                                                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 text-[10px]">Pregnant (Do not vaccinate)</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-slate-600">
                                            Vaccine: <span className="text-indigo-600">{schedule.vaccine?.vaccine_name}</span>
                                        </p>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <CalendarIcon className="h-3 w-3" />
                                            {new Date(schedule.scheduled_date).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        {schedule.status === 'Completed' ? (
                                            <Button size="sm" variant="outline" disabled className="rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700">
                                                Completed
                                            </Button>
                                        ) : canVaccinate ? (
                                            <Button
                                                size="sm"
                                                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                                                onClick={() => openVaccinateModal(schedule)}
                                            >
                                                Vaccinate Now
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" disabled className="rounded-lg">
                                                Unavailable
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <AlertCircleIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-600">No animals in queue.</p>
                    </div>
                )}
            </CardContent>

            <Dialog open={isVaccinateModalOpen} onOpenChange={setIsVaccinateModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl">
                    <form onSubmit={handleVaccinate}>
                        <DialogHeader>
                            <DialogTitle>Execute Vaccination</DialogTitle>
                            <DialogDescription>
                                Administering {selectedSchedule?.vaccine?.vaccine_name} to Animal #{selectedSchedule?.animal?.animal_id}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock_id" className="text-right">Stock Batch</Label>
                                <div className="col-span-3">
                                    {availableStocks.length > 0 ? (
                                        <select 
                                            id="stock_id"
                                            required 
                                            className="w-full rounded-lg bg-muted/20 border border-slate-200 h-10 px-3" 
                                            value={stockId} 
                                            onChange={(e) => setStockId(e.target.value)}
                                        >
                                            {availableStocks.map(s => (
                                                <option key={s.stock_id} value={s.stock_id}>
                                                    Batch #{s.batch_number} ({s.quantity_remaining} remaining)
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                                            No stock available for this vaccine. Please add stock in Inventory.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dosage" className="text-right">Dosage (ml)</Label>
                                <Input id="dosage" type="number" step="0.1" required className="col-span-3 rounded-lg bg-muted/20" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 2.5" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSaving || availableStocks.length === 0} className="rounded-xl shadow-md bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isSaving ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Confirm & Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
