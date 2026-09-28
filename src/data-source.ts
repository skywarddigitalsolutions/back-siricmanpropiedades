import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource usado por el CLI de TypeORM (migration:generate/run/revert).
 * La app en runtime usa TypeOrmModule.forRootAsync (ver app.module.ts).
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
