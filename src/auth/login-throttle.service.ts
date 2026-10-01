import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface AttemptRecord {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number | null;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;

/**
 * Límite de intentos con clave arbitraria (complementa al ThrottlerGuard,
 * que limita por IP): 5 fallos en 15 minutos bloquean esa clave por 15
 * minutos. Se usa con dos tipos de clave (ver `loginKey` y `mfaKey`):
 * - login: (userName, IP). Atar el bloqueo a la IP evita que un atacante
 *   bloquee a la cuenta real (p. ej. "admin") desde otra IP.
 * - MFA: userId, sin IP. El segundo factor tiene un espacio de búsqueda
 *   chico (6 dígitos), así que el límite debe valer aunque el atacante
 *   rote de IP.
 *
 * El estado vive en memoria: si corrés múltiples instancias detrás de un
 * balanceador, cada una lleva su propio contador (el límite efectivo se
 * multiplica por N instancias). Para un límite global compartido,
 * reemplazar el Map por un storage externo (Redis).
 */
@Injectable()
export class LoginThrottleService {
  private readonly attempts = new Map<string, AttemptRecord>();

  /** Clave de login: cuenta + IP del cliente. */
  static loginKey(userName: string, ip: string): string {
    return `login:${userName.toLowerCase().trim()}|${ip}`;
  }

  /** Clave de verificación MFA: solo el usuario (vale desde cualquier IP). */
  static mfaKey(userId: string): string {
    return `mfa:${userId}`;
  }

  /** Lanza 429 si la clave está bloqueada por intentos fallidos. */
  assertNotLocked(key: string): void {
    const record = this.attempts.get(key);
    if (!record?.lockedUntil) return;

    if (Date.now() < record.lockedUntil) {
      const retryAfterSeconds = Math.ceil(
        (record.lockedUntil - Date.now()) / 1000,
      );
      throw new HttpException(
        `Too many failed attempts. Try again in ${retryAfterSeconds} seconds`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // El bloqueo ya venció: se resetea el contador.
    this.attempts.delete(key);
  }

  /**
   * Registra un fallo. Devuelve true si con este fallo (o antes) la clave
   * quedó bloqueada.
   */
  recordFailure(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now - record.windowStartedAt > WINDOW_MS) {
      this.evictIfFull();
      this.attempts.set(key, {
        failures: 1,
        windowStartedAt: now,
        lockedUntil: null,
      });
      return false;
    }

    record.failures += 1;
    if (record.failures >= MAX_FAILURES) record.lockedUntil = now + LOCK_MS;
    return record.lockedUntil !== null;
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Tope de memoria: si el Map crece demasiado (p. ej. un ataque que prueba
   * millones de userNames o IPs), se descartan las entradas más viejas ya
   * vencidas.
   */
  private evictIfFull(): void {
    if (this.attempts.size < MAX_TRACKED_KEYS) return;

    const now = Date.now();
    for (const [key, record] of this.attempts) {
      const windowExpired = now - record.windowStartedAt > WINDOW_MS;
      const lockExpired = !record.lockedUntil || now > record.lockedUntil;
      if (windowExpired && lockExpired) this.attempts.delete(key);
    }

    // Si ni así hay lugar (todo el Map está "vivo"), sacrificar la más vieja.
    if (this.attempts.size >= MAX_TRACKED_KEYS) {
      for (const key of this.attempts.keys()) {
        this.attempts.delete(key);
        break;
      }
    }
  }
}
