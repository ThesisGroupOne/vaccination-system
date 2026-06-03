"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2Icon, CheckCircleIcon, ClockIcon, MapPinIcon, StethoscopeIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Alert {
    alert_id: number;
    animal?: { animal_id: number; nickname?: string };
    farm?: { farm_name: string };
    symptoms: string;
    created_at: string;
    status: string;
}

export default function DoctorAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [scheduleData, setScheduleData] = useState({ vaccine_id: '', scheduled_date: '', schedule_type: 'Emergency' });
    const [isScheduling, setIsScheduling] = useState(false);

    const fetchAlerts = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:9999/api/alerts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.filter((a: Alert) => a.status === 'Pending'));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleUpdateStatus = async (alertId: number, status: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:9999/api/alerts/${alertId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success(`Alert marked as ${status}`);
                fetchAlerts();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const openScheduleModal = (alert: Alert) => {
        setSelectedAlert(alert);
        setScheduleData({ vaccine_id: '', scheduled_date: '', schedule_type: 'Emergency' });
        setIsScheduleModalOpen(true);
    };

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAlert || !selectedAlert.animal) return;

        setIsScheduling(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:9999/api/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    vaccine_id: scheduleData.vaccine_id,
                    animal_id: selectedAlert.animal.animal_id,
                    schedule_type: scheduleData.schedule_type,
                    scheduled_date: scheduleData.scheduled_date
                })
            });

            if (res.ok) {
                await fetch(`http://localhost:9999/api/alerts/${selectedAlert.alert_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ status: 'Scheduled' })
                });

                toast.success('Vaccination Scheduled');
                setIsScheduleModalOpen(false);
                fetchAlerts();
            } else {
                toast.error('Failed to create schedule');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred');
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <StethoscopeIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col space-y-0.5">
                        <CardTitle className="text-base font-extrabold text-slate-800">Pending Medical Alerts</CardTitle>
                        <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">Quickly respond to observations from the field.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2Icon className="h-8 w-8 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                        <p className="text-sm text-muted-foreground mt-2">Checking for new alerts...</p>
                    </div>
                ) : alerts.length > 0 ? (
                    <div className="flex flex-col">
                        {alerts.map((alert) => (
                            <div key={alert.alert_id} className="p-6 hover:bg-slate-50 transition-colors group border-b border-gray-50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="bg-rose-50 hover:bg-rose-50 text-rose-600 border-rose-200 rounded-full font-bold px-2 py-0.5 uppercase tracking-wider text-[10px]">
                                                ID: #{alert.animal?.animal_id}
                                            </Badge>
                                            <h4 className="font-extrabold text-slate-800 text-sm">{alert.animal?.nickname || 'Unnamed Animal'}</h4>
                                        </div>
                                        <p className="text-xs text-slate-600 bg-gray-50/50 p-4 rounded-xl border border-gray-100 italic font-medium">
                                            &quot;{alert.symptoms}&quot;
                                        </p>
                                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            <span className="flex items-center gap-1.5">
                                                <MapPinIcon className="h-3 w-3 text-rose-500" /> {alert.farm?.farm_name}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <ClockIcon className="h-3 w-3 text-rose-500" /> {new Date(alert.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            size="sm"
                                            className="rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm font-semibold h-9 px-4 text-xs"
                                            onClick={() => openScheduleModal(alert)}
                                        >
                                            Schedule Vaccine
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-9 font-semibold text-xs"
                                            onClick={() => handleUpdateStatus(alert.alert_id, 'Resolved')}
                                        >
                                            Mark Resolved
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <CheckCircleIcon className="h-10 w-10 text-green-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-600">No pending alerts!</p>
                        <p className="text-xs text-muted-foreground mt-1">All animals are healthy.</p>
                    </div>
                )}
            </CardContent>
            <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
                    <form onSubmit={handleSchedule}>
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl font-extrabold text-slate-800">Schedule Vaccination</DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium">
                                Schedule a vaccination for Animal #{selectedAlert?.animal?.animal_id}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="vaccine_id" className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Vaccine ID</Label>
                                <Input id="vaccine_id" type="number" required className="col-span-3 rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-blue-500" value={scheduleData.vaccine_id} onChange={(e) => setScheduleData({ ...scheduleData, vaccine_id: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="scheduled_date" className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Date</Label>
                                <Input id="scheduled_date" type="datetime-local" required className="col-span-3 rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-blue-500" value={scheduleData.scheduled_date} onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsScheduleModalOpen(false)} className="rounded-xl text-xs font-semibold">Cancel</Button>
                            <Button type="submit" disabled={isScheduling} className="rounded-xl shadow-md bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm h-11 px-6">
                                {isScheduling ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Schedule
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
