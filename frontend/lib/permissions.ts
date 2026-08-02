export type Role = 'Admin' | 'Doctor' | 'Farm Worker';

export const DEFAULT_PERMISSIONS = {
  Users: { view: ['Admin', 'Doctor'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  Animals: { view: ['Admin', 'Doctor', 'Farm Worker'], create: ['Admin', 'Doctor', 'Farm Worker'], edit: ['Admin'], delete: ['Admin'] },
  Vaccinations: { view: ['Admin', 'Doctor', 'Farm Worker'], create: ['Admin', 'Doctor'], edit: ['Admin', 'Doctor'], delete: ['Admin'] },
  Schedules: { view: ['Admin', 'Doctor', 'Farm Worker'], create: ['Admin', 'Doctor'], edit: ['Admin', 'Doctor'], delete: ['Admin'] },
  Alerts: { view: ['Admin', 'Doctor', 'Farm Worker'], create: ['Admin', 'Doctor', 'Farm Worker'], edit: ['Admin', 'Doctor', 'Farm Worker'], delete: ['Admin', 'Doctor'] },
  Stock: { view: ['Admin', 'Doctor'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  Vaccines: { view: ['Admin', 'Doctor'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  Suppliers: { view: ['Admin', 'Doctor'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  Farms: { view: ['Admin', 'Doctor', 'Farm Worker'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  Reports: { view: ['Admin'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  ActivityLogs: { view: ['Admin'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  Settings: { view: ['Admin', 'Doctor'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  VaccineRequests: { view: ['Admin', 'Doctor'], create: ['Admin', 'Doctor'], edit: ['Admin'], delete: ['Admin'] },
  // Dashboard specific widgets (only view is actively used)
  DashboardStats: { view: ['Admin'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  DashboardFarms: { view: ['Admin'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  DashboardActivities: { view: ['Admin'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  DashboardCharts: { view: ['Admin'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  DashboardInventory: { view: ['Admin'], create: ['Admin'], edit: ['Admin'], delete: ['Admin'] },
  DoctorWidgets: { view: ['Admin', 'Doctor'], create: ['Admin', 'Doctor'], edit: ['Admin', 'Doctor'], delete: ['Admin', 'Doctor'] },
  WorkerWidgets: { view: ['Admin', 'Farm Worker'], create: ['Admin', 'Farm Worker'], edit: ['Admin', 'Farm Worker'], delete: ['Admin', 'Farm Worker'] }
};

export const getPermissions = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('system_permissions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old permissions (which only had view and edit)
        Object.keys(DEFAULT_PERMISSIONS).forEach(key => {
          if (parsed[key]) {
            if (!parsed[key].create) parsed[key].create = [...(parsed[key].edit || [])];
            if (!parsed[key].delete) parsed[key].delete = [...(parsed[key].edit || [])];
          } else {
             // If a completely new module was added to DEFAULT_PERMISSIONS
             parsed[key] = (DEFAULT_PERMISSIONS as any)[key];
          }
        });
        return parsed;
      } catch (e) {
        return DEFAULT_PERMISSIONS;
      }
    }
  }
  return DEFAULT_PERMISSIONS;
};

export const savePermissions = (permissions: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('system_permissions', JSON.stringify(permissions));
  }
};

export const canView = (module: keyof typeof DEFAULT_PERMISSIONS, role: string | null) => {
  if (!role) return false;
  if (role === 'Admin') return true;
  const permissions = getPermissions();
  if (!permissions[module]) return false;
  return permissions[module].view.includes(role as Role);
};

export const canCreate = (module: keyof typeof DEFAULT_PERMISSIONS, role: string | null) => {
  if (!role) return false;
  if (role === 'Admin') return true;
  const permissions = getPermissions();
  if (!permissions[module]) return false;
  return permissions[module].create?.includes(role as Role) || false;
};

export const canEdit = (module: keyof typeof DEFAULT_PERMISSIONS, role: string | null) => {
  if (!role) return false;
  if (role === 'Admin') return true;
  const permissions = getPermissions();
  if (!permissions[module]) return false;
  return permissions[module].edit.includes(role as Role);
};

export const canDelete = (module: keyof typeof DEFAULT_PERMISSIONS, role: string | null) => {
  if (!role) return false;
  if (role === 'Admin') return true;
  const permissions = getPermissions();
  if (!permissions[module]) return false;
  return permissions[module].delete?.includes(role as Role) || false;
};
