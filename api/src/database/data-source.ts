import { databaseEnvironment, environmentFiles } from './environment';
import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as path from 'path';
ConfigModule.forRoot({ envFilePath: environmentFiles });
export default new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : {
    ...databaseEnvironment(),
  }),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
});
