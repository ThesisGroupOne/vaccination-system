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
        <Card className="rounded-2xl border-[#2FA4D7]/20 shadow-lg bg-background overflow-hidden border-2">
            <CardHeader className="bg-[#2FA4D7]/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2FA4D7] text-white flex items-center justify-center shadow-lg shadow-[#2FA4D7]/30">
                        <StethoscopeIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-[#2FA4D7]">Pending Medical Alerts</CardTitle>
                        <CardDescription className="text-xs">Quickly respond to observations from the field.</CardDescription>
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
                    <div className="divide-y divide-muted/40">
                        {alerts.map((alert) => (
                            <div key={alert.alert_id} className="p-5 hover:bg-[#2FA4D7]/5 transition-colors group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Badge className="bg-[#2FA4D7] hover:bg-[#2FA4D7] text-white rounded-md uppercase text-[10px]">
                                                ID: #{alert.animal?.animal_id}
                                            </Badge>
                                            <h4 className="font-bold text-slate-800">{alert.animal?.nickname || 'Unnamed Animal'}</h4>
                                        </div>
                                        <p className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100 shadow-sm italic">
                                            &quot;{alert.symptoms}&quot;
                                        </p>
                                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <MapPinIcon className="h-3 w-3 text-[#2FA4D7]" /> {alert.farm?.farm_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ClockIcon className="h-3 w-3 text-[#2FA4D7]" /> {new Date(alert.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            size="sm"
                                            className="rounded-lg bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white shadow-md shadow-[#2FA4D7]/20 h-9 px-4"
                                            onClick={() => openScheduleModal(alert)}
                                        >
                                            Schedule Vaccination
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-9"
                                            onClick={() => handleUpdateStatus(alert.alert_id, 'Resolved')}
                                        >
                                            Resolve
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
                <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl">
                    <form onSubmit={handleSchedule}>
                        <DialogHeader>
                            <DialogTitle>Schedule Vaccination</DialogTitle>
                            <DialogDescription>
                                Schedule a vaccination for Animal #{selectedAlert?.animal?.animal_id}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="vaccine_id" className="text-right">Vaccine ID</Label>
                                <Input id="vaccine_id" type="number" required className="col-span-3 rounded-lg bg-muted/20" value={scheduleData.vaccine_id} onChange={(e) => setScheduleData({ ...scheduleData, vaccine_id: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="scheduled_date" className="text-right">Date</Label>
                                <Input id="scheduled_date" type="datetime-local" required className="col-span-3 rounded-lg bg-muted/20" value={scheduleData.scheduled_date} onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isScheduling} className="rounded-xl shadow-md bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white">
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
