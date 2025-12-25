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
import { DataSource } from 'typeorm'; // 추가

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let hashService: any;
  let cacheService: any;
  let notificationService: any;
  let dataSource: any;

  // [핵심] 트랜잭션을 위한 Mock EntityManager 정의
  const mockEntityManager = {
    // withRepository가 호출되면 인자로 받은 원래의 repository를 그대로 반환하도록 설정
    withRepository: jest.fn().mockImplementation((repo) => repo),
    save: jest.fn(),
  };

  // [핵심] DataSource.transaction Mocking
  const mockDataSource = {
    // transaction 메서드가 실행되면 콜백 함수(manager => ...)를 실행시키고 
    // 위에서 만든 mockEntityManager를 전달합니다.
    transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    // 1. Mock 객체 정의
    const mockUserRepository = {
      findOneByFilters: jest.fn(),
      findOneOrThrow: jest.fn(),
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
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const mockNotificationService = {
      sendWelcomeNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // [추가] DataSource 의존성 주입
        { provide: DataSource, useValue: mockDataSource },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: TokenService, useValue: mockTokenService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: HASH_SERVICE, useValue: mockHashService },
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
    dataSource = module.get(DataSource);
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
      hashService.compare.mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrong');
      expect(result).toBeNull();
    });
  });

  describe('signUp', () => {
    const signUpBody: any = {
      email: 'new@test.com',
      password: '123',
      toEntity: jest.fn().mockReturnValue({ id: 'new-id' }),
    };

    it('정상적인 회원가입 시 리포지토리에 저장되고 캐시/알림이 호출되어야 한다.', async () => {
      userRepository.findOneByFilters.mockResolvedValue(null);
      hashService.hash.mockResolvedValue('hashed_123');

      await service.signUp(signUpBody);

      // 트랜잭션이 호출되었는지 확인
      expect(dataSource.transaction).toHaveBeenCalled();
      
      expect(userRepository.findOneByFilters).toHaveBeenCalledWith({
        email: signUpBody.email,
      });
      expect(hashService.hash).toHaveBeenCalledWith(signUpBody.password);
      
      // 트랜잭션 내에서 리포지토리가 사용되었는지 검증
      expect(userRepository.save).toHaveBeenCalled();
      
      expect(cacheService.set).toHaveBeenCalled();
      expect(notificationService.sendWelcomeNotification).toHaveBeenCalled();
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
      const user = { id: 'user-1', verified: true } as User;
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
      const user = { id: 'user-1', verified: false } as User;
      userRepository.findOneByFilters.mockResolvedValue(user);
      hashService.compare.mockResolvedValue(true);

      await expect(
        service.signIn({ email: 't@t.com', password: 'p' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('유저 검증 실패 시 UnauthorizedException을 던져야 한다.', async () => {
      userRepository.findOneByFilters.mockResolvedValue(null);

      await expect(
        service.signIn({ email: 't@t.com', password: 'p' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});