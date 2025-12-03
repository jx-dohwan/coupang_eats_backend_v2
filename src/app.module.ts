import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { CoreModule } from './core/core.module';
import { RequestLoggerMiddleware } from './core/middleware/requestLogger.middleware';
import { AuthModule } from './modules/auth/auth.module';
const applicationModules = [UserModule, AuthModule];

@Module({
  imports: [CoreModule, ...applicationModules],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 모든 요청에 대해 로그 미들웨어를 실행하라
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
