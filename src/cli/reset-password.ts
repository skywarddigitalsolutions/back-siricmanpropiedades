/**
 * Comando del operador: blanquea la contraseña de un usuario desde el
 * servidor (no hay "olvidé mi contraseña" en la web).
 *
 *   producción: docker compose exec api node dist/cli/reset-password.js <userName>
 *   desarrollo: npm run admin:reset-password -- <userName>
 *
 * Pide la contraseña nueva dos veces sin mostrarla si hay terminal (TTY), o
 * la lee de stdin (una línea) si no. No toca el MFA del usuario. Cierra sus
 * sesiones abiertas (passwordChangedAt) y deja una entrada de auditoría.
 */
import { DataSource } from 'typeorm';
import {
  hashNewPassword,
  parseUserName,
  validateNewPassword,
} from './reset-password.helpers';

/** Lee una línea sin eco (TTY). */
function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = '';
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          reject(new Error('Cancelado'));
          return;
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

/** Lee la contraseña de stdin sin TTY: primera línea. */
async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8').split(/\r?\n/)[0];
}

async function readNewPassword(): Promise<string> {
  if (!process.stdin.isTTY) return readFromStdin();
  const first = await readHidden('Nueva contraseña: ');
  const second = await readHidden('Repetir contraseña: ');
  if (first !== second) throw new Error('Las contraseñas no coinciden');
  return first;
}

async function main(): Promise<void> {
  const userName = parseUserName(process.argv.slice(2));
  const password = await readNewPassword();
  const problem = validateNewPassword(password);
  if (problem) throw new Error(problem);

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await dataSource.initialize();
  try {
    const found: Array<{ id: string }> = await dataSource.query(
      'SELECT id FROM users WHERE user_name = $1',
      [userName],
    );
    if (found.length === 0)
      throw new Error(`No existe el usuario "${userName}"`);
    const { id } = found[0];

    const hash = await hashNewPassword(password);
    await dataSource.query(
      'UPDATE users SET password_hash = $1, password_changed_at = now(), updated_at = now() WHERE id = $2',
      [hash, id],
    );
    await dataSource.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, metadata)
       VALUES ('user.password_reset', 'user', $1, $2::jsonb)`,
      [id, JSON.stringify({ via: 'cli' })],
    );
    console.log(
      `Listo: se cambió la contraseña de "${userName}" y se cerraron sus sesiones abiertas. El MFA no se modificó.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Error inesperado';
  console.error(`Error: ${message}`);
  process.exit(1);
});
