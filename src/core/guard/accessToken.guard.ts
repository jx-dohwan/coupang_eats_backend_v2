import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { JwtService } from '../jwt/jwt.service';
import { LoggerService } from '../logger/logger.service';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator';
import { isRFC3339 } from 'class-validator';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt-access') {
  constructor(
    private reflector: Reflector, // 메타데이터(데코레이터 정보) 읽기용
    private jwtService: JwtService,
    private loggerService: LoggerService,
  ) {
    super();
  }

  // 가드 실행 진입점, 요청이 들어오면 가장 먼저 실행되는 메서드이다.
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // @Public() 데코레이터가 붙어있는지
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 메서드 레벨 확인
      context.getClass(), // 클래스 레벨 확인
    ]);
    if (isPublic) { // public이면 인증 검사 없이 통과(true 반환)
      return true;
    }

    // public이 아니면 부모 로직 실행 -> Strategy의 validate() 호출됨
    return super.canActivate(context);
  }

  /**
   * 요청 처리 핸들러로 Strategy 검증이 끝난 후 호출된다. 예외 처리를 커스텀
   * @param err  - Passport 내부 에러
   * @param user - Strategy의 validate()가 반환한 유저 객체
   * @returns 
   */
  handleRequest(err: any, user: any) {
    // 에러가 있거나 유저를 찾지 못했으면 예외 발생
    if (err) throw new UnauthorizedException(err.message);
    if (!user) throw new UnauthorizedException('invalid token');

    // 성공 로그 남기기
    this.loggerService.info(
      this.handleRequest.name,
      `AccessTokenGuard Success: userId: ${user.id}`,
    );
    return user;
  }
}
