"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheckIcon, 
  SaveIcon, 
  RotateCcwIcon, 
  CheckIcon, 
  UserCircleIcon,
  ChevronRightIcon,
  UserCheckIcon,
  Loader2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_PERMISSIONS, getPermissions, savePermissions, Role } from '@/lib/permissions';

const API = 'http://localhost:9999';

type SystemUser = {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
  is_active?: boolean;
  is_authorized?: boolean;
};

export default function RolesPermissionsPage() {
  const [permissions, setPermissions] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('Doctor');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [actingUserId, setActingUserId] = useState<number | null>(null);

  const roles: { id: Role, name: string, desc: string }[] = [
    { id: 'Admin', name: 'Admin', desc: 'Full system access' },
    { id: 'Doctor', name: 'Doctor', desc: 'Medical operations' },
    { id: 'Farm Worker', name: 'Farm Worker', desc: 'Field operations' },
  ];
  
  const modules = Object.keys(DEFAULT_PERMISSIONS);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    setPermissions(getPermissions());
    if (token) {
      fetchUsers();
    }
  }, [token, fetchUsers]);

  const handleCheckboxChange = (module: string, action: 'view' | 'create' | 'edit' | 'delete', role: Role, checked: boolean) => {
    setPermissions((prev: any) => {
      const newPerms = { ...prev };
      
      if (!newPerms[module]) {
        newPerms[module] = { view: [], create: [], edit: [], delete: [] };
      }
      
      const roleList = newPerms[module][action] || [];
      
      if (checked) {
        if (!roleList.includes(role)) {
          newPerms[module][action] = [...roleList, role];
        }
      } else {
        newPerms[module][action] = roleList.filter((r: Role) => r !== role);
      }
      return newPerms;
    });
    setIsSaved(false);
  };

  const handleSave = () => {
    savePermissions(permissions);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all permissions to default?')) {
      setPermissions(DEFAULT_PERMISSIONS);
      savePermissions(DEFAULT_PERMISSIONS);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const setAuthorization = async (userId: number | null, authorize: boolean) => {
    setAuthLoading(true);
    setActingUserId(userId);
    try {
      const res = await fetch(`${API}/api/users/authorization`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          authorize && userId != null
            ? { user_id: userId, is_authorized: true }
            : { is_authorized: false }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to update authorization');
        return;
      }
      toast.success(data.message || 'Authorization updated');
      await fetchUsers();
    } catch {
      toast.error('Network error while updating authorization');
    } finally {
      setAuthLoading(false);
      setActingUserId(null);
    }
  };

  if (!permissions) return <div className="p-6">Loading...</div>;

  const isAdmin = selectedRole === 'Admin';
  const doctors = users.filter((u) => u.role === 'Doctor' && u.is_active !== false);
  const authorizedDoctor = doctors.find((u) => u.is_authorized);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <ShieldCheckIcon className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Roles & Permissions</h1>
            <p className="text-sm text-gray-500 font-medium">
              Select a role and configure what it can view, create, update, or delete.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <RotateCcwIcon className="w-4 h-4" />
            Reset to Default
          </button>
          <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all shadow-md ${
              isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaved ? <CheckIcon className="w-4 h-4" /> : <SaveIcon className="w-4 h-4" />}
            {isSaved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Roles Sidebar */}
        <div className="w-full md:w-1/3 space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2">System Roles</h2>
          {roles.map((role) => {
            const count = users.filter((u) => u.role === role.id).length;
            return (
              <div 
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                  selectedRole === role.id 
                    ? 'bg-blue-600 border-blue-600 shadow-md transform scale-[1.02]' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedRole === role.id ? 'bg-white/20' : 'bg-blue-50'}`}>
                    <UserCircleIcon className={`w-6 h-6 ${selectedRole === role.id ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${selectedRole === role.id ? 'text-white' : 'text-gray-900'}`}>{role.name}</h3>
                    <p className={`text-xs ${selectedRole === role.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {role.desc} · {count} user{count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className={`w-5 h-5 ${selectedRole === role.id ? 'text-white' : 'text-gray-300'}`} />
              </div>
            );
          })}

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-800 text-sm space-y-1">
            <p className="font-semibold">Admin Role</p>
            <p>The Admin has full access by default. You cannot restrict the Admin role.</p>
            <p className="text-blue-700/80 pt-1">Manage user roles and login access from the <span className="font-semibold">Users</span> page.</p>
          </div>

          {/* User assigned = authorize one Doctor before jobs arrive */}
          <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCheckIcon className="w-4.5 h-4.5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">User assigned</h3>
                  <p className="text-[11px] text-slate-500">Authorize one Doctor — others see no jobs.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchUsers}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
              {selectedRole === 'Admin' ? (
                <p className="text-xs text-slate-500">Select <span className="font-semibold">Doctor</span> to manage work authorization.</p>
              ) : selectedRole === 'Farm Worker' ? (
                <p className="text-xs text-slate-500">Work authorization applies to Doctors. Farm Workers use field alerts.</p>
              ) : (
                <>
                  <div className={`rounded-lg border px-3 py-2 ${authorizedDoctor ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Currently authorized</p>
                    {authorizedDoctor ? (
                      <p className="text-xs font-bold text-emerald-800">{authorizedDoctor.full_name}</p>
                    ) : (
                      <p className="text-xs font-semibold text-amber-800">None — doctors can log in but will not see jobs.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Doctors ({doctors.length})
                    </p>
                    {doctors.length === 0 ? (
                      <p className="text-xs text-slate-400">No active Doctor users.</p>
                    ) : (
                      <div className="space-y-2">
                        {doctors.map((u) => {
                          const isAuth = Boolean(u.is_authorized);
                          const busy = authLoading && actingUserId === u.user_id;
                          return (
                            <div key={u.user_id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{u.full_name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                                </div>
                                <span
                                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isAuth
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {isAuth ? 'Authorized' : 'No access'}
                                </span>
                              </div>
                              <div className="mt-2 flex gap-2">
                                {isAuth ? (
                                  <button
                                    type="button"
                                    disabled={authLoading}
                                    onClick={() => setAuthorization(null, false)}
                                    className="h-8 px-3 rounded-lg border border-rose-200 bg-white text-rose-600 text-[11px] font-bold hover:bg-rose-50 disabled:opacity-50"
                                  >
                                    {busy ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : 'Revoke'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={authLoading}
                                    onClick={() => setAuthorization(u.user_id, true)}
                                    className="h-8 px-3 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {busy ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : 'Authorize'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Before jobs arrive, pick one Doctor. Only that user sees active work and notifications. Other Doctors can still log in, but nothing is shown until Admin authorizes them (authorizing someone else moves open jobs to them).
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Permissions Editor */}
        <div className="w-full md:w-2/3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Permissions for {selectedRole}</h2>
              <p className="text-sm text-gray-500">Configure what this role can see in the sidebar and what actions they can perform.</p>
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[720px] overflow-y-auto">
              {modules.map((module) => {
                const canView = permissions[module]?.view?.includes(selectedRole) || false;
                const canCreate = permissions[module]?.create?.includes(selectedRole) || false;
                const canEdit = permissions[module]?.edit?.includes(selectedRole) || false;
                const canDelete = permissions[module]?.delete?.includes(selectedRole) || false;
                
                const isDashboardWidget = module.startsWith('Dashboard') || module === 'DoctorWidgets' || module === 'WorkerWidgets';
                
                return (
                  <div key={module} className="p-5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{module.replace(/([A-Z])/g, ' $1').trim()}</h3>
                      <p className="text-xs text-gray-500">
                        {canView 
                          ? (isDashboardWidget ? 'Visible on dashboard. ' : 'Visible in sidebar. ') 
                          : (isDashboardWidget ? 'Hidden from dashboard. ' : 'Hidden from sidebar. ')}
                        {!isDashboardWidget && 'Manage specific actions below.'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mt-4 sm:mt-0">
                      <label className={`flex items-center gap-2 text-sm font-medium ${isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input 
                          type="checkbox" 
                          checked={isAdmin ? true : canView}
                          disabled={isAdmin}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            handleCheckboxChange(module, 'view', selectedRole, checked);
                            if (!checked) {
                              if (canCreate) handleCheckboxChange(module, 'create', selectedRole, false);
                              if (canEdit) handleCheckboxChange(module, 'edit', selectedRole, false);
                              if (canDelete) handleCheckboxChange(module, 'delete', selectedRole, false);
                            }
                          }}
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex flex-col">
                          <span>{isDashboardWidget ? 'Show on Dashboard' : 'View / Show'}</span>
                        </div>
                      </label>
                      
                      {!isDashboardWidget && (
                        <>
                          <label className={`flex items-center gap-2 text-sm font-medium ${isAdmin || (!canView && !isAdmin) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input 
                              type="checkbox" 
                              checked={isAdmin ? true : canCreate}
                              disabled={isAdmin || (!canView && !isAdmin)}
                              onChange={(e) => handleCheckboxChange(module, 'create', selectedRole, e.target.checked)}
                              className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            />
                            <span>Create</span>
                          </label>
                          
                          <label className={`flex items-center gap-2 text-sm font-medium ${isAdmin || (!canView && !isAdmin) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input 
                              type="checkbox" 
                              checked={isAdmin ? true : canEdit}
                              disabled={isAdmin || (!canView && !isAdmin)}
                              onChange={(e) => handleCheckboxChange(module, 'edit', selectedRole, e.target.checked)}
                              className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                            />
                            <span>Update</span>
                          </label>

                          <label className={`flex items-center gap-2 text-sm font-medium ${isAdmin || (!canView && !isAdmin) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input 
                              type="checkbox" 
                              checked={isAdmin ? true : canDelete}
                              disabled={isAdmin || (!canView && !isAdmin)}
                              onChange={(e) => handleCheckboxChange(module, 'delete', selectedRole, e.target.checked)}
                              className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                            />
                            <span>Delete</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
