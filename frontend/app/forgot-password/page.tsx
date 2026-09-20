"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react"

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
        <div className="h-screen w-full flex overflow-hidden bg-white font-sans selection:bg-blue-500/30">
            {/* Left Side - Form Area */}
            <div className="w-full lg:w-[45%] xl:w-[40%] h-full flex flex-col justify-center relative overflow-hidden shrink-0 bg-white">
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

            {/* Right Side - Brand Image (same as login) */}
            <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] h-full relative overflow-hidden bg-white items-end justify-center pb-0 px-4">
                <img
                    src="/img/login2.png"
                    alt="Livestock Vaccination System"
                    className="w-[98%] max-h-[96%] h-auto object-contain object-bottom"
                />
            </div>
        </div>
    )
}
