"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SyringeIcon, AlertCircleIcon, TrendingUpIcon, UsersIcon, MoreVerticalIcon, ClockIcon, PlusIcon, PackageIcon, ArrowRightLeftIcon, ChevronDownIcon } from "lucide-react"
import AnimalTable from "@/components/AnimalTable"
import StockTable from "@/components/StockTable"
import ReportIssueForm from "@/components/ReportIssueForm"
import DoctorAlerts from "@/components/DoctorAlerts"
import DoctorQueue from "@/components/DoctorQueue"
import FarmTable from "@/components/FarmTable"
import WorkerAlertsTable from "@/components/WorkerAlertsTable"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid } from 'recharts'
import Link from "next/link"
import { canView } from "@/lib/permissions"
import DelegateTaskModal from "@/components/DelegateTaskModal"

type VacRow = { month: string; Goat: number; Cattle: number; Camel: number; Total?: number }
type VacPeriod = 'monthly' | 'quarterly' | 'yearly'
type VacAnimal = 'All' | 'Goat' | 'Cattle' | 'Camel'

const EMPTY_VAC_CHART: VacRow[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => ({
  month,
  Goat: 0,
  Cattle: 0,
  Camel: 0,
}))

const VAC_COLORS = { Goat: '#2563eb', Cattle: '#10b981', Camel: '#f59e0b', Total: '#2563eb' }

function buildVacChart(rows: VacRow[], period: VacPeriod, animal: VacAnimal): VacRow[] {
  const withTotal = (r: VacRow): VacRow => {
    const Goat = animal === 'All' || animal === 'Goat' ? r.Goat : 0
    const Cattle = animal === 'All' || animal === 'Cattle' ? r.Cattle : 0
    const Camel = animal === 'All' || animal === 'Camel' ? r.Camel : 0
    return { month: r.month, Goat, Cattle, Camel, Total: Goat + Cattle + Camel }
  }

  const monthly = (rows.length ? rows : EMPTY_VAC_CHART).map(withTotal)

  if (period === 'monthly') return monthly

  if (period === 'quarterly') {
    const qs = [
      { month: 'Q1', i: [0, 1, 2] },
      { month: 'Q2', i: [3, 4, 5] },
      { month: 'Q3', i: [6, 7, 8] },
      { month: 'Q4', i: [9, 10, 11] },
    ]
    return qs.map(({ month, i }) => {
      const Goat = i.reduce((s, n) => s + (monthly[n]?.Goat || 0), 0)
      const Cattle = i.reduce((s, n) => s + (monthly[n]?.Cattle || 0), 0)
      const Camel = i.reduce((s, n) => s + (monthly[n]?.Camel || 0), 0)
      return { month, Goat, Cattle, Camel, Total: Goat + Cattle + Camel }
    })
  }

  const year = String(new Date().getFullYear())
  const Goat = monthly.reduce((s, r) => s + r.Goat, 0)
  const Cattle = monthly.reduce((s, r) => s + r.Cattle, 0)
  const Camel = monthly.reduce((s, r) => s + r.Camel, 0)
  return [{ month: year, Goat, Cattle, Camel, Total: Goat + Cattle + Camel }]
}

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(-1)
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false)
  const [vacPeriod, setVacPeriod] = useState<VacPeriod>('monthly')
  const [vacAnimal, setVacAnimal] = useState<VacAnimal>('All')
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [stats, setStats] = useState<any>({
    totalAnimals: 0,
    totalVaccines: 0,
    totalStaff: 0,
    medicalAlerts: 0,
    totalVaccinations: 0,
    vaccineInventory: [],
    recentActivities: [],
    chartData: [],
    vaccinationChartData: EMPTY_VAC_CHART,
    vaccinationPrevYearTotal: 0,
  });

  const vacChartData = useMemo(
    () => buildVacChart(stats.vaccinationChartData || EMPTY_VAC_CHART, vacPeriod, vacAnimal),
    [stats.vaccinationChartData, vacPeriod, vacAnimal]
  )

  const showGoat = vacAnimal === 'All' || vacAnimal === 'Goat'
  const showCattle = vacAnimal === 'All' || vacAnimal === 'Cattle'
  const showCamel = vacAnimal === 'All' || vacAnimal === 'Camel'

  useEffect(() => {
    setRole(localStorage.getItem('role'))
    setUserName(localStorage.getItem('name'))

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:9999/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          console.log("Dashboard Stats:", data);
          setStats(data);
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error("Dashboard Stats Err:", res.status, errorData);
        }
      } catch (error) {
        console.error("Dashboard Network Error:", error);
      }
    };

    fetchStats();
  }, [])

  const areaChartData = [
    { month: 'Jan', animals: 4 },
    { month: 'Feb', animals: 7 },
    { month: 'Mar', animals: 5 },
    { month: 'Apr', animals: 5 },
    { month: 'May', animals: 10 },
    { month: 'Jun', animals: 6 },
    { month: 'Jul', animals: 3 },
  ];

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8faff] min-h-screen p-4 md:p-8">
      {/* Header logic */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            {role === 'Admin' ? 'Admin Overlook' : role === 'Doctor' ? 'Veterinarian Hub' : 'Farm Station'}
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] font-bold uppercase tracking-widest py-0.5 px-2.5 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5 animate-pulse"></span>
              Real-Time
            </Badge>
          </h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Welcome back, {userName}. Here is your dashboard overview.</p>
        </div>
        <Button onClick={() => window.location.reload()} size="sm" variant="outline" className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm bg-white font-semibold px-4 py-4 text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Sync Database
        </Button>
      </div>

      {/* Top Stat Cards */}
      {canView('DashboardStats', role) && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Animals" 
            value={stats.totalAnimals.toLocaleString()} 
            icon={<PackageIcon className="w-6 h-6 text-indigo-600" />} 
            iconBgColor="bg-indigo-50" 
            trend="Active livestock" 
            trendColor="text-indigo-600" 
            sparklineColor="#4f46e5"
            sparklineData={[10, 15, 8, 20, 14, 25, 22]}
          />
          <StatCard 
            title="Vaccines in Stock" 
            value={stats.totalVaccines.toLocaleString()} 
            unit="doses" 
            icon={<SyringeIcon className="w-6 h-6 text-emerald-600" />} 
            iconBgColor="bg-emerald-50" 
            trend="Stock levels monitored" 
            trendColor="text-emerald-600"
            sparklineColor="#10b981"
            sparklineData={[30, 25, 35, 20, 40, 30, 45]}
          />
          <StatCard 
            title="Total Staff" 
            value={stats.totalStaff.toLocaleString()} 
            icon={<UsersIcon className="w-6 h-6 text-purple-600" />} 
            iconBgColor="bg-purple-50" 
            trend="Staff on duty" 
            trendColor="text-purple-600"
            sparklineColor="#a855f7"
            sparklineData={[5, 5, 6, 6, 7, 7, 8]}
          />
          <StatCard 
            title="Medical Alerts" 
            value={stats.medicalAlerts.toLocaleString()} 
            icon={<AlertCircleIcon className="w-6 h-6 text-orange-600" />} 
            iconBgColor="bg-orange-50" 
            trend="Pending observations" 
            trendColor="text-orange-600"
            sparklineColor="#f97316"
            sparklineData={[2, 1, 3, 0, 1, 4, 2]}
          />
        </div>
      )}

      {/* Doctor & Worker Widgets Section */}
      {role !== 'Admin' && (canView('DoctorWidgets', role) || canView('WorkerWidgets', role)) && (
        <div className="grid gap-6 md:grid-cols-4">
          <div className="md:col-span-1 space-y-6">
            {canView('DoctorWidgets', role) && <DoctorAlerts />}
            {canView('WorkerWidgets', role) && (
              <>
                <ReportIssueForm />
                <Card className="bg-white border-none shadow-sm p-4 rounded-xl">
                  <h4 className="font-semibold text-xs text-muted-foreground mb-2">QUICK TIPS</h4>
                  <p className="text-xs text-slate-600 italic">"Ensure the ID tag is visible before reporting symptoms for faster identification."</p>
                </Card>
              </>
            )}
            
            {canView('DoctorWidgets', role) && (
              <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Your Vaccinations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-1">{stats.totalVaccinations || 0}</div>
                  <p className="text-xs text-white/70 mb-4">Total animal doses given</p>
                  <Button 
                    variant="secondary" 
                    className="w-full bg-white/20 hover:bg-white/30 text-white border-none font-bold"
                    onClick={() => setIsDelegateModalOpen(true)}
                  >
                    <ArrowRightLeftIcon className="w-4 h-4 mr-2" />
                    Delegate Task
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="md:col-span-3 space-y-6">
            {canView('WorkerWidgets', role) && <WorkerAlertsTable />}
            {canView('DoctorWidgets', role) && <DoctorQueue />}
            {(canView('DoctorWidgets', role) || canView('WorkerWidgets', role)) && <AnimalTable />}
          </div>
        </div>
      )}

      {/* Main Admin Widgets Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mt-4">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Vaccination Activity */}
          {canView('DashboardFarms', role) && (
            <Card className="rounded-[24px] border border-slate-100/80 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] bg-white overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-2 pt-5 px-5 sm:px-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
                    <SyringeIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-[17px] font-extrabold text-blue-700 tracking-tight">
                      Vaccination Activity
                    </CardTitle>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Doses given per month by animal type (this year).
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                  <div className="inline-flex rounded-full bg-slate-100/90 p-1 border border-slate-200/80">
                    {([
                      ['monthly', 'Monthly'],
                      ['quarterly', 'Quarterly'],
                      ['yearly', 'Yearly'],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setVacPeriod(key)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                          vacPeriod === key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <select
                      value={vacAnimal}
                      onChange={(e) => setVacAnimal(e.target.value as VacAnimal)}
                      className="appearance-none w-full sm:w-auto text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-full pl-3.5 pr-8 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 cursor-pointer"
                    >
                      <option value="All">All Animal Types</option>
                      <option value="Goat">Goat</option>
                      <option value="Cattle">Cattle</option>
                      <option value="Camel">Camel</option>
                    </select>
                    <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-3 sm:px-5 pb-4 pt-0">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={vacChartData}
                      margin={{ top: 12, right: 10, left: -16, bottom: 4 }}
                      barGap={3}
                      barCategoryGap="18%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                        dy={8}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 8px 24px -8px rgba(15,23,42,0.18)',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      />
                      {showGoat && (
                        <Bar dataKey="Goat" fill={VAC_COLORS.Goat} radius={[6, 6, 0, 0]} maxBarSize={22} />
                      )}
                      {showCattle && (
                        <Bar dataKey="Cattle" fill={VAC_COLORS.Cattle} radius={[6, 6, 0, 0]} maxBarSize={22} />
                      )}
                      {showCamel && (
                        <Bar dataKey="Camel" fill={VAC_COLORS.Camel} radius={[6, 6, 0, 0]} maxBarSize={22} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Recent Activities */}
          {canView('DashboardActivities', role) && (
            <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                      <ClockIcon className="w-5 h-5" />
                   </div>
                   <CardTitle className="text-base font-extrabold text-slate-800">Recent Activities</CardTitle>
                </div>
                <button className="text-slate-300 hover:text-slate-500"><MoreVerticalIcon className="w-4 h-4" /></button>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                 <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1.5px] before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pl-6 md:pl-0 mt-2">
                    
                    {stats.recentActivities && stats.recentActivities.map((act: any) => (
                      <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className={`absolute left-[-1.5rem] md:static flex items-center justify-center w-3 h-3 rounded-full border-[2px] border-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${act.type === 'animal' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                        </div>
                        <div className="w-full md:w-[calc(50%-1.5rem)] p-0 md:p-3 rounded-xl bg-transparent">
                           <div className="flex flex-col md:flex-row md:items-center justify-between mb-0.5 gap-1">
                              <div className="font-bold text-slate-800 text-xs">{act.title}</div>
                              <time className="text-[10px] font-semibold text-slate-400">{timeAgo(act.created_at)}</time>
                           </div>
                           <div className="text-[11px] text-slate-500 font-medium">{act.description}</div>
                        </div>
                      </div>
                    ))}
                    {stats.recentActivities?.length === 0 && (
                      <div className="text-center text-xs text-slate-500 py-4">No recent activities</div>
                    )}
  
                 </div>
                 <div className="mt-6 text-center">
                    <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold rounded-xl px-5 h-9 text-xs">View All Activities</Button>
                 </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
           {/* Animals Overview Chart */}
           {canView('DashboardCharts', role) && (
             <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
               <CardHeader className="flex flex-row items-center justify-between pb-2 p-6 border-b border-gray-50">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <TrendingUpIcon className="w-5 h-5" />
                   </div>
                   <CardTitle className="text-base font-extrabold text-slate-800">Animals Overview</CardTitle>
                 </div>
                 <select 
                   className="text-xs border border-gray-200 rounded-lg text-slate-600 font-medium px-3 py-1.5 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                   value={selectedMonth}
                   onChange={(e) => setSelectedMonth(Number(e.target.value))}
                 >
                   <option value={-1}>All Months</option>
                   {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => {
                     const currentMonthIndex = new Date().getMonth();
                     return (
                       <option key={index} value={index} disabled={index > currentMonthIndex}>
                         {index === currentMonthIndex ? "This Month" : month}
                       </option>
                     )
                   })}
                 </select>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {selectedMonth === -1 ? (
                        <AreaChart data={stats.chartData?.length > 0 ? stats.chartData : areaChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorAnimals" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px -4px rgba(0,0,0,0.1)' }}
                            itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}
                          />
                          <Area type="monotone" dataKey="animals" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAnimals)" activeDot={{ r: 5, strokeWidth: 0, fill: '#3b82f6' }} />
                        </AreaChart>
                      ) : (
                        <BarChart data={(stats.chartData?.length > 0 ? stats.chartData : areaChartData).filter((d: any) => monthNamesShort.indexOf(d.month) === selectedMonth)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barSize={40}>
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} />
                          <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px -4px rgba(0,0,0,0.1)' }}
                            itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}
                          />
                          <Bar dataKey="animals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
               </CardContent>
             </Card>
           )}
           
           {/* Vaccine Inventory */}
           {canView('DashboardInventory', role) && (
             <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
               <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-50 p-6">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <SyringeIcon className="w-6 h-6" />
                   </div>
                   <div>
                      <CardTitle className="text-base font-extrabold text-slate-800">Vaccine Inventory</CardTitle>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Real-time tracking of vaccine doses and shelf life.</p>
                   </div>
                 </div>
                 <Button size="sm" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg shadow-sm font-semibold px-4 h-9">
                   <PlusIcon className="w-4 h-4 mr-1.5" /> Add Stock
                 </Button>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="p-3 border-b border-gray-50 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-6">
                    <span className="flex-[2]">Vaccine & Batch</span>
                    <span className="flex-1">Supplier</span>
                    <span className="flex-1 text-center">Remaining</span>
                    <span className="flex-1 text-right">Expiry</span>
                    <span className="w-8"></span>
                 </div>
                 
                 <div className="divide-y divide-gray-50">
                   {stats.vaccineInventory && stats.vaccineInventory.map((stock: any) => (
                     <div key={stock.stock_id} className="flex justify-between items-center p-3 px-6 hover:bg-slate-50 transition-colors">
                        <div className="flex-[2] flex flex-col">
                          <span className="font-bold text-slate-800 text-xs">{stock.vaccine?.vaccine_name} - Batch {stock.batch_number || 'N/A'}</span>
                        </div>
                        <span className="flex-1 text-xs text-slate-500 font-medium truncate pr-2">{stock.supplier_name || 'Unknown'}</span>
                        <span className="flex-1 text-center text-xs font-bold">
                          <span className={stock.quantity_remaining > 20 ? "text-emerald-600" : "text-orange-500"}>{stock.quantity_remaining}</span> 
                          <span className="text-slate-400 font-normal">/{stock.quantity_purchased}</span>
                        </span>
                        <span className="flex-1 text-right text-xs text-slate-500 font-medium">{new Date(stock.expiry_date).toLocaleDateString()}</span>
                        <span className="w-8 text-right"><button className="text-slate-300 hover:text-slate-500"><MoreVerticalIcon className="w-4 h-4" /></button></span>
                     </div>
                   ))}
                   {stats.vaccineInventory?.length === 0 && (
                     <div className="p-4 text-center text-xs text-slate-500">No stock available</div>
                   )}
                 </div>
  
                  <div className="p-4 text-center bg-gray-50/50">
                    <Link href="/dashboard/stock">
                      <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-semibold rounded-xl px-5 h-9 text-xs">View All Stock</Button>
                    </Link>
                 </div>
               </CardContent>
             </Card>
           )}
        </div>
      </div>

      <DelegateTaskModal
        open={isDelegateModalOpen}
        onClose={() => setIsDelegateModalOpen(false)}
        schedule={null}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )

  return renderDashboard()
}

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  trend?: string;
  trendColor?: string;
  sparklineColor?: string;
  sparklineData?: number[];
}

function StatCard({ title, value, unit, icon, iconBgColor, trend, trendColor, sparklineColor, sparklineData }: StatCardProps) {
  // convert sparklineData array to array of objects for recharts
  const chartData = sparklineData?.map((val, index) => ({ value: val, index }));

  return (
    <Card className="rounded-[20px] border border-slate-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] bg-white hover:shadow-[0_8px_25px_rgb(0,0,0,0.06)] transition-all duration-300 h-[125px] p-5 overflow-hidden relative">
      <div className="flex items-start justify-between relative z-10 w-full">
        
        {/* Horizontal Layout for Icon and Text */}
        <div className="flex items-start gap-4 overflow-hidden w-full">
          <div className={`w-11 h-11 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <div className="flex flex-col pt-0.5 overflow-hidden w-full">
            <p className="text-[12px] font-bold text-slate-500 mb-0.5 truncate whitespace-nowrap">{title}</p>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-1 truncate whitespace-nowrap">
              {value} {unit && <span className="text-[10px] font-semibold text-slate-400 ml-1 tracking-normal">{unit}</span>}
            </div>
            {trend && (
              <p className={`text-[10px] ${trendColor} font-bold truncate whitespace-nowrap`}>
                {trend}
              </p>
            )}
          </div>
        </div>

        <button className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 pl-2">
           <MoreVerticalIcon className="w-4 h-4" />
        </button>
      </div>

      {sparklineData && sparklineColor && (
        <div className="absolute bottom-0 left-0 right-0 w-full h-[40px] opacity-70">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={chartData}>
               <YAxis domain={['dataMin - 5', 'dataMax + 10']} hide />
               <Line type="monotone" dataKey="value" stroke={sparklineColor} strokeWidth={2.5} dot={false} isAnimationActive={false} />
             </LineChart>
           </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
