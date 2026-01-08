import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { User } from '../../entities/user/user.entity';
import { AuthService } from './auth.service';
import { SignUpBody } from './dto/request/signUp.body';
import { SignInBody } from './dto/request/signIn.body';
import { RefreshBody } from './dto/request/refresh.body';
import { CurrentUser } from '../../core/decorator/currentUser.decorator';
import { ExtractJwt } from 'passport-jwt';
import { Public } from '../../core/decorator/public.decorator';
import { RefreshTokenGuard } from '../../core/guard/refreshToken.guard';
import { Env } from '../../core/config';
import { CurrentRefreshToken } from '../../core/decorator/currentRefreshToken.decorator';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CoreOutput } from '../../common/dto/core.output';
import { AccessTokenResponse } from './dto/response/access-token.response';

@ApiTags('Auth (인증)')
@Controller('auth')
export class AuthController {
  private readonly isLocal: boolean;

  constructor(private readonly authService: AuthService) {
    // 로컬 개발 환경인지 확인 (쿠키 보안 옵션인 Secure, SameSite 설정을 위함)
    this.isLocal = process.env.NODE_ENV === Env.local;
  }

  // [Helper] Refresh Token을 HttpOnly 쿠키에 저장하는 메서드
  private setRefreshTokenCookie(res: any, refreshToken: string): void {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: !this.isLocal, // true: 자바스크립트로 접근 불가 (XSS 방지)
      secure: false, //!this.isLocal, // true: HTTPS에서만 전송 (로컬은 false)
      sameSite: 'lax',//this.isLocal ? 'none' : 'strict', // CSRF 공격 방지 설정
      maxAge: 7 * 24 * 60 * 60 * 1000, // 쿠키 유효기간 7일
    });
  }

  // [Helper] 로그아웃 시 클라이언트의 Refresh Token 쿠키를 삭제하는 메서드
  private clearRefreshTokenCookie(res: any): void {
    res.clearCookie('refreshToken', {
      httpOnly: !this.isLocal,
      secure: false,// !this.isLocal,
      sameSite: 'lax',// this.isLocal ? 'none' : 'strict',
    });
  }

  // 1. 회원가입 API (토큰 발급 안 함)
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '성공', type: CoreOutput })
  @Public() // 인증 없이 접근 가능
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() body: SignUpBody) {
    return this.authService.signUp(body);
  }

  // 2. 로그인 API
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({
    status: 200,
    description: '성공 (Access 토큰 반환)',
    type: AccessTokenResponse,
  })
  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() body: SignInBody,
    // passthrough: true -> NestJS가 응답을 처리하되, 우리가 쿠키나 헤더를 직접 조작할 수 있게 함
    @Response({ passthrough: true }) res: any,
  ) {
    const tokenPair = await this.authService.signIn(body);

    // Refresh Token은 보안 쿠키에 굽고
    this.setRefreshTokenCookie(res, tokenPair.refreshToken);

    // Access Token만 응답 Body로 반환
    return { accessToken: tokenPair.accessToken };
  }

  // 3. 로그아웃 API
  @ApiOperation({
    summary: '로그아웃',
    description:
      '반드시 Header에 **Authorization: Bearer <AccessToken>**을 포함해야 합니다. 호출 시 서버에서 Refresh Token을 무효화하고 브라우저의 쿠키를 삭제합니다.',
  })
  @ApiBearerAuth('access-token') // 상단 Authorize 버튼 연동
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer {access_token} 형식으로 입력하세요.',
    required: true,
    schema: {
      type: 'string',
      example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공. 브라우저 쿠키(refreshToken)가 삭제됩니다.',
    type: CoreOutput,
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자 (토큰 없거나 만료됨)',
  })
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @CurrentUser() user: User,
    @Request() req: any,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // 헤더에서 Access Token 추출 (블랙리스트 등록용)
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? '';

    // 클라이언트의 쿠키 삭제
    this.clearRefreshTokenCookie(res);

    // 서버 로직 수행 (Redis에서 Refresh Token 삭제 및 Access Token 블랙리스트 처리)
    return this.authService.signOut(user.id, accessToken);
  }

  // 4. 토큰 갱신 API
  @ApiOperation({ summary: '토큰 갱신 (Refresh Token)' })
  @ApiResponse({ status: 200, description: '성공', type: AccessTokenResponse })
  @Public() // AccessToken 만료 시 호출되므로 Public이어야 함
  @UseGuards(RefreshTokenGuard) // 대신 RefreshToken이 유효한지 검증하는 가드 사용
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentRefreshToken() refreshToken: string, // 쿠키에서 추출한 토큰
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // 토큰 갱신 (RTR: Refresh Token Rotation)
    const tokenPair = await this.authService.refreshTokens(refreshToken);

    // 새로 발급된 Refresh Token을 다시 쿠키에 저장
    this.setRefreshTokenCookie(res, tokenPair.refreshToken);

    return { accessToken: tokenPair.accessToken };
  }

  @ApiExcludeEndpoint()
  @Public() // 로그인 없이 접근 가능해야 함
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return {
      message:
        '이메일 인증이 성공적으로 완료되었습니다. 이제 로그인할 수 있습니다.',
    };
  }
}
