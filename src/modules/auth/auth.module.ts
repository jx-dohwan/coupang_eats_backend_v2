import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserRepositoryModule } from '../user/repository/user-repository.module';
import { HashModule } from '../../core/hash/hash.module';

@Module({
  imports: [UserRepositoryModule, HashModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
