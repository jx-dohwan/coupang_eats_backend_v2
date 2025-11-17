import { Configurations, Env } from './index';

export const configurations = (): Configurations => {
  const env = (process.env.NODE_ENV ?? Env.local) as Env;

  return {
    APP: {
      NAME: process.env.NAME || '',
      BASE_URL: process.env.BASE_URL || '',
      PORT: process.env.PORT || 3000,
      NODE_ENV: process.env.NODE_ENV || 'local',
      ENV: env,
    },
    DB: {
      DB_HOST: process.env.DB_HOST || '',
      DB_USER_NAME: process.env.DB_USER_NAME || '',
      DB_PASSWORD: process.env.DB_PASSWORD || '',
      DB_DATABASE: process.env.DB_DATABASE || '',
      DB_PORT: process.env.DB_PORT || 5432,
    },
    REDIS: {
      HOST: process.env.REDIS_HOST || '',
      PORT: process.env.REDIS_PORT || 6379,
    },
  };
};
