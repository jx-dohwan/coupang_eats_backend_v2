import { Transactional } from 'typeorm-transactional';
import { AuthService } from './auth.service';
import { UserRepository } from '../user/repository/user.repository';
import { TokenService } from '../../core/jwt/jwt.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '../../core/logger/logger.service';
import { HASH_SERVICE } from '../../core/hash/hash.interface';
import { User } from '../../entities/user/user.entity';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { CacheServiceKey } from '../../core/cache/cache.interface';
import { NOTIFICATION_SERVICE } from '../../core/notification/notification.interface';

// @Transactional 데코레이터 Mocking
jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => {},
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let hashService: any;
  let cacheService: any;
  let notificationService: any;

  beforeEach(async () => {
    // 1. Mock 객체 정의
    const mockUserRepository = {
      findOneByFilters: jest.fn(),
      findOneOrThrow: jest.fn(), // 추가됨
      save: jest.fn(),
    };
    const mockTokenService = {
      generateTokenPair: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      refreshTokens: jest.fn(),
    };
    const mockLoggerService = {
      error: jest.fn(),
    };
    const mockHashService = {
      compare: jest.fn(),
      hash: jest.fn(),
    };
    // [NEW] CacheService Mock
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    // [NEW] NotificationService Mock
    const mockNotificationService = {
      sendWelcomeNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: TokenService, useValue: mockTokenService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: HASH_SERVICE, useValue: mockHashService },
        // [NEW] 의존성 주입 추가
        { provide: CacheServiceKey, useValue: mockCacheService },
        { provide: NOTIFICATION_SERVICE, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    tokenService = module.get(TokenService);
    hashService = module.get(HASH_SERVICE);
    cacheService = module.get(CacheServiceKey);
    notificationService = module.get(NOTIFICATION_SERVICE);
  });

  describe('validateUser', () => {
    it('이메일이 존재하고 비밀번호가 일치하면 유저를 반환해야 한다.', async () => {
      const user = { id: '1', password: 'hashed_password' } as User;
      userRepository.findOneByFilters.mockResolvedValue(user);
      hashService.compare.mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', '1234');
      expect(result).toEqual(user);
    });

    it('유저가 존재하지 않으면 null을 반환해야 한다.', async () => {
      userRepository.findOneByFilters.mockResolvedValue(null);
      const result = await service.validateUser('no@test.com', '1234');
      expect(result).toBeNull();
    });

    it('비밀번호가 틀리면 null을 반환해야 한다.', async () => {
      const user = { id: '1', password: 'hashed_password' } as User;
      userRepository.findOneByFilters.mockResolvedValue(user);
      hashService.compare.mockResolvedValue(false); // 불일치

      const result = await service.validateUser('test@test.com', 'wrong');
      expect(result).toBeNull();
    });
  });

  describe('signUp', () => {
    const signUpBody: any = {
      email: 'new@test.com',
      password: '123',
      toEntity: jest.fn().mockReturnValue({}),
    };

    it('정상적인 회원가입 시 리포지토리에 저장되고 캐시/알림이 호출되어야 한다.', async () => {
      userRepository.findOneByFilters.mockResolvedValue(null); // 중복 없음
      hashService.hash.mockResolvedValue('hashed_123');

      await service.signUp(signUpBody);

      expect(userRepository.findOneByFilters).toHaveBeenCalledWith({
        email: signUpBody.email,
      });
      expect(hashService.hash).toHaveBeenCalledWith(signUpBody.password);
      expect(userRepository.save).toHaveBeenCalled();
      // 추가된 로직 검증
      expect(cacheService.set).toHaveBeenCalled(); // 이메일 인증 토큰 저장
      expect(notificationService.sendWelcomeNotification).toHaveBeenCalled(); // 메일 발송
    });

    it('이미 존재하는 이메일이면 ConflictException을 던져야 한다.', async () => {
      userRepository.findOneByFilters.mockResolvedValue({ id: '1' } as User);

      await expect(service.signUp(signUpBody)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('signIn', () => {
    it('로그인 성공 시 토큰 쌍을 반환해야 한다.', async () => {
      const user = { id: 'user-1', verified: true } as User; // verified: true 필수
      userRepository.findOneByFilters.mockResolvedValue(user);
      hashService.compare.mockResolvedValue(true);
      tokenService.generateTokenPair.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });

      const result = await service.signIn({
        email: 't@t.com',
        password: 'p',
      } as any);

      expect(result).toEqual({ accessToken: 'a', refreshToken: 'r' });
    });

    it('이메일 인증이 안 된 유저는 UnauthorizedException을 던져야 한다', async () => {
      const user = { id: 'user-1', verified: false } as User; // verified: false
      userRepository.findOneByFilters.mockResolvedValue(user);
      hashService.compare.mockResolvedValue(true);

      await expect(
        service.signIn({ email: 't@t.com', password: 'p' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('유저 검증 실패 시 UnauthorizedException을 던져야 한다.', async () => {
      userRepository.findOneByFilters.mockResolvedValue(null); // 유저 없음

      await expect(
        service.signIn({ email: 't@t.com', password: 'p' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
