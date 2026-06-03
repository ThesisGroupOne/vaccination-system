"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, Lock, ArrowRight, ShieldCheck, Activity, Users } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const registered = searchParams.get("registered")

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const token = localStorage.getItem("token")
        if (token) {
            router.push("/dashboard")
        }
    }, [router])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("http://localhost:9999/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Login failed")
            }

            localStorage.setItem("token", data.token)
            localStorage.setItem("role", data.role)
            localStorage.setItem("name", data.name)
            localStorage.setItem("email", formData.email)

            router.push("/dashboard")
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError("An unknown error occurred")
            }
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null;

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-blue-500/30">
            {/* Left Side - Form Area */}
            <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center relative overflow-hidden">
                {/* Decorative background blurs */}
                <div className="absolute top-[-10%] left-[-20%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[100px] pointer-events-none" />

                <div className="w-full max-w-md mx-auto px-6 sm:px-12 relative z-10">
                    <div className="mb-10 animate-fade-in-up">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30 transform transition-transform hover:scale-105">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                            Welcome Back
                        </h1>
                        <p className="text-slate-500 text-base">
                            Securely manage your livestock operations.
                        </p>
                    </div>

                    {registered && (
                        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center space-x-3 animate-fade-in">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-emerald-700 text-sm font-medium">Registration successful! Please log in.</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 animate-fade-in">
                                <div className="mt-1 w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                                <p className="text-rose-700 text-sm font-medium leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Email Field */}
                            <div className="space-y-2 relative group">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="user@example.com"
                                        className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-sm shadow-slate-200/50"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2 relative group">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <button type="button" onClick={() => router.push("/forgot-password")} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="••••••••"
                                        className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-sm shadow-slate-200/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative flex items-center justify-center py-4 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-base shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] overflow-hidden group mt-8"
                        >
                            <span className="relative z-10 flex items-center">
                                {loading ? "Authenticating..." : "Sign In"}
                                {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />}
                            </span>
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            Don&apos;t have an account?{" "}
                            <button onClick={() => router.push("/register")} className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                Request access
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Dynamic Brand Display */}
            <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative p-6">
                <div className="absolute inset-0 m-6 rounded-[2.5rem] overflow-hidden bg-blue-900 shadow-2xl">
                    {/* Background Image */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center transform hover:scale-105 transition-transform duration-[10s] ease-in-out mix-blend-overlay opacity-60 grayscale-[10%]"
                        style={{ backgroundImage: 'url("/bg-farm.png")' }}
                    />
                    
                    {/* Deep Blue Gradients Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-indigo-900/90 z-10" />
                    
                    {/* Animated Geometric Accents */}
                    <div className="absolute top-0 left-0 w-full h-full z-20 opacity-30">
                        <div className="absolute top-[10%] left-[10%] w-64 h-64 border border-white/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                        <div className="absolute top-[20%] right-[15%] w-96 h-96 border border-white/10 rounded-full animate-pulse" />
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute inset-0 z-30 flex flex-col justify-between p-16">
                        <div className="flex items-center space-x-3 text-white/90">
                            <Activity className="h-8 w-8" />
                            <span className="text-xl font-bold tracking-wider uppercase">Mumin Group</span>
                        </div>

                        <div className="max-w-xl">
                            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-sm font-semibold text-white">System Operations Active</span>
                            </div>
                            <h2 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                                Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Livestock</span> Management
                            </h2>
                            <p className="text-lg text-blue-100/80 leading-relaxed font-medium">
                                Empowering veterinary teams and farm managers with real-time data, comprehensive health tracking, and seamless inventory synchronization.
                            </p>

                            {/* Stats/Features Row */}
                            <div className="grid grid-cols-2 gap-6 mt-12">
                                <div className="flex items-center space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                                    <div className="p-3 bg-blue-500/20 rounded-xl">
                                        <Activity className="h-6 w-6 text-blue-300" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">99.9%</p>
                                        <p className="text-xs text-blue-200 font-medium">System Uptime</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                                        <Users className="h-6 w-6 text-indigo-300" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">24/7</p>
                                        <p className="text-xs text-blue-200 font-medium">Data Syncing</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
