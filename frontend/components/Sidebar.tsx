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
} from 'lucide-react';
import { useEffect, useState } from 'react';


interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState({ name: 'User Account', role: 'Staff' });

  useEffect(() => {
    const name = localStorage.getItem('name');
    const role = localStorage.getItem('role');
    if (name) setUser(prev => prev.name === name ? prev : ({ ...prev, name }));
    if (role) setUser(prev => prev.role === role ? prev : ({ ...prev, role }));
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
        { href: '/dashboard/farms', label: 'Farms', icon: WarehouseIcon },
        { href: '/dashboard/animals', label: 'Animals Registration', icon: LayersIcon },
        { href: '/dashboard/vaccines', label: 'Vaccines', icon: SyringeIcon },
        { href: '/dashboard/stock', label: 'Inventory (Stock)', icon: PackageIcon },
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
    {
      label: 'Analytics',
      items: [
        { href: '/dashboard/reports', label: 'Reports', icon: PieChartIcon },
        { href: '/dashboard/reports', label: 'Vaccination logs', icon: FileTextIcon },
      ]
    },
    {
      label: 'System',
      items: [
        { href: '#', label: 'Settings', icon: SettingsIcon },
      ]
    }
  ];


  return (
    <div className={`fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out z-50 bg-[#2FA4D7] text-white flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4 h-20 border-b border-white/10">
        <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'opacity-0 invisible w-0' : 'opacity-100 visible'}`}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl shadow-lg border border-white/30">
            M
          </div>
          <span className="text-xl font-bold tracking-tight text-white whitespace-nowrap">Mumin Group</span>
        </div>
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg hover:bg-white/10 transition-colors relative ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <MenuIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex-1 px-3 space-y-6 mt-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-2">
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-[#f0f0f0]/40 uppercase tracking-[2px] px-4 py-2">
                {group.label}
              </p>
            )}
            {isCollapsed && (
              <div className="h-[1px] bg-[#f0f0f0]/10 mx-4 my-4" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={`${group.label}-${item.label}`}
                    href={item.href}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative border border-transparent ${isActive
                      ? 'bg-white text-[#2FA4D7] shadow-lg translate-x-1'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-[#2FA4D7]' : 'text-white/70 group-hover:text-white'}`} />
                    {!isCollapsed && <span className="whitespace-nowrap transition-all duration-300 opacity-100">{item.label}</span>}


                    {isCollapsed && (
                      <span className="absolute left-full rounded-md px-2 py-1 ml-6 bg-[#11101d] text-white text-xs invisible opacity-0 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-[100] whitespace-nowrap shadow-xl border border-[#403e57]">
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

      <div className="p-4 mt-auto border-t border-white/10">
        <div className={`bg-white/10 rounded-xl p-3 flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center p-2' : ''}`}>
          <div className="w-10 h-10 rounded-lg bg-white text-[#2FA4D7] flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm">
            {user.name?.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-white truncate">{user.name}</span>
              <span className="text-xs text-white/60 truncate">{user.role}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
