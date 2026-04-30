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
    <Card className="rounded-2xl border-none shadow-xl bg-white overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 pt-5 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ActivityIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">My Medical Alerts</CardTitle>
              <CardDescription className="text-xs text-slate-500">Track the status of symptoms you reported.</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAlerts} className="rounded-lg h-9">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-slate-100 bg-slate-50/50">
              <TableHead className="pl-6 font-semibold">Animal</TableHead>
              <TableHead className="font-semibold">Symptoms</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right pr-6 font-semibold">Actions</TableHead>
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
                <TableRow key={alert.alert_id} className="hover:bg-slate-50/50 transition-colors border-b-slate-50">
                  <TableCell className="pl-6">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">
                        {alert.animal?.nickname || `Animal #${alert.animal_id}`}
                      </span>
                      <span className="text-[10px] text-slate-400">ID: {alert.animal_id} • {alert.animal?.animal_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 max-w-[200px] truncate block" title={alert.symptoms}>
                      {alert.symptoms}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {alert.status === 'Pending' ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Pending</Badge>
                    ) : alert.status === 'Scheduled' ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Scheduled</Badge>
                    ) : alert.status === 'Resolved' ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Resolved</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">{alert.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {alert.status === 'Pending' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => cancelAlert(alert.alert_id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg h-8 px-2"
                        title="Cancel Alert (e.g. if animal is sold/deceased)"
                      >
                        <XCircleIcon className="w-4 h-4 mr-1" />
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
