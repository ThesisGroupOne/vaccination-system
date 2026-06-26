"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ActivityIcon, SearchIcon, Loader2Icon, ChevronLeftIcon, ChevronRightIcon, 
  PlusCircleIcon, EditIcon, TrashIcon, LogInIcon, LogOutIcon, SyringeIcon, 
  RefreshCwIcon, FilterIcon, BarChart3Icon, ClockIcon, UserIcon, LayersIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  id: number;
  action: string;
  entity: string;
  entity_id: number | null;
  description: string;
  user_id: number | null;
  user_name: string | null;
  user_role: string | null;
  ip_address: string | null;
  created_at: string;
}

interface Stats {
  totalToday: number;
  totalAll: number;
  byAction: { action: string; count: number }[];
  byEntity: { entity: string; count: number }[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <PlusCircleIcon className="w-4 h-4" />,
  UPDATE: <EditIcon className="w-4 h-4" />,
  DELETE: <TrashIcon className="w-4 h-4" />,
  LOGIN: <LogInIcon className="w-4 h-4" />,
  LOGOUT: <LogOutIcon className="w-4 h-4" />,
  VACCINATE: <SyringeIcon className="w-4 h-4" />,
  STATUS_CHANGE: <RefreshCwIcon className="w-4 h-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-600 border-blue-200',
  DELETE: 'bg-rose-50 text-rose-600 border-rose-200',
  LOGIN: 'bg-violet-50 text-violet-600 border-violet-200',
  LOGOUT: 'bg-slate-50 text-slate-500 border-slate-200',
  VACCINATE: 'bg-amber-50 text-amber-600 border-amber-200',
  STATUS_CHANGE: 'bg-cyan-50 text-cyan-600 border-cyan-200',
};

const ENTITY_COLORS: Record<string, string> = {
  Animal: 'bg-blue-100 text-blue-700',
  Vaccine: 'bg-purple-100 text-purple-700',
  Stock: 'bg-orange-100 text-orange-700',
  User: 'bg-green-100 text-green-700',
  Farm: 'bg-yellow-100 text-yellow-700',
  Vaccination: 'bg-red-100 text-red-700',
  Schedule: 'bg-indigo-100 text-indigo-700',
  Alert: 'bg-pink-100 text-pink-700',
};

export default function ActivityLogsTable() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { toast.error('Please log in.'); setIsLoading(false); return; }

      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (filterAction !== 'all') params.set('action', filterAction);
      if (filterEntity !== 'all') params.set('entity', filterEntity);

      const res = await fetch(`http://localhost:9999/api/activity-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        toast.error('Failed to fetch activity logs');
      }
    } catch {
      toast.error('Network error fetching logs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('http://localhost:9999/api/activity-logs/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      console.error('Failed to fetch stats');
    }
  };

  useEffect(() => { fetchLogs(); }, [page, filterAction, filterEntity]);
  useEffect(() => { fetchStats(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ActivityIcon className="w-8 h-8 text-blue-500" />
            Activity Logs
          </h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Track all system actions and changes in real-time.</p>
        </div>
        <Button onClick={() => { fetchLogs(); fetchStats(); }} variant="outline" className="border-dashed bg-background shadow-xs hover:bg-muted/50 rounded-xl">
          <RefreshCwIcon className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                  <BarChart3Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-800">{stats.totalAll}</p>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-800">{stats.totalToday}</p>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-violet-50 to-violet-100/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-800">{stats.byAction.length}</p>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Action Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <LayersIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-800">{stats.byEntity.length}</p>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Entity Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ActivityIcon className="w-6 h-6" />
            </div>
            <div className="flex flex-col space-y-0.5">
              <CardTitle className="text-base font-extrabold text-slate-800">System Activity Timeline</CardTitle>
              <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">
                {total} total actions recorded
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mt-4 sm:mt-0 flex-wrap">
            <form onSubmit={handleSearch} className="relative group">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-blue-500" />
              <Input
                placeholder="Search logs..."
                className="pl-9 rounded-xl h-10 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-blue-500 transition-all w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
            
            <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(1); }}>
              <SelectTrigger className="rounded-xl h-10 w-[130px] text-xs font-semibold border-gray-200 bg-white">
                <FilterIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-[9999] bg-white">
                <SelectItem value="all" className="rounded-lg m-1 text-xs font-medium">All Actions</SelectItem>
                <SelectItem value="CREATE" className="rounded-lg m-1 text-xs font-medium">Create</SelectItem>
                <SelectItem value="UPDATE" className="rounded-lg m-1 text-xs font-medium">Update</SelectItem>
                <SelectItem value="DELETE" className="rounded-lg m-1 text-xs font-medium">Delete</SelectItem>
                <SelectItem value="LOGIN" className="rounded-lg m-1 text-xs font-medium">Login</SelectItem>
                <SelectItem value="STATUS_CHANGE" className="rounded-lg m-1 text-xs font-medium">Status Change</SelectItem>
                <SelectItem value="VACCINATE" className="rounded-lg m-1 text-xs font-medium">Vaccinate</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v); setPage(1); }}>
              <SelectTrigger className="rounded-xl h-10 w-[130px] text-xs font-semibold border-gray-200 bg-white">
                <LayersIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-[9999] bg-white">
                <SelectItem value="all" className="rounded-lg m-1 text-xs font-medium">All Entities</SelectItem>
                <SelectItem value="Animal" className="rounded-lg m-1 text-xs font-medium">Animal</SelectItem>
                <SelectItem value="Vaccine" className="rounded-lg m-1 text-xs font-medium">Vaccine</SelectItem>
                <SelectItem value="Stock" className="rounded-lg m-1 text-xs font-medium">Stock</SelectItem>
                <SelectItem value="User" className="rounded-lg m-1 text-xs font-medium">User</SelectItem>
                <SelectItem value="Farm" className="rounded-lg m-1 text-xs font-medium">Farm</SelectItem>
                <SelectItem value="Vaccination" className="rounded-lg m-1 text-xs font-medium">Vaccination</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent border-b border-gray-50">
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-11">Time</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Action</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Entity</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">Description</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-11">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50 text-[#2FA4D7]" />
                      <p>Loading activity logs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-gray-50">
                    <TableCell className="pl-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{formatDate(log.created_at)}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant="outline" className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${ACTION_COLORS[log.action] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        <span className="mr-1.5">{ACTION_ICONS[log.action] || <ActivityIcon className="w-3.5 h-3.5" />}</span>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border-none ${ENTITY_COLORS[log.entity] || 'bg-gray-100 text-gray-600'}`}>
                        {log.entity}
                        {log.entity_id && <span className="ml-1 opacity-70">#{log.entity_id}</span>}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 max-w-[300px]">
                      <p className="text-xs font-medium text-slate-700 truncate">{log.description}</p>
                    </TableCell>
                    <TableCell className="py-3.5">
                      {log.user_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold ring-1 ring-blue-100">
                            {log.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{log.user_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{log.user_role}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">System</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ActivityIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-sm font-medium">No activity logs found.</p>
                      <p className="text-xs text-slate-400 mt-1">Actions will appear here as they happen.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
              <p className="text-xs font-medium text-slate-500">
                Page {page} of {totalPages} · {total} total records
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg h-8 text-xs"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg h-8 text-xs"
                >
                  Next <ChevronRightIcon className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
