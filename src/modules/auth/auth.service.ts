import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { TokenService } from '../../core/jwt/jwt.service';
import { User } from '../../entities/user/user.entity';
import { TokenPair } from '../../core/jwt/jwt.interface';
import { LoggerService } from '../../core/logger/logger.service';
import { HASH_SERVICE } from '../../core/hash/hash.interface';
import { Transactional } from 'typeorm-transactional';
import type { IHashService } from '../../core/hash/hash.interface'; 
import { SignUpBody } from './dto/request/signUp.body';
import { UserRepository } from '../user/repository/user.repository';
import { SignInBody } from './dto/request/signIn.body';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly loggerService: LoggerService,
    // 의존성 역전 원칙 적용: 구현체(BcryptService) 대신 인터페이스(HASH_SERVICE) 주입
    @Inject(HASH_SERVICE) private readonly hashService: IHashService,
  ) {}

  /**
   * [유저 검증] 이메일 존재 여부 및 비밀번호 일치 확인
   * 성공 시 User 객체, 실패 시 null 반환
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOneByFilters({ email });

      // 유저가 없거나 비밀번호가 틀리면 null 반환
      if (!user || !(await this.hashService.compare(password, user.password))) {
        return null;
      }

      return user;
    } catch (error) {
      this.loggerService.error(
        this.validateUser.name,
        error,
        'Failed to Validate user',
      );
      return null;
    }
  }

  /**
   * [회원가입] 유저 생성
   * @Transactional 데코레이터로 DB 작업 원자성 보장
   */
  @Transactional()
  async signUp(body: SignUpBody): Promise<void> {
    const { email, password } = body;

    // 1. 이메일 중복 검사
    const existingUser = await this.userRepository.findOneByFilters({ email });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // 2. 비밀번호 암호화 (Hashing)
    const hashedPassword = await this.hashService.hash(password);

    // 3. 유저 저장
    await this.userRepository.save(body.toEntity(hashedPassword));
  }

  /**
   * [로그인] 유저 검증 후 토큰 발급
   */
  async signIn(body: SignInBody): Promise<TokenPair> {
    const { email, password } = body;

    // 1. 아이디/비밀번호 확인
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Access/Refresh 토큰 쌍 생성 및 반환
    return this.tokenService.generateTokenPair(user.id);
  }

  /**
   * [로그아웃] Refresh Token 삭제 및 Access Token 블랙리스트 처리
   */
  async signOut(userId: User['id'], accessToken: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId, accessToken);
  }

  /**
   * [토큰 갱신] Refresh Token을 이용해 새로운 토큰 쌍 발급 (RTR)
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    return this.tokenService.refreshTokens(refreshToken);
  }
}
