"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, Lock, ArrowRight } from "lucide-react"

function LoginContent() {
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
            if (data.profile_image != null) {
                localStorage.setItem("profile_image", data.profile_image)
            } else {
                localStorage.removeItem("profile_image")
            }
            if (data.user_id != null) localStorage.setItem("userId", String(data.user_id))

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
        <div className="h-screen w-full flex overflow-hidden bg-white font-sans selection:bg-blue-500/30">
            {/* Left Side - Form Area */}
            <div className="w-full lg:w-1/2 h-full flex flex-col justify-center relative overflow-hidden shrink-0 bg-white">
                <div className="w-full max-w-md mx-auto px-6 sm:px-12 relative z-10">
                    <div className="mb-10 animate-fade-in-up">
                        <div className="w-16 h-16 p-2 rounded-2xl bg-white/40 backdrop-blur-2xl border border-slate-200 flex items-center justify-center mb-8 shadow-lg shadow-slate-200/50 transform transition-transform hover:scale-105">
                            <img 
                                src="/img/463865371_8646484958778270_5136213218242522965_n-removebg-preview.png" 
                                alt="Livestock System Logo" 
                                className="w-full h-full object-contain drop-shadow-md"
                            />
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

            {/* Right Side - Brand Image (2304×2160 landscape) */}
            <div className="hidden lg:flex lg:w-1/2 h-full relative overflow-hidden bg-white items-center justify-center p-0">
                <img
                    src="/img/login4.jpg"
                    alt="Livestock Vaccination System"
                    className="w-full h-full object-cover object-center"
                />
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            <LoginContent />
        </Suspense>
    )
}
