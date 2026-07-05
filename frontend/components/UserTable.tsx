"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UsersIcon, PlusIcon, Loader2Icon, MailIcon, PhoneIcon, ShieldCheckIcon, EditIcon, TrashIcon, MoreHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { canEdit } from '@/lib/permissions';

interface User {
    user_id: number;
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    created_at: string;
}

export default function UserTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'Doctor',
        phone: ''
    });

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:9999/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        setRole(localStorage.getItem('role'));
        fetchUsers();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:9999/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("User created successfully");
                setIsAddModalOpen(false);
                setFormData({ full_name: '', email: '', password: '', role: 'Doctor', phone: '' });
                fetchUsers();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create user");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUserId) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:9999/api/users/${editingUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("User updated successfully");
                setIsEditModalOpen(false);
                setEditingUserId(null);
                setFormData({ full_name: '', email: '', password: '', role: 'Doctor', phone: '' });
                fetchUsers();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update user");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:9999/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("User deleted successfully");
                fetchUsers();
            } else {
                toast.error("Failed to delete user");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const openEditModal = (user: User) => {
        setFormData({
            full_name: user.full_name,
            email: user.email,
            password: '',
            role: user.role,
            phone: user.phone || ''
        });
        setEditingUserId(user.user_id);
        setIsEditModalOpen(true);
    };

    return (
        <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <UsersIcon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col space-y-0.5">
                            <CardTitle className="text-base font-extrabold text-slate-800">User Management</CardTitle>
                            <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">Manage system access and staff roles.</CardDescription>
                        </div>
                    </div>
                </div>
                {canEdit('Users', role) && (
                <>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg shadow-sm font-semibold px-4 h-9 text-xs border-none mt-4 sm:mt-0">
                            <PlusIcon className="w-4 h-4 mr-1.5" />
                            New User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
                        <form onSubmit={handleSave}>
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-xl font-extrabold text-slate-800">Add System User</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">Create an account for staff or field workers.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Full Name</Label>
                                    <Input id="full_name" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="e.g. Ahmed Ali" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Email</Label>
                                        <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="ahmed@mumin.com" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Phone</Label>
                                        <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="061..." className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Role</Label>
                                        <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                                            <SelectTrigger className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-200 shadow-xl bg-white">
                                                <SelectItem value="Admin" className="rounded-lg m-1 cursor-pointer py-2 text-xs font-bold hover:bg-slate-50">Admin</SelectItem>
                                                <SelectItem value="Doctor" className="rounded-lg m-1 cursor-pointer py-2 text-xs font-bold hover:bg-slate-50">Doctor</SelectItem>
                                                <SelectItem value="Farm Worker" className="rounded-lg m-1 cursor-pointer py-2 text-xs font-bold hover:bg-slate-50">Farm Worker</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Password</Label>
                                        <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Keep empty for default" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="mt-6 gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-md font-semibold text-sm h-11 px-6">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-[450px] rounded-[24px] border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white p-6">
                        <form onSubmit={handleEditSave}>
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-xl font-extrabold text-slate-800">Edit User</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">Update the details of the selected user.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_full_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Full Name</Label>
                                    <Input id="edit_full_name" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="e.g. Ahmed Ali" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_email" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Email</Label>
                                        <Input id="edit_email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="ahmed@mumin.com" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_phone" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Phone</Label>
                                        <Input id="edit_phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="061..." className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_role" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Role</Label>
                                        <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                                            <SelectTrigger className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-200 shadow-xl bg-white">
                                                <SelectItem value="Admin" className="rounded-lg m-1 cursor-pointer py-2 text-xs font-bold hover:bg-slate-50">Admin</SelectItem>
                                                <SelectItem value="Doctor" className="rounded-lg m-1 cursor-pointer py-2 text-xs font-bold hover:bg-slate-50">Doctor</SelectItem>
                                                <SelectItem value="Farm Worker" className="rounded-lg m-1 cursor-pointer py-2 text-xs font-bold hover:bg-slate-50">Farm Worker</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_password" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">New Password (Optional)</Label>
                                        <Input id="edit_password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Leave empty to keep" className="rounded-xl h-11 bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-purple-500" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="mt-6 gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl shadow-md font-semibold text-sm h-11 px-6">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Update User
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                </>
                )}
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-b border-gray-50">
                            <TableHead className="pl-6 h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest w-[250px]">User Details</TableHead>
                            <TableHead className="h-11 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Contact</TableHead>
                            <TableHead className="h-11 text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest">Role</TableHead>
                            <TableHead className="h-11 text-right font-bold text-[10px] text-slate-400 uppercase tracking-widest">Joined</TableHead>
                            <TableHead className="h-11 pr-6 text-right font-bold text-[10px] text-slate-400 uppercase tracking-widest w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                                </TableCell>
                            </TableRow>
                        ) : users.length > 0 ? (
                            users.map((u) => (
                                <TableRow key={u.user_id} className="hover:bg-slate-50 transition-colors border-b border-gray-50 group">
                                    <TableCell className="pl-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center font-bold text-purple-600 text-xs">
                                                {u.full_name?.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-xs">{u.full_name}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">ID: #{u.user_id}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                <MailIcon className="h-3 w-3" />
                                                {u.email}
                                            </div>
                                            {u.phone && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
                                                    <PhoneIcon className="h-3 w-3" />
                                                    {u.phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-3">
                                        <Badge
                                            variant="outline"
                                            className={`rounded-full font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider ${u.role === 'Admin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                u.role === 'Doctor' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}
                                        >
                                            <ShieldCheckIcon className="h-3 w-3 mr-1" />
                                            {u.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right py-3 text-slate-500 text-[10px] font-bold">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right pr-6 py-3">
                                        {canEdit('Users', role) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50 rounded-lg transition-opacity">
                                                        <MoreHorizontalIcon className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 bg-white border-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-xl">
                                                    <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-slate-100" />
                                                    <DropdownMenuItem onClick={() => openEditModal(u)} className="text-sm font-medium text-slate-700 cursor-pointer focus:bg-slate-50 focus:text-blue-600 rounded-lg m-1">
                                                        <EditIcon className="mr-2 h-4 w-4" /> Edit User
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(u.user_id)} className="text-sm font-medium text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700 rounded-lg m-1">
                                                        <TrashIcon className="mr-2 h-4 w-4" /> Delete User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
