import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface AttemptRecord {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number | null;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_TRACKED_ACCOUNTS = 10_000;

/**
 * Límite de intentos de login POR CUENTA (complementa al ThrottlerGuard,
 * que limita por IP y es evadible con un ataque distribuido): 5 fallos en
 * 15 minutos bloquean la cuenta por 15 minutos.
 *
 * El estado vive en memoria: si corrés múltiples instancias detrás de un
 * balanceador, cada una lleva su propio contador (el límite efectivo se
 * multiplica por N instancias). Para un límite global compartido,
 * reemplazar el Map por un storage externo (Redis).
 */
@Injectable()
export class LoginThrottleService {
  private readonly attempts = new Map<string, AttemptRecord>();

  /** Lanza 429 si la cuenta está bloqueada por intentos fallidos. */
  assertNotLocked(userName: string): void {
    const record = this.attempts.get(this.normalize(userName));
    if (!record?.lockedUntil) return;

    if (Date.now() < record.lockedUntil) {
      const retryAfterSeconds = Math.ceil(
        (record.lockedUntil - Date.now()) / 1000,
      );
      throw new HttpException(
        `Too many failed login attempts. Try again in ${retryAfterSeconds} seconds`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // El bloqueo ya venció: se resetea el contador.
    this.attempts.delete(this.normalize(userName));
  }

  recordFailure(userName: string): void {
    const key = this.normalize(userName);
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now - record.windowStartedAt > WINDOW_MS) {
      this.evictIfFull();
      this.attempts.set(key, {
        failures: 1,
        windowStartedAt: now,
        lockedUntil: null,
      });
      return;
    }

    record.failures += 1;
    if (record.failures >= MAX_FAILURES) record.lockedUntil = now + LOCK_MS;
  }

  recordSuccess(userName: string): void {
    this.attempts.delete(this.normalize(userName));
  }

  private normalize(userName: string): string {
    return userName.toLowerCase().trim();
  }

  /**
   * Tope de memoria: si el Map crece demasiado (p. ej. un ataque que prueba
   * millones de userNames), se descartan las entradas más viejas ya vencidas.
   */
  private evictIfFull(): void {
    if (this.attempts.size < MAX_TRACKED_ACCOUNTS) return;

    const now = Date.now();
    for (const [key, record] of this.attempts) {
      const windowExpired = now - record.windowStartedAt > WINDOW_MS;
      const lockExpired = !record.lockedUntil || now > record.lockedUntil;
      if (windowExpired && lockExpired) this.attempts.delete(key);
    }

    // Si ni así hay lugar (todo el Map está "vivo"), sacrificar la más vieja.
    if (this.attempts.size >= MAX_TRACKED_ACCOUNTS) {
      for (const key of this.attempts.keys()) {
        this.attempts.delete(key);
        break;
      }
    }
  }
}
