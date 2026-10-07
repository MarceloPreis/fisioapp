import { environmentFiles } from './environment';
import { databaseConnectionOptions } from './connection-options';
import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as path from 'path';
ConfigModule.forRoot({ envFilePath: environmentFiles });
export default new DataSource({
  type: 'postgres',
  ...databaseConnectionOptions(process.env, true),
  entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
});
