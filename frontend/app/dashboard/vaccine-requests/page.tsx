"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2Icon, PlusIcon, ClipboardListIcon, CheckCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { canCreate } from '@/lib/permissions';

interface VaccineRequest {
  id: number;
  doctorName: string;
  vaccineType: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
}

export default function VaccineRequestsPage() {
  const [requests, setRequests] = useState<VaccineRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    vaccineType: '',
    quantity: '',
    notes: ''
  });

  useEffect(() => {
    setRole(localStorage.getItem('role'));
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/request-vaccine', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else {
        toast.error("Failed to fetch requests");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const doctorName = localStorage.getItem('name') || 'Unknown Doctor';
      
      const payload = {
        doctorName,
        vaccineType: formData.vaccineType,
        quantity: parseInt(formData.quantity),
        notes: formData.notes
      };

      const res = await fetch('http://localhost:9999/api/request-vaccine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Vaccine request submitted successfully");
        setIsModalOpen(false);
        setFormData({ vaccineType: '', quantity: '', notes: '' });
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(`Error: ${err.error || 'Failed to submit request'}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-2 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">Vaccine Requests</h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">
            {role === 'Doctor'
              ? 'Request additional vaccines when stock is running low.'
              : 'Review vaccine requests submitted by doctors.'}
          </p>
        </div>
        
        {/* Only Doctors request vaccines — Admin just reviews and supplies them */}
        {role === 'Doctor' && canCreate('VaccineRequests', role) && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white rounded-xl shadow-md font-semibold px-5 h-10">
                <PlusIcon className="w-4 h-4 mr-2" />
                Request Vaccine
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-6">
              <form onSubmit={handleSubmit}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-extrabold text-slate-800">New Vaccine Request</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    Submit a request to the admin for a vaccine refill.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vaccineType" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Vaccine Name/Type</Label>
                    <Input
                      id="vaccineType"
                      required
                      placeholder="e.g. PPR, Anthrax..."
                      value={formData.vaccineType}
                      onChange={e => setFormData({...formData, vaccineType: e.target.value})}
                      className="rounded-xl border-slate-200 focus-visible:ring-[#2FA4D7] h-11 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Quantity (Doses)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 50"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: e.target.value})}
                      className="rounded-xl border-slate-200 focus-visible:ring-[#2FA4D7] h-11 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Notes (Optional)</Label>
                    <textarea
                      id="notes"
                      placeholder="Reason for request..."
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2FA4D7]"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="rounded-xl border-slate-200">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white rounded-xl px-8 shadow-md">
                    {isSubmitting && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ClipboardListIcon className="w-6 h-6" />
             </div>
             <div className="flex flex-col space-y-0.5">
               <CardTitle className="text-base font-extrabold text-slate-800">Request History</CardTitle>
               <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">List of all submitted vaccine requests.</CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent border-b border-gray-50">
                <TableHead className="w-[100px] font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-11">Req ID</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Doctor Name</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Vaccine Type</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Quantity</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11 hidden md:table-cell">Notes</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11 text-right pr-6">Date Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50 text-[#2FA4D7]" />
                      <p>Loading requests...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-slate-50 transition-colors border-b border-gray-50">
                    <TableCell className="pl-6 py-4 font-bold text-slate-700 text-xs">
                      REQ-{req.id.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell className="py-4 font-bold text-slate-800 text-xs">
                      Dr. {req.doctorName.replace('Dr. ', '')}
                    </TableCell>
                    <TableCell className="py-4 font-semibold text-[#2FA4D7] text-xs">
                      {req.vaccineType}
                    </TableCell>
                    <TableCell className="py-4 font-bold text-slate-700 text-xs">
                      {req.quantity} Doses
                    </TableCell>
                    <TableCell className="py-4 text-slate-500 text-xs font-medium hidden md:table-cell">
                      {req.notes || <span className="text-slate-300 italic">No notes</span>}
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6 text-slate-500 text-xs font-semibold">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 font-medium">
                    No vaccine requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
