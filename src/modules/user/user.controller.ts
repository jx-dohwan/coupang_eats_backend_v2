import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { User } from "../../entities/user/user.entity";
import { UserService } from "./user.service";

@Controller('users')
export class UserController {
    constructor(private readonly service: UserService) {}

    @Get('/:userId')
    async getUser(@Param('userId', ParseUUIDPipe) userId: User['id']) {
        return this.service.getUser(userId);
    }
}