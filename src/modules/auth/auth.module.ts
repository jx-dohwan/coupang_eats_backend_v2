import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserRepositoryModule } from "../user/repository/user-repository.module";

@Module({
    imports: [UserRepositoryModule],
    controllers: [AuthController],
    providers: [AuthService]
})
export class AuthModule {}
