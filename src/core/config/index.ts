export enum Env {
  test = 'test',
  local = 'local',
  dev = 'dev',
  prod = 'prod',
}

export interface AppConfig {
  PORT: string | number | null;
  BASE_URL: string;
  NODE_ENV: string;
  ENV: Env;
  NAME: string;
}

export interface RedisConfig {
  HOST: string;
  PORT: number | string;
}

export interface DBConfig {
  DB_HOST: string;
  DB_USER_NAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_PORT: number | string;
}

export interface Configurations {
  APP: AppConfig;
  DB: DBConfig;
  REDIS: RedisConfig;
}
