"use client"

import { useEffect, useState, useRef } from "react"
import { User, Mail, Phone, Camera, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface UserProfile {
  full_name: string
  email: string
  phone: string
  profile_image: string | null
  role: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("http://localhost:9999/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error("Failed to load profile")
      const data = await res.json()
      setProfile(data)
      setFullName(data.full_name)
      setEmail(data.email)
      setPhone(data.phone || "")
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load profile details." })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("http://localhost:9999/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")

      setProfile(data)
      // Update local storage so navbar/sidebar update too
      localStorage.setItem("name", data.full_name)
      
      // Dispatch storage event to trigger update in other components
      window.dispatchEvent(new Event("storage"))
      
      setMessage({ type: "success", text: "Profile information updated successfully!" })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred while updating the profile." })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name)
      setEmail(profile.email)
      setPhone(profile.phone || "")
      setMessage(null)
    }
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 5MB." })
      return
    }

    const formData = new FormData()
    formData.append("image", file)

    setUploading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem("token")
      const res = await fetch("http://localhost:9999/api/users/profile/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to upload image")

      setProfile(prev => prev ? { ...prev, profile_image: data.profile_image } : null)
      localStorage.setItem("profile_image", data.profile_image || "")
      window.dispatchEvent(new Event("storage"))

      setMessage({ type: "success", text: "Profile picture updated successfully!" })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred while uploading the profile picture." })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const imageUrl = profile?.profile_image 
    ? `http://localhost:9999${profile.profile_image}` 
    : null
  
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "U"

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your personal profile information and settings.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
        {/* Header decoration */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
          <div className="absolute inset-0 bg-grid-white/10" />
        </div>

        {/* Profile Image & Role Info Card */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-16 mb-8">
            <div className="relative group cursor-pointer" onClick={handleImageClick}>
              <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-md flex items-center justify-center text-slate-400">
                {imageUrl ? (
                  <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-extrabold text-slate-500">{initials}</span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-slate-900 truncate">{profile?.full_name}</h2>
              <p className="text-sm font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full inline-block mt-1">
                {profile?.role}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {message && (
              <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                message.type === "success" 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                  : "bg-rose-50 border-rose-100 text-rose-800"
              }`}>
                {message.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-medium leading-relaxed">{message.text}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2 relative group">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Mumin Abdi"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-sm shadow-slate-200/50"
                  />
                </div>
              </div>

              {/* Email */}
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
                    placeholder="example@gmail.com"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-sm shadow-slate-200/50"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2 relative group md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+252 61XXXXXXX"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-sm shadow-slate-200/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="py-3.5 px-8 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-sm transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center py-3.5 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
