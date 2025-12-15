import { Module } from '@nestjs/common';
import { UserRepositoryModule } from './repository/user-repository.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
    imports: [UserRepositoryModule],
    controllers: [UserController],
    providers: [UserService, UserRepositoryModule],
})
export class UserModule {}