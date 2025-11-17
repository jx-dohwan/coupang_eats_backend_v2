import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from './repository/user.repository';
import { User } from '../../entities/user/user.entity';
import { CacheServiceKey } from '../../core/cache/cache.interface';
import { CacheService } from '../../core/cache/cache.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(CacheServiceKey) private readonly cacheService: CacheService,
    private readonly userRepository: UserRepository,
  ) {}

  async getUser(userId: User['id']) {
    const user = await this.userRepository.findByIdOrThrow(userId);

    return user;
  }
}
