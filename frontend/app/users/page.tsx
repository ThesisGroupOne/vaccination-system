"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, PlusIcon, MoreHorizontalIcon, MailIcon, ShieldIcon, Loader2Icon } from 'lucide-react';

interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
}

export default function UsersPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    phone: '',
    password: ''
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:9999/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
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
      const payload = { ...formData };

      const res = await fetch('http://localhost:9999/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ full_name: '', email: '', role: '', phone: '', password: '' });
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to create user'}`);
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Users</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage system access, roles, and administrative tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchUsers} variant="outline" className="hidden sm:flex border-dashed bg-background shadow-xs hover:bg-muted/50 rounded-xl">
            Refresh
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-md transition-all hover:scale-[1.02]">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-2xl border-none shadow-2xl">
              <form onSubmit={handleSave}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">Create New User</DialogTitle>
                  <DialogDescription>
                    Enter the personal details and role to grant system access.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="full_name" className="text-right text-sm font-medium text-muted-foreground">Full Name</Label>
                    <Input id="full_name" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="e.g. John Doe" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right text-sm font-medium text-muted-foreground">Email</Label>
                    <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="name@example.com" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right text-sm font-medium text-muted-foreground">Phone</Label>
                    <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+252..." className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right text-sm font-medium text-muted-foreground">Role</Label>
                    <Input id="role" required value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="e.g. Veterinarian, Admin, Supplier" className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right text-sm font-medium text-muted-foreground">Password</Label>
                    <Input id="password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Secret..." className="col-span-3 rounded-lg bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/30" />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl hover:bg-muted" disabled={isSaving}>Cancel</Button>
                  <Button type="submit" className="rounded-xl shadow-md" disabled={isSaving}>
                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border-muted/60 shadow-xs bg-background overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-muted/40 bg-muted/10 pb-4 pt-5 px-6">
          <div className="flex flex-col space-y-1.5">
            <CardTitle className="text-lg font-semibold">System Users</CardTitle>
            <CardDescription className="text-xs">A list of all users authorized to access the system.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72 group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search by name, email or role..."
              className="pl-9 rounded-full bg-background border-muted/60 shadow-sm focus-visible:ring-primary/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent border-b-muted/40">
                <TableHead className="w-[250px] font-medium text-muted-foreground/80 pl-6 h-12">User</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Role</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12 hidden md:table-cell">Phone / Created</TableHead>
                <TableHead className="font-medium text-muted-foreground/80 h-12">Status</TableHead>
                <TableHead className="text-right pr-6 h-12 w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2Icon className="h-8 w-8 mb-2 animate-spin opacity-50" />
                      <p>Loading users...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id} className="cursor-pointer hover:bg-muted/30 transition-colors border-b-muted/30 group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 xl:h-10 xl:w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 border text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-background">
                          {user.full_name?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MailIcon className="w-3 h-3" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {user.role === 'Admin' && <ShieldIcon className="w-4 h-4 text-rose-500" />}
                        {user.role}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {user.phone || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="rounded-md font-medium px-2 py-0.5 shadow-none text-xs">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <SearchIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p>No users found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}