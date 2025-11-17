import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from './repository/user.repository';
import { User } from '../../entities/user/user.entity';
// 캐시 상수 및 서비스 토큰 임포트
import { CacheKeys, CacheServiceKey } from '../../core/cache/cache.interface';
import { CacheService } from '../../core/cache/cache.service';
// 캐시 데코레이터 임포트
import { Cache } from '../../core/cache/cache.decorator';

@Injectable()
export class UserService {
  constructor(
    // (선택적) 수동 캐시 제어(예: del)가 필요하면 주입받을 수 있습니다.
    @Inject(CacheServiceKey) private readonly cacheService: CacheService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * (캐시 자동 적용)
   * @Cache 데코레이터가 붙어있으므로, CacheModule이 이 메서드를 자동으로 래핑합니다.
   * - key: 'user/' (CacheKeys.User)
   * - ttl: 60초
   * - index: (기본값 0) -> 첫 번째 인자인 'userId'가 키의 접미사로 사용됩니다.
   * (최종 캐시 키: "user/userId값")
   */
  @Cache({ key: CacheKeys.User, ttl: 60 })
  async getUser(userId: User['id']) {
    // 개발자는 캐시 로직(get/set)을 신경 쓸 필요 없이
    // 순수한 비즈니스 로직(DB 조회)만 작성하면 됩니다.
    // 이 코드는 캐시가 없을 때만 실행됩니다.
    const user = await this.userRepository.findByIdOrThrow(userId);

    return user;
  }
}
