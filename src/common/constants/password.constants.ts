/**
 * Política de contraseñas compartida por todos los DTOs que reciben una
 * contraseña (login, creación de usuario, blanqueo). Cambiala acá y aplica
 * en todos lados a la vez.
 */
export const PASSWORD_PATTERN =
  /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

export const PASSWORD_MESSAGE =
  'Password must have uppercase, lowercase letter and a number';

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 50;
