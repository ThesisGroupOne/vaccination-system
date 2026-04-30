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
import { UsersIcon, PlusIcon, Loader2Icon, MailIcon, PhoneIcon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';

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

    useEffect(() => {
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

    return (
        <Card className="rounded-2xl border-muted/60 shadow-xs bg-background overflow-hidden font-inter">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-muted/40 bg-muted/10 pb-4 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2FA4D7]/10 text-[#2FA4D7] flex items-center justify-center">
                        <UsersIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold">User Management</CardTitle>
                        <CardDescription className="text-xs">Manage system access and staff roles.</CardDescription>
                    </div>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="rounded-xl bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white border-none">
                            <PlusIcon className="w-4 h-4 mr-2" />
                            New User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] rounded-2xl border-none shadow-2xl">
                        <form onSubmit={handleSave}>
                            <DialogHeader>
                                <DialogTitle>Add System User</DialogTitle>
                                <DialogDescription>Create an account for staff or field workers.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Full Name</Label>
                                    <Input id="full_name" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="e.g. Ahmed Ali" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="ahmed@mumin.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="061..." />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Admin">Admin</SelectItem>
                                                <SelectItem value="Doctor">Doctor</SelectItem>
                                                <SelectItem value="Farm Worker">Farm Worker</SelectItem>
                                                <SelectItem value="Office Fielder">Office Fielder</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Keep empty for default" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSaving} className="bg-[#2FA4D7] text-white">
                                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-muted/40">
                            <TableHead className="pl-6 h-12">User Details</TableHead>
                            <TableHead className="h-12">Contact</TableHead>
                            <TableHead className="h-12 text-center">Role</TableHead>
                            <TableHead className="h-12 text-right pr-6">Joined</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center">
                                    <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-[#2FA4D7] opacity-50" />
                                </TableCell>
                            </TableRow>
                        ) : users.length > 0 ? (
                            users.map((u) => (
                                <TableRow key={u.user_id} className="hover:bg-muted/30 transition-colors border-b-muted/30 group">
                                    <TableCell className="pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#2FA4D7] text-xs">
                                                {u.full_name?.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{u.full_name}</span>
                                                <span className="text-[10px] text-muted-foreground">ID: #{u.user_id}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <MailIcon className="h-3 w-3" />
                                                {u.email}
                                            </div>
                                            {u.phone && (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <PhoneIcon className="h-3 w-3" />
                                                    {u.phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="outline"
                                            className={`rounded-md font-medium px-2 py-0.5 ${u.role === 'Admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                u.role === 'Doctor' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                }`}
                                        >
                                            <ShieldCheckIcon className="h-3 w-3 mr-1" />
                                            {u.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 text-muted-foreground text-[10px]">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
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
