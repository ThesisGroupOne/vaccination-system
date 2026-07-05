"use client"

import { useRouter } from "next/navigation"
import { BellIcon, SearchIcon, ChevronDownIcon, LogOutIcon, AlertCircleIcon, CalendarClockIcon, PackageMinusIcon } from "lucide-react"
import { useEffect, useState, useRef } from "react"

interface Reminder {
  id: string;
  type: 'expiry' | 'stock' | 'schedule';
  urgency: 'high' | 'medium';
  title: string;
  description: string;
  date: string;
}

export default function Navbar() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showReminders, setShowReminders] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUserName(localStorage.getItem('name'))
    setRole(localStorage.getItem('role'))
    setProfileImage(localStorage.getItem('profile_image'))

    const handleStorageChange = () => {
      setUserName(localStorage.getItem('name'))
      setRole(localStorage.getItem('role'))
      setProfileImage(localStorage.getItem('profile_image'))
    }

    window.addEventListener('storage', handleStorageChange)

    const fetchReminders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }
        const res = await fetch('http://localhost:9999/api/reminders', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
          mode: 'cors',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json()
          setReminders(data.reminders || [])
        }
      } catch (err) {
        console.error("Failed to fetch reminders", err)
      }
    }

    fetchReminders()
    const interval = setInterval(fetchReminders, 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowReminders(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/login")
  }

  const getIconForType = (type: string, urgency: string) => {
    const colorClass = urgency === 'high' ? 'text-red-600' : 'text-amber-600'
    if (type === 'expiry') return <AlertCircleIcon className={`w-5 h-5 ${colorClass}`} />
    if (type === 'stock') return <PackageMinusIcon className={`w-5 h-5 ${colorClass}`} />
    if (type === 'schedule') return <CalendarClockIcon className={`w-5 h-5 ${colorClass}`} />
    return <BellIcon className={`w-5 h-5 ${colorClass}`} />
  }

  return (
    <div className="bg-white border-b border-gray-100 py-3 px-8 flex justify-between items-center sticky top-0 z-30 transition-all h-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-extrabold text-blue-600 tracking-tight">
          Livestock Vaccination System
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:flex items-center">
          <SearchIcon className="w-4 h-4 absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search..."
            className="pl-9 pr-4 py-2 w-64 rounded-full bg-slate-50 border border-slate-100 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
          />
        </div>

        {/* Reminders Dropdown */}
        <div className="relative" ref={bellRef}>
          <button 
            onClick={() => setShowReminders(!showReminders)}
            className={`relative p-2 rounded-full transition-colors ${showReminders ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <BellIcon className="w-5 h-5" />
            {reminders.length > 0 && (
              <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-white">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              </span>
            )}
          </button>

          {showReminders && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Notifications & Alerts</h3>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                  {reminders.length}
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {reminders.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500">
                    <BellIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {reminders.map(reminder => (
                      <div key={reminder.id} className={`p-4 hover:bg-slate-50 transition-colors cursor-default ${reminder.urgency === 'high' ? 'bg-red-50/30' : ''}`}>
                        <div className="flex gap-3 items-start">
                          <div className={`mt-0.5 p-2 rounded-xl ${reminder.urgency === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
                            {getIconForType(reminder.type, reminder.urgency)}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-800">{reminder.title}</h4>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{reminder.description}</p>
                            <span className="text-[10px] font-semibold text-slate-400 mt-2 block">
                              {new Date(reminder.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-100 mx-1"></div>

        <div className="flex items-center gap-3 cursor-pointer group relative">
           <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
              {profileImage ? (
                <img src={`http://localhost:9999${profileImage}`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-slate-600 text-sm">{userName?.charAt(0).toUpperCase() || 'U'}</span>
              )}
           </div>
           
           <div className="hidden sm:flex flex-col">
              <span className="text-sm font-bold text-slate-800 leading-tight">{userName || 'User'}</span>
              <span className="text-[11px] font-semibold text-slate-400">{role || 'Staff'}</span>
           </div>
           
           <ChevronDownIcon className="w-4 h-4 text-slate-400" />

           <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOutIcon className="w-4 h-4" />
                Logout
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}