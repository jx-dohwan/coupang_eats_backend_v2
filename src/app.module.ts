import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { CoreModule } from './core/core.module';
import { RequestLoggerMiddleware } from './core/middleware/requestLogger.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { Module } from '@nestjs/common';


const applicationModules = [UserModule, AuthModule];

@Module({
  imports: [CoreModule, ...applicationModules],
  controllers: [],
  providers: [],
})
export class AppModule {}

