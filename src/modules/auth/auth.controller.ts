import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../entities/user/user.entity';
import { AuthService } from './auth.service';
import { SignUpBody } from './dto/request/signUp.body';
import { SignInBody } from './dto/request/signIn.body';
import { RefreshBody } from './dto/request/refresh.body';
import { CurrentUser } from '../../core/decorator/currentUser.decorator';
import { ExtractJwt } from 'passport-jwt';
import { Public } from '../../core/decorator/public.decorator';
import { RefreshTokenGuard } from '../../core/guard/refreshToken.guard';

// 'auth' 경로로 들어오는 요청을 담당하는 컨트롤로 (예: /auth/sign-up)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // 로그인하지 않은 사용자도 접근 가능
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED) // 성공 시 201 Created 반환
  async signUp(@Body() body: SignUpBody) {
    return this.authService.signUp(body); // 요청 본문(body) 내용을 검증한 뒤 서비스의 회원가입 로직을 호출
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK) // 성공 시 200 OK 반환
  async signIn(@Body() body: SignInBody) {
    return this.authService.signIn(body);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@CurrentUser() user: User, @Request() req: Request) {
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? ''; // 헤더에서 'Bearer ' 토큰 문자열만 추출
    return this.authService.signOut(user.id, accessToken); // 유저 ID와 토큰을 서비스로 넘겨서 해당 토큰을 무효화(블랙리스트 처리)
  }

  @Public()
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshBody) { // Access Token이 만료되었을때, 가지고 있는 Refresh Token을 Body로 보내 새 토큰을 받는다.
    return this.authService.refreshTokens(body.refreshToken);
  }
}
