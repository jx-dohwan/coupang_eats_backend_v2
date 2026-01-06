import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../dotenv/.env.local') });

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [path.join(__dirname, '/**/entities/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/*{.ts,.js}')],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  connectorPackage: 'mysql2',
});

// 값이 잘 들어오는지 다시 한 번 확인합니다.
console.log('--- DB 접속 정보 확인 ---');
console.log('Path:', path.join(__dirname, '../dotenv/.env.local'));
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER_NAME);