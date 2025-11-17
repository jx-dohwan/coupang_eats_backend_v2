// 'CacheService'를 DI(의존성 주입) 시스템에 등록하고 주입받기 위한 고유 토큰(Key)이다.
export const CacheServiceKey = Symbol('CacheServiceKey');
// 'RedisClient'를 DI 시스템에 등록하고 주입받기 위한 고유 토큰(key)이다.
export const RedisClientKey = Symbol('RedisClientKey');


/**
 * 캐시 관련 함수를 사용할 때 필요한 옵션(key, ttl)의 타입을 정의하는 인터페이스이다.
 */
export interface ICacheOptions {
    key: string;
    ttl: number;
}