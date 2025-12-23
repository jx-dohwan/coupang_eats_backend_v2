import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserRepositoryModule } from '../user/repository/user-repository.module';
import { HashModule } from '../../core/hash/hash.module';
import { CacheModule } from '../../core/cache/cache.module';
import { NotificationModule } from '../../core/notification/notification.module';

@Module({
  imports: [UserRepositoryModule, HashModule, CacheModule, NotificationModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
