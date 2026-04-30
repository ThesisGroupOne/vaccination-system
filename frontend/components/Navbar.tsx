"use client"

import { useRouter } from "next/navigation"
import { LogOutIcon, BellIcon, SearchIcon } from "lucide-react"

export default function Navbar() {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/login")
  }

  return (
    <div className="bg-background/80 backdrop-blur-md border-b shadow-xs py-3 px-8 flex justify-between items-center sticky top-0 z-30 transition-all">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#2FA4D7] to-blue-600 bg-clip-text text-transparent tracking-tight">
          Mumin Group System
        </h1>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative hidden md:flex items-center">
          <SearchIcon className="w-4 h-4 absolute left-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Quick search..."
            className="pl-9 pr-4 py-2 w-64 rounded-full bg-muted/50 border-none text-sm focus:outline-none focus:ring-2 focus:ring-[#2FA4D7]/50 transition-all"
          />
        </div>

        <button className="relative p-2 text-muted-foreground hover:bg-muted/80 rounded-full transition-colors">
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
        </button>

        <div className="h-6 w-px bg-border mx-1"></div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
        >
          <LogOutIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}