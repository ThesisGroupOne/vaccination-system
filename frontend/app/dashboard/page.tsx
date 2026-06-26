"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HexagonIcon, SyringeIcon, AlertCircleIcon, TrendingUpIcon, UsersIcon, MoreVerticalIcon, ClockIcon, PlusIcon, PackageIcon } from "lucide-react"
import AnimalTable from "@/components/AnimalTable"
import StockTable from "@/components/StockTable"
import ReportIssueForm from "@/components/ReportIssueForm"
import DoctorAlerts from "@/components/DoctorAlerts"
import DoctorQueue from "@/components/DoctorQueue"
import FarmTable from "@/components/FarmTable"
import WorkerAlertsTable from "@/components/WorkerAlertsTable"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts'
import Link from "next/link"

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(-1)
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [stats, setStats] = useState<any>({
    totalAnimals: 0,
    totalVaccines: 0,
    totalStaff: 0,
    medicalAlerts: 0,
    totalVaccinations: 0,
    farms: [],
    vaccineInventory: [],
    recentActivities: [],
    chartData: []
  });

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

  const renderAdminDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8faff] min-h-screen p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            Admin Overlook
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] font-bold uppercase tracking-widest py-0.5 px-2.5 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5 animate-pulse"></span>
              Real-Time
            </Badge>
          </h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Welcome back, {userName}. Here&apos;s the state of Mumin Group Farms.</p>
        </div>
        <Button onClick={() => window.location.reload()} size="sm" variant="outline" className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm bg-white font-semibold px-4 py-4 text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Sync Database
        </Button>
      </div>

      {/* Top Stat Cards */}
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



      <div className="grid gap-6 lg:grid-cols-2 mt-4">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Farm Locations */}
          <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-50 p-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <HexagonIcon className="w-6 h-6" />
                 </div>
                 <div>
                    <CardTitle className="text-base font-extrabold text-slate-800">Farm Locations</CardTitle>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Manage Mumin Group farm units and centers.</p>
                 </div>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-semibold px-4 h-9 text-xs">
                 <PlusIcon className="w-4 h-4 mr-1.5" /> Add Farm
              </Button>
            </CardHeader>
            <CardContent className="p-0">
               <div className="p-3 border-b border-gray-50 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-6">
                  <span className="flex-1">Farm Name</span>
                  <span className="flex-1">Location</span>
                  <span className="w-16 text-center">Animals</span>
                  <span className="flex-1 text-right">Created</span>
                  <span className="w-8"></span>
               </div>
               
               <div className="divide-y divide-gray-50">
                 {stats.farms && stats.farms.map((farm: any) => (
                   <div key={farm.farm_id} className="flex justify-between items-center p-3 px-6 hover:bg-slate-50 transition-colors">
                      <span className="flex-1 font-bold text-slate-700 text-xs">{farm.farm_name}</span>
                      <span className="flex-1 text-xs text-slate-500 flex items-center"><div className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center mr-2"><div className="w-1 h-1 rounded-full bg-blue-600"></div></div> {farm.location}</span>
                      <span className="w-16 text-center"><span className="bg-blue-50 text-blue-600 font-bold px-2.5 py-0.5 rounded-full text-[10px]">{farm._count?.animals || 0}</span></span>
                      <span className="flex-1 text-right text-xs text-slate-500 font-medium">{new Date(farm.created_at).toLocaleDateString()}</span>
                      <span className="w-8 text-right"><button className="text-slate-300 hover:text-slate-500"><MoreVerticalIcon className="w-4 h-4" /></button></span>
                   </div>
                 ))}
                 {stats.farms?.length === 0 && (
                   <div className="p-4 text-center text-xs text-slate-500">No farms registered yet</div>
                 )}
               </div>

               <div className="p-4 text-center bg-gray-50/50">
                  <Link href="/dashboard/farms">
                    <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold rounded-xl px-5 h-9 text-xs">View All Farms</Button>
                  </Link>
               </div>
            </CardContent>
          </Card>
          
          {/* Recent Activities */}
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
        </div>

        {/* Right Column */}
        <div className="space-y-6">
           {/* Animals Overview Chart */}
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

           {/* Vaccine Inventory */}
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
        </div>
      </div>
    </div>
  )

  const renderDoctorDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#2FA4D7]">Veterinarian Hub</h2>
        <p className="text-muted-foreground mt-1">Hello Dr. {userName?.split(' ')[0]}. Quick access to health reports and vaccination tools.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <DoctorAlerts />
          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-md">Your Vaccinations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-1">{stats.totalVaccinations || 0}</div>
              <p className="text-xs text-white/70">Total animal doses given</p>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2 space-y-6">
          <DoctorQueue />
          <AnimalTable />
        </div>
      </div>
    </div>
  )

  const renderFarmWorkerDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-emerald-600">Farm Station</h2>
        <p className="text-muted-foreground mt-1">Officer: {userName}. Register animals and report observations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1 space-y-6">
          <ReportIssueForm />
          <Card className="bg-white border-none shadow-sm p-4 rounded-xl">
            <h4 className="font-semibold text-xs text-muted-foreground mb-2">QUICK TIPS</h4>
            <p className="text-xs text-slate-600 italic">&quot;Ensure the ID tag is visible before reporting symptoms for faster identification.&quot;</p>
          </Card>
        </div>
        <div className="md:col-span-3 space-y-6">
          <WorkerAlertsTable />
          <AnimalTable />
        </div>
      </div>
    </div>
  )

  if (role === 'Admin') return renderAdminDashboard()
  if (role === 'Doctor') return renderDoctorDashboard()
  if (role === 'Farm Worker') return renderFarmWorkerDashboard()

  return renderAdminDashboard() // Default
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
