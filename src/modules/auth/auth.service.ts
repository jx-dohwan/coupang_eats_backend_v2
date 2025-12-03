import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '../../core/jwt/jwt.service';
import { User } from '../../entities/user/user.entity';
import { TokenPair } from '../../core/jwt/jwt.interface';
import { LoggerService } from '../../core/logger/logger.service';
import * as bcrypt from 'bcrypt';
import { Transactional } from 'typeorm-transactional';
import { SignUpBody } from './dto/request/signUp.body';
import { UserRepository } from '../user/repository/user.repository';
import { SignInBody } from './dto/request/signIn.body';

@Injectable()
export class AuthService {
  // 필요한 레포지토리와 서비스들을 주입받는다.
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly loggerService: LoggerService,
  ) {}

  // 이메일로 유저를 찾고, 비밀번호가 일치하는지 확인하는 유저 검증 로직
  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      // 1. 이메일 유저 조회
      const user = await this.userRepository.findOneByFilters({
        email,
      });
      if (!user) {
        return null;
      }

      // 비밀번호 비교(입력받은 평문 비밀번호 vs DB에 저장된 해시 비밀번호
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }
      // 검증 성공시 유제 객체 반환
      return user;
    } catch (error) {
      // 검증 과정에서 DB 에러 등이 발생하면 로그
      this.loggerService.error(
        this.validateUser.name,
        error,
        'Failed to Validate user',
      );
      return null;
    }
  }

  @Transactional() // 로직 중간에 실패 시 DB 상태를 롤백
  async signUp(body: SignUpBody): Promise<TokenPair> {
    const { email, password } = body;

    // 이미 가입된 이메일인지 확인(중복체크)
    const existingUser = await this.userRepository.findOneByFilters({
      email,
    });
    if (existingUser) {
      throw new ConflictException('User already exists'); // 409 Conflict 에러 발생
    }

    // 비밀번호 해싱(보안을 위해 비밀번호를 암호화하여 저장)
    const hashedPassword = await bcrypt.hash(password, 10);

    // DTO의 toEntity 메서드를 통해 엔터티로 변환하면서 해시된 비밀번호를 주입
    const user = await this.userRepository.save(body.toEntity(hashedPassword));

    // 가입 완료 후 바로 로그인 처리
    return this.jwtService.generateTokenPair(user.id);
  }

  async signIn(body: SignInBody): Promise<TokenPair> {
    const { email, password } = body;
    // 아이디/비번 검증
    const user = await this.validateUser(email, password);
    // 검증 실패 시 401 Unauthorized 예외 발생
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 검증 성공 시 토큰 발급
    return this.jwtService.generateTokenPair(user.id);
  }

  async signOut(userId: User['id'], accessToken: string): Promise<void> {
    // JwtService에 위임하여 Redis 등에 해당 토큰을 블랙리스트로 등록하는 등의 처리를 수행
    await this.jwtService.revokeAllUserTokens(userId, accessToken);
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // JwtService에 위임하여 Refresh Token의 유효성을 검사하고 새 토큰 쌍을 발급
    return await this.jwtService.refreshTokens(refreshToken);
  }
}
