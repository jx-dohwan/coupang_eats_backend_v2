import { DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  TypeOrmModule as OrmModule,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import * as path from 'path';
import { Env } from '../../config';
import { MoinConfigService } from '../../config/config.service';
import { DataSourceOptions, DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
// [삭제] typeorm-transactional 관련 import 제거

export class TypeOrmModule {
  private static instance?: DynamicModule;

  static forRoot(): DynamicModule {
    if (!this.instance) {
      // [삭제] initializeTransactionalContext() 호출 제거

      this.instance = OrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [MoinConfigService],
        useFactory: async (
          configService: MoinConfigService,
        ): Promise<TypeOrmModuleOptions> => {
          const dbConfig = configService.getDBConfig();
          const env = configService.getAppConfig().ENV;
          const isDevelopment = env === Env.test || env === Env.local;

          const entitiesPath = path.join(
            __dirname,
            './../../../entities/**/*.entity{.ts,.js}',
          );

          return {
            type: 'mysql',
            host: dbConfig.DB_HOST,
            port: Number(dbConfig.DB_PORT),
            database: dbConfig.DB_DATABASE,
            username: dbConfig.DB_USER_NAME,
            password: dbConfig.DB_PASSWORD,
            entities: [entitiesPath],
            namingStrategy: new SnakeNamingStrategy(),
            synchronize: isDevelopment,
            logging: true,
          };
        },
        // [수정] dataSourceFactory에서 래핑 로직 제거
        async dataSourceFactory(options?: DataSourceOptions) {
          if (!options) throw new Error('Invalid options passed');
          // 순수한 DataSource 인스턴스 반환
          return new DataSource(options);
        },
      });
    }
    return this.instance;
  }
}
