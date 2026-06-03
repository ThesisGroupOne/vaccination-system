export type Role = 'Admin' | 'Doctor' | 'Farm Worker';

export const PERMISSIONS = {
  Users: {
    view: ['Admin', 'Doctor'], // Note: Doctor can view but not edit
    edit: ['Admin'], // Edit means Add/Update/Delete
  },
  Animals: {
    view: ['Admin', 'Doctor', 'Farm Worker'],
    edit: ['Admin', 'Doctor'],
  },
  Vaccinations: {
    view: ['Admin', 'Doctor', 'Farm Worker'],
    edit: ['Admin', 'Doctor'],
  },
  Schedules: {
    view: ['Admin', 'Doctor', 'Farm Worker'],
    edit: ['Admin', 'Doctor'],
  },
  Alerts: {
    view: ['Admin', 'Doctor', 'Farm Worker'],
    edit: ['Admin', 'Doctor', 'Farm Worker'], // Farm Worker reports alerts, Doctor acts on them
  },
  Stock: {
    view: ['Admin', 'Doctor'],
    edit: ['Admin'], // Since no Office Fielder, Admin handles Stock
  },
  Vaccines: {
    view: ['Admin', 'Doctor'],
    edit: ['Admin'],
  },
  Suppliers: {
    view: ['Admin', 'Doctor'],
    edit: ['Admin'],
  },
  Farms: {
    view: ['Admin', 'Doctor', 'Farm Worker'],
    edit: ['Admin'],
  }
};

export const canView = (module: keyof typeof PERMISSIONS, role: string | null) => {
  if (!role) return false;
  if (role === 'Admin') return true;
  return PERMISSIONS[module].view.includes(role as Role);
};

export const canEdit = (module: keyof typeof PERMISSIONS, role: string | null) => {
  if (!role) return false;
  if (role === 'Admin') return true;
  return PERMISSIONS[module].edit.includes(role as Role);
};
