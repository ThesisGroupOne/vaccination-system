"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, Mail, Lock } from "lucide-react"

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

    // Redirect if already logged in
    useEffect(() => {
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

            // Save to localStorage
            localStorage.setItem("token", data.token)
            localStorage.setItem("role", data.role)
            localStorage.setItem("name", data.name)
            localStorage.setItem("email", formData.email)

            // Redirect to dashboard
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 relative overflow-hidden">
            {/* Background Decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#2FA4D7]/5 blur-3xl z-0" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#2FA4D7]/10 blur-3xl z-0" />

            <Card className="w-full max-w-md shadow-xl border-[#2FA4D7]/20 z-10 backdrop-blur-sm bg-background/95">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 bg-[#2FA4D7]/10 rounded-full">
                            <LogIn className="h-6 w-6 text-[#2FA4D7]" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {registered && (
                        <div className="mb-4 p-3 bg-green-500/10 text-green-600 text-sm rounded-md border border-green-500/20 text-center font-medium">
                            Registration successful! Please log in.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 text-center font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-[#2FA4D7] transition-colors" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="name@example.com"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA4D7]/50 focus-visible:border-[#2FA4D7] disabled:cursor-not-allowed disabled:opacity-50 pl-10 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium leading-none">
                                    Password
                                </label>
                                <a href="#" className="text-xs text-[#2FA4D7] hover:underline font-medium">
                                    Forgot password?
                                </a>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-[#2FA4D7] transition-colors" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA4D7]/50 focus-visible:border-[#2FA4D7] disabled:cursor-not-allowed disabled:opacity-50 pl-10 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-6 shadow-md hover:shadow-lg transition-all bg-[#2FA4D7] text-white hover:bg-[#2FA4D7]/90" size="lg" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t p-4 bg-muted/20">
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Button variant="link" className="p-0 h-auto font-semibold text-[#2FA4D7]" onClick={() => router.push("/register")}>
                            Sign up
                        </Button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
