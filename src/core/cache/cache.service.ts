import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisClientKey } from './cache.interface';

@Injectable()
export class CacheService {
    /**
     * 생성자에서 의존성 주입(DI)을 받는다.
     * @param redis 
     * Nest.js에게 'Redis' 타입이 아닌 'RedisClientKey' 토큰으로 등록된 프로바이더(redisConnect)를 this.redis 매개변수에 주입해달라고 요청
     */
  constructor(@Inject(RedisClientKey) private readonly redis: Redis) {}

  /**
   * [비공개 헬퍼] 키에 만료 시간(TTL)을 설정한다.
   * @param key redis 키
   * @param ttl 만료 시간(초). 기본값 0
   * @returns 
   */
  private async setTTL(key: string, ttl: number = 0) {
    // ioredis 클라이언트의 'expire'명령어를 실행
    return this.redis.expire(key, ttl);
  }

  /**
   * Redis에서 키(Key)에 해당하는 값을 가져온다.
   * @param key redis 키
   * @returns  키가 존재하면 문자열 값을, 없으면 null을 반환한다.
   */
  public async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  /**
   * redis에 키-값을 저장하고, 선택적으로 만료 시간(TTL)을 설정한다.
   * @param key Redis zl
   * @param value value 저정할 값(자동으로 문자열화도니다.)
   * @param ttl 만료 시간(초) (선택사항)
   */
  public async set(key: string, value: any, ttl?: number) {
    // 명령어로 키-값을 저장
    await this.redis.set(key, value);
    // ttl이 undefeind인 경우, setTTL의 기본값 0이 사용된다.
    await this.setTTL(key, ttl);
  }

  /**
   * Redis에서 특정 키를 삭제한다.
   */
  public async del(key: string) {
    await this.redis.del(key);
  }
}
