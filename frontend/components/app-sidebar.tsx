"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  UsersIcon,
  Settings2Icon,
  HelpCircleIcon,
  CommandIcon,
  StethoscopeIcon,
  ClipboardListIcon,
  PieChartIcon,
  LayersIcon,
  GlobeIcon
} from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [role, setRole] = useState<string | null>(null)
  const [user, setUser] = useState({
    name: "User",
    email: "user@mumin.com",
    avatar: "/avatars/user.jpg",
  })

  useEffect(() => {
    const savedRole = localStorage.getItem('role')
    const savedName = localStorage.getItem('name')
    const savedEmail = localStorage.getItem('email')

    if (savedRole !== null) {
      setRole(prev => prev === savedRole ? prev : savedRole)
    }

    if (savedName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(prev => {
        if (prev.name === savedName && prev.email === (savedEmail || prev.email)) return prev;
        return {
          ...prev,
          name: savedName,
          email: savedEmail || prev.email
        };
      })
    }
  }, [])

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      isActive: true,
    },
    {
      title: "Management",
      url: "#",
      icon: <LayersIcon />,
      items: [
        {
          title: "Animals",
          url: "/dashboard", // Currently on main dashboard
        },
        {
          title: "Inventory",
          url: "/dashboard", // Currently on main dashboard (StockTable)
        },
        {
          title: "Suppliers",
          url: "#",
        },
      ]
    },
    ...(role === 'Admin' ? [
      {
        title: "Access Control",
        url: "#",
        icon: <UsersIcon />,
        items: [
          {
            title: "Users List",
            url: "/dashboard/users",
          },
          {
            title: "Permissions",
            url: "#",
          },
        ]
      },
    ] : []),
    ...(role === 'Doctor' ? [
      {
        title: "Medical",
        url: "#",
        icon: <StethoscopeIcon />,
        items: [
          {
            title: "Vaccinations",
            url: "#",
          },
          {
            title: "Observations",
            url: "#",
          },
        ]
      },
    ] : []),
  ]

  const documents = [
    {
      name: "System Reports",
      url: "/dashboard/reports",
      icon: <PieChartIcon />,
    },
    {
      name: "Vaccination Logs",
      url: "#",
      icon: <ClipboardListIcon />,
    },
    {
      name: "Farm Map",
      url: "#",
      icon: <GlobeIcon />,
    },
  ]

  const navSecondary = [
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <HelpCircleIcon />,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props} className="border-r-muted/40 font-inter">
      <SidebarHeader className="bg-[#2FA4D7] text-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-white/10 active:bg-white/10 transition-colors"
            >
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white text-[#2FA4D7] shadow-sm">
                  <CommandIcon className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-sm tracking-tight text-white">Mumin Group</span>
                  <span className="text-[10px] text-white/70">Vaccination System</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-background">
        <NavMain items={navMain} />
        <NavDocuments items={documents} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-muted/40 bg-muted/5">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
