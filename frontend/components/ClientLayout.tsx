"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [isAuth, setIsAuth] = useState<boolean | null>(null)
    const [isCollapsed, setIsCollapsed] = useState(false)

    const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname === "/"

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token && !isPublicRoute) {
            router.push("/login")
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAuth(true)
        }
    }, [pathname, router, isPublicRoute])

    if (isPublicRoute) {
        return <main>{children}</main>
    }

    // Prevent flashing of protected content before auth is verified
    if (isAuth === null) return null

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'pl-20' : 'pl-64'}`}>
                <Navbar />
                <main className="p-6 flex-1">{children}</main>
            </div>
        </div>
    )

}

