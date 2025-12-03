import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { MoinConfigService } from '../config/config.service';
import { JwtPayload, TokenType } from './jwt.interface';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: MoinConfigService) {
    const jwtConfig = configService.getJwtConfig();
    // 부모 클래스에 설정을 넘겨준다.
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // body의 refreshToken 필드에 담겨온다.
      ignoreExpiration: false, // 만료된 토큰을 허용할지 여부
      secretOrKey: jwtConfig.JWT_REFRESH_SECRET,  // 토큰 서명을 검증할 비밀키
      passReqToCallback: true, // true로 설정하면, 아래 validate 메서드의 첫 번째 인자로 Request 객체가 들어옴
    });
  }

  // 토큰의 서명이 유효하고 만료되지 않았을 때 호출, 여기서 추가적인 비즈니스 로직 검증 수행
  /**
   * 
   * @param req - 요청 객체
   * @param payload - 토큰을 디코딩한 내용
   * @returns 
   */
  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
    if (payload.type !== TokenType.REFRESH) { // 보안 검사, 이 토큰이 진짜 refresh 용도인지 확인
      throw new UnauthorizedException('Invalid token type');
    }

    // 반환된 pyaload는 위 Guard의 handleRequest 메서드의 'user'인자로 전달
    return payload;
  }
}
