"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  UsersIcon,
  SettingsIcon,
  MenuIcon,
  ChevronLeftIcon,
  SyringeIcon,
  PackageIcon,
  PieChartIcon,
  FileTextIcon,
  LayersIcon,
  WarehouseIcon,
  ActivityIcon,
  ShieldCheckIcon,
  MoreVerticalIcon,
  UserIcon,
  CalendarIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { canView } from '@/lib/permissions';


interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState({ name: 'User Account', role: 'Staff', profileImage: '' });

  useEffect(() => {
    const loadUser = () => {
      const name = localStorage.getItem('name') || 'User Account';
      const role = localStorage.getItem('role') || 'Staff';
      const profileImage = localStorage.getItem('profile_image') || '';
      setUser({ name, role, profileImage });
    };

    loadUser();

    window.addEventListener('storage', loadUser);
    return () => {
      window.removeEventListener('storage', loadUser);
    };
  }, []);

  const role = user.role;

  const menuGroups = [
    {
      label: 'Main Menu',
      items: [
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboardIcon },
      ]
    },
    {
      label: 'Management',
      items: [
        ...(canView('Farms', role) ? [{ href: '/dashboard/farms', label: 'Farms', icon: WarehouseIcon }] : []),
        ...(canView('Animals', role) ? [{ href: '/dashboard/animals', label: 'Animals Registration', icon: LayersIcon }] : []),
        ...(canView('Vaccines', role) ? [{ href: '/dashboard/vaccines', label: 'Vaccines', icon: SyringeIcon }] : []),
        ...(canView('Stock', role) ? [{ href: '/dashboard/stock', label: 'Inventory (Stock)', icon: PackageIcon }] : []),
        { href: '/dashboard/routine-vaccination', label: 'Routine Vaccination', icon: CalendarIcon },
        ...(canView('Vaccines', role) ? [{ href: '/dashboard/vaccination-list', label: 'Vaccination List', icon: FileTextIcon }] : []),
        ...(canView('Reports', role) ? [{ href: '/dashboard/reports', label: 'Reports', icon: PieChartIcon }] : []),
      ]
    },
    ...(role === 'Admin' ? [
      {
        label: 'Access Control',
        items: [
          { href: '/dashboard/users', label: 'Users', icon: UsersIcon },
        ]
      }
    ] : []),
    ...(role === 'Admin' || role === 'Doctor' ? [{
      label: 'System',
      items: [
        { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
        ...(canView('ActivityLogs', role) ? [{ href: '/dashboard/activity-logs', label: 'Activity Logs', icon: ActivityIcon }] : []),
      ]
    }] : [])
  ].filter(group => group.items.length > 0);


  return (
    <div className={`fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out z-50 bg-gradient-to-b from-blue-600 to-blue-500 text-white flex flex-col shadow-xl ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4 h-20">
        <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'opacity-0 invisible w-0' : 'opacity-100 visible'}`}>
          <img 
            src="/img/463865371_8646484958778270_5136213218242522965_n-removebg-preview.png" 
            alt="Livestock Vaccination System Logo" 
            className={`transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-9 h-9'} rounded-xl shadow-sm`} 
          />
          <span className="text-[15px] font-bold tracking-tight text-white whitespace-nowrap">Livestock Vaccine</span>
        </div>
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-colors relative ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <MenuIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 px-4 space-y-5 mt-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest px-3 py-2">
                {group.label}
              </p>
            )}
            {isCollapsed && (
              <div className="h-[1px] bg-white/10 mx-4 my-4" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                      key={`${group.label}-${item.label}`}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm font-semibold transition-all duration-200 group relative border border-transparent ${isActive
                        ? 'bg-white text-brand-secondary shadow-sm'
                        : 'text-white hover:bg-white/10'
                        }`}
                    >
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${isActive ? 'text-brand-secondary' : 'text-blue-100 group-hover:text-white'}`} />
                    {!isCollapsed && <span className="whitespace-nowrap transition-all duration-300 opacity-100">{item.label}</span>}

                    {isCollapsed && (
                      <span className="absolute left-full rounded-md px-2 py-1 ml-6 bg-slate-900 text-white text-xs invisible opacity-0 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-[100] whitespace-nowrap shadow-xl">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 mt-auto">
        <div className={`bg-black/10 rounded-[14px] p-3 flex items-center gap-3 transition-all duration-300 border border-white/5 hover:bg-black/20 cursor-pointer ${isCollapsed ? 'justify-center p-2' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden">
            {user.profileImage ? (
              <img src={`http://localhost:9999${user.profileImage}`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-slate-300" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-sm font-bold text-white truncate">{user.name}</span>
              <span className="text-[11px] text-blue-200 truncate font-medium">{user.role}</span>
            </div>
          )}
          {!isCollapsed && (
             <MoreVerticalIcon className="w-4 h-4 text-blue-200" />
          )}
        </div>
      </div>
    </div>
  );
}
