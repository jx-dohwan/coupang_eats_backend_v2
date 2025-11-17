import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { CoreModule } from './core/core.module';

const applicationModules = [UserModule];

@Module({
  imports: [CoreModule, ... applicationModules],
})
export class AppModule {}
