"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, ArrowRight, ShieldCheck, Activity, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("http://localhost:9999/api/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to request OTP")
            }

            // Redirect to reset password page with email
            router.push(`/reset-password?email=${encodeURIComponent(email)}`)
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

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-blue-500/30">
            {/* Left Side - Form Area */}
            <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[100px] pointer-events-none" />

                <div className="w-full max-w-md mx-auto px-6 sm:px-12 relative z-10">
                    <button 
                        onClick={() => router.push("/login")}
                        className="flex items-center text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to login
                    </button>

                    <div className="mb-10 animate-fade-in-up">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                            Forgot Password
                        </h1>
                        <p className="text-slate-500 text-base">
                            Enter your email to receive an OTP code to reset your password.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 animate-fade-in">
                                <div className="mt-1 w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                                <p className="text-rose-700 text-sm font-medium leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="space-y-5">
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
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="user@example.com"
                                        className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-sm shadow-slate-200/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative flex items-center justify-center py-4 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-base shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 overflow-hidden group mt-8"
                        >
                            <span className="relative z-10 flex items-center">
                                {loading ? "Sending..." : "Send OTP"}
                                {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />}
                            </span>
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Side - Dynamic Brand Display */}
            <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative p-6">
                <div className="absolute inset-0 m-6 rounded-[2.5rem] overflow-hidden bg-blue-900 shadow-2xl">
                    <div 
                        className="absolute inset-0 bg-cover bg-center transform hover:scale-105 transition-transform duration-[10s] ease-in-out mix-blend-overlay opacity-60 grayscale-[10%]"
                        style={{ backgroundImage: 'url("/bg-farm.png")' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-indigo-900/90 z-10" />
                    
                    <div className="absolute top-0 left-0 w-full h-full z-20 opacity-30">
                        <div className="absolute top-[10%] left-[10%] w-64 h-64 border border-white/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                        <div className="absolute top-[20%] right-[15%] w-96 h-96 border border-white/10 rounded-full animate-pulse" />
                    </div>

                    <div className="absolute inset-0 z-30 flex flex-col justify-between p-16">
                        <div className="flex items-center space-x-3 text-white/90">
                            <Activity className="h-8 w-8" />
                            <span className="text-xl font-bold tracking-wider uppercase">Mumin Group</span>
                        </div>

                        <div className="max-w-xl">
                            <h2 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                                Account <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Recovery</span>
                            </h2>
                            <p className="text-lg text-blue-100/80 leading-relaxed font-medium">
                                Securely recover your account access and continue managing your farm operations seamlessly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
