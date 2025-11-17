import { ClassProvider, FactoryProvider, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { CacheServiceKey, RedisClientKey } from './cache.interface';

/**
 * 팩토리 프로바이더를 사용해 ioredis 클라이언트 인스턴스를 생성한다.
 * 'useFactory'를 사용하면 비동기 연결도 처리할 수 있다.
 */
const redisConnect: FactoryProvider = {
  // 'RedisClientKey' 심볼을 프로바이더의 고유 토큰(Key)으로 사용한다. (클래스 타입이 아닌 값을 주입할 때 사용F)
  provide: RedisClientKey,
  // 이 함수가 실행되어 실제 redis 클라이언트 인스턴스를 생성하고 반환하낟.
  useFactory: async () => {
    const client = new Redis({
      port: 6379,
      host: '127.0.0.1',
      // (참고) 실제 프로덕션에서는 host, port 등을 ConfigService에서 (.env) 읽어옵니다.
    });
    // 연결된 클라이언트 인스턴스를 반환
    return client;
  },
};

/**
 * CacheService를 Nest.js에 프로바이더로 등록한다. 이 또한 커스텀 토큰인 'CacheSErviceKey'를 사용한다.
 */
const cacheService: ClassProvider = {
  provide: CacheServiceKey,
  useClass: CacheService,
};

@Module({
  providers: [redisConnect, cacheService],
  exports: [cacheService],
})
export class CacheModule {}
