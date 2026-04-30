"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HexagonIcon, SyringeIcon, AlertCircleIcon, TrendingUpIcon, UsersIcon } from "lucide-react"
import AnimalTable from "@/components/AnimalTable"
import StockTable from "@/components/StockTable"
import ReportIssueForm from "@/components/ReportIssueForm"
import DoctorAlerts from "@/components/DoctorAlerts"
import DoctorQueue from "@/components/DoctorQueue"
import FarmTable from "@/components/FarmTable"
import WorkerAlertsTable from "@/components/WorkerAlertsTable"

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalAnimals: 0,
    totalVaccines: 0,
    totalStaff: 0,
    medicalAlerts: 0,
    totalVaccinations: 0
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

  const renderAdminDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 flex items-center gap-3">
            Admin Overlook
            <Badge variant="outline" className="bg-[#2FA4D7]/10 text-[#2FA4D7] border-[#2FA4D7]/20 text-[11px] font-bold uppercase tracking-wider py-1 px-3 shadow-sm">
              Real-Time
            </Badge>
          </h2>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}. Here&apos;s the state of Mumin Group Farms.</p>
        </div>
        <Button onClick={() => window.location.reload()} size="sm" variant="ghost" className="rounded-xl text-[#2FA4D7] hover:bg-[#2FA4D7]/10">
          Sync Database
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Animals" value={stats.totalAnimals.toLocaleString()} icon={<HexagonIcon className="w-5 h-5 text-indigo-600" />} bgColor="bg-indigo-50 border border-indigo-100 shadow-sm" trend="Active livestock" trendColor="text-indigo-600" />
        <StatCard title="Vaccines in Stock" value={stats.totalVaccines.toLocaleString()} unit="doses" icon={<SyringeIcon className="w-5 h-5 text-teal-600" />} bgColor="bg-teal-50 border border-teal-100 shadow-sm" trend="Stock levels monitored" trendColor="text-teal-600" />
        <StatCard title="Total Staff" value={stats.totalStaff.toLocaleString()} icon={<UsersIcon className="w-5 h-5 text-fuchsia-600" />} bgColor="bg-fuchsia-50 border border-fuchsia-100 shadow-sm" />
        <StatCard title="Medical Alerts" value={stats.medicalAlerts.toLocaleString()} icon={<AlertCircleIcon className="w-5 h-5 text-amber-600" />} bgColor="bg-amber-50 border border-amber-100 shadow-sm" trend="Pending observations" trendColor="text-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <FarmTable />
          <AnimalTable />
        </div>
        <div className="space-y-6">
          <StockTable />
          <Card className="rounded-2xl border-none shadow-xl bg-gradient-to-br from-[#2FA4D7] to-indigo-600 text-white p-7 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <HexagonIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h3 className="font-bold text-xl mb-2">Need Help?</h3>
              <p className="text-sm text-white/80 mb-5 leading-relaxed">Contact our technical support for any system issues or training.</p>
              <button className="bg-white text-indigo-600 font-bold py-2.5 px-5 rounded-xl text-sm hover:bg-white/90 transition-all shadow-md">Contact Support</button>
            </div>
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
  if (role === 'Farm Worker' || role === 'Office Fielder') return renderFarmWorkerDashboard()

  return renderAdminDashboard() // Default
}

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  bgColor: string;
  trend?: string;
  trendColor?: string;
}

function StatCard({ title, value, unit, icon, bgColor, trend, trendColor }: StatCardProps) {
  return (
    <Card className="rounded-2xl border-none shadow-sm bg-white hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-800">
          {value} {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
        </div>
        {trend && (
          <p className={`text-xs ${trendColor} font-medium mt-1 flex items-center`}>
            {trend.startsWith('+') && <TrendingUpIcon className="w-3 h-3 mr-1" />}
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
