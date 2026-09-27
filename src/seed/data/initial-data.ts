import { ValidRoles } from '../../auth/interfaces/valid-roles';

interface SeedUser {
  userName: string;
  password: string;
  role: ValidRoles;
}

export const getSeedUsers = (
  adminPassword: string,
  managerPassword: string,
  userPassword: string,
): SeedUser[] => [
  { userName: 'admin', password: adminPassword, role: ValidRoles.admin },
  { userName: 'manager', password: managerPassword, role: ValidRoles.manager },
  { userName: 'user1', password: userPassword, role: ValidRoles.user },
];

export const SEED_ROLES = [
  ValidRoles.admin,
  ValidRoles.manager,
  ValidRoles.user,
];
