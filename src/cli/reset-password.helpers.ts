import * as bcrypt from 'bcrypt';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../common/constants/password.constants';

/** User name from the command line (same normalisation as the login). */
export function parseUserName(args: string[]): string {
  const userName = args[0]?.trim().toLowerCase();
  if (!userName)
    throw new Error(
      'Uso: node dist/cli/reset-password.js <userName> (la contraseña se pide por teclado o por stdin)',
    );
  return userName;
}

/** Null when the password meets the login password policy, else a message. */
export function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH)
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  if (password.length > PASSWORD_MAX_LENGTH)
    return `La contraseña debe tener como máximo ${PASSWORD_MAX_LENGTH} caracteres`;
  if (!PASSWORD_PATTERN.test(password))
    return 'La contraseña debe tener mayúscula, minúscula y un número o símbolo';
  return null;
}

export function hashNewPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
