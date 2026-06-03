"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2Icon, ActivityIcon, XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Alert {
  alert_id: number;
  animal_id: number;
  farm_id: number;
  symptoms: string;
  status: string;
  created_at: string;
  animal?: {
    nickname: string;
    animal_type: string;
    status: string;
  };
}

export default function WorkerAlertsTable() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Ideally, the backend filters by user_id, but here we just fetch all or filter on frontend for demo
      const res = await fetch('http://localhost:9999/api/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Just show all alerts, or we could filter if needed
        setAlerts(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAlert = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this alert?")) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:9999/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      
      if (res.ok) {
        toast.success("Alert cancelled successfully");
        fetchAlerts();
      } else {
        toast.error("Failed to cancel alert");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ActivityIcon className="w-6 h-6" />
            </div>
            <div className="flex flex-col space-y-0.5">
              <CardTitle className="text-base font-extrabold text-slate-800">My Medical Alerts</CardTitle>
              <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">Track the status of symptoms you reported.</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAlerts} className="rounded-lg h-9 text-xs font-semibold border-gray-200">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="hover:bg-transparent border-b border-gray-50">
              <TableHead className="pl-6 h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Animal</TableHead>
              <TableHead className="h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Symptoms</TableHead>
              <TableHead className="h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Date</TableHead>
              <TableHead className="h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-right pr-6 h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-emerald-600 opacity-50" />
                </TableCell>
              </TableRow>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => (
                <TableRow key={alert.alert_id} className="hover:bg-slate-50 transition-colors border-b border-gray-50 group">
                  <TableCell className="pl-6 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">
                        {alert.animal?.nickname || `Animal #${alert.animal_id}`}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">ID: {alert.animal_id} • {alert.animal?.animal_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-xs text-slate-600 font-medium max-w-[200px] truncate block" title={alert.symptoms}>
                      {alert.symptoms}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-500 py-3">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3">
                    {alert.status === 'Pending' ? (
                      <Badge variant="outline" className="rounded-full font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider bg-orange-50 text-orange-600 border-orange-200">Pending</Badge>
                    ) : alert.status === 'Scheduled' ? (
                      <Badge variant="outline" className="rounded-full font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider bg-blue-50 text-blue-600 border-blue-200">Scheduled</Badge>
                    ) : alert.status === 'Resolved' ? (
                      <Badge variant="outline" className="rounded-full font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-600 border-emerald-200">Resolved</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider bg-slate-50 text-slate-600 border-slate-200">{alert.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6 py-3">
                    {alert.status === 'Pending' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => cancelAlert(alert.alert_id)}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg h-8 px-2 font-semibold text-[11px]"
                        title="Cancel Alert (e.g. if animal is sold/deceased)"
                      >
                        <XCircleIcon className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500 text-sm">
                  No alerts submitted yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
