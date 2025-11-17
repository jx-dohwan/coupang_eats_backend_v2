import { Injectable } from "@nestjs/common";
import { UserRepository } from "./repository/user.repository";
import { User } from "../../entities/user/user.entity";

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async getUser(userId: User['id']) {
        const user = await this.userRepository.findByIdOrThrow(userId);

        return user;
    }
}