"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Mail, Lock, User, Phone, Briefcase } from "lucide-react"

export default function RegisterPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        email: "",
        password: "",
        role: "Doctor",
    })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("http://localhost:9999/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Registration failed")
            }

            router.push("/login?registered=true")
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
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#2FA4D7]/5 blur-3xl z-0" />

            <Card className="w-full max-w-md shadow-lg border-[#2FA4D7]/20 z-10 backdrop-blur-sm bg-background/95">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 bg-[#2FA4D7]/10 rounded-full">
                            <UserPlus className="h-6 w-6 text-[#2FA4D7]" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Create an Account</CardTitle>
                    <CardDescription>
                        Enter your details below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 text-center font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Full Name
                            </label>
                            <div className="relative group">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-[#2FA4D7] transition-colors" />
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Cali Farax"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA4D7]/50 focus-visible:border-[#2FA4D7] disabled:cursor-not-allowed disabled:opacity-50 pl-10 transition-all duration-200"
                                />
                            </div>
                        </div>

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
                                    placeholder="cali@example.com"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA4D7]/50 focus-visible:border-[#2FA4D7] disabled:cursor-not-allowed disabled:opacity-50 pl-10 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Phone Number
                            </label>
                            <div className="relative group">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-[#2FA4D7] transition-colors" />
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="0612345678"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA4D7]/50 focus-visible:border-[#2FA4D7] disabled:cursor-not-allowed disabled:opacity-50 pl-10 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Role
                            </label>
                            <div className="relative group">
                                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-[#2FA4D7] transition-colors" />
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA4D7]/50 focus-visible:border-[#2FA4D7] disabled:cursor-not-allowed disabled:opacity-50 pl-10 appearance-none transition-all duration-200"
                                >
                                    <option value="Doctor">Doctor</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Farm Worker">Farm Worker</option>
                                    <option value="Office Fielder">Office Fielder</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Password
                            </label>
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
                            {loading ? "Creating..." : "Create Account"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t p-4 bg-muted/20">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Button variant="link" className="p-0 h-auto font-semibold text-[#2FA4D7]" onClick={() => router.push("/login")}>
                            Sign In
                        </Button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
