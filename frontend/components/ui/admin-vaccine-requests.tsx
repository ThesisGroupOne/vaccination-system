"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";

/**
 * AdminVaccineRequests – displays all vaccine out‑of‑stock requests submitted by doctors.
 * Fetches from GET `/api/request-vaccine` (backend route).
 */
export function AdminVaccineRequests() {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/request-vaccine', {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      setRequests(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-6 border-b border-gray-50">
        <CardTitle className="text-base font-extrabold text-slate-800">Vaccine Requests (Admin)</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading} className="flex items-center gap-1">
          <RefreshCwIcon className="w-3.5 h-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && requests.length === 0 && (
          <p className="text-sm text-gray-500">No vaccine requests yet.</p>
        )}
        <ul className="space-y-3">
          {requests.map((req) => (
            <li key={req.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="font-medium text-sm text-slate-800">{req.doctorName}</p>
                  <p className="text-xs text-slate-600">
                    {req.vaccineType} – {req.quantity} dose{req.quantity > 1 ? 's' : ''}
                  </p>
                  {req.notes && <p className="text-xs text-slate-500 italic">{req.notes}</p>}
                </div>
                <p className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(req.createdAt || req.id).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
