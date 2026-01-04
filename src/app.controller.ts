import { Controller, Get } from '@nestjs/common';
import { Public } from './core/decorator/public.decorator';

@Controller()
export class AppController {
  @Public() // 로드밸런서가 토큰 없이 접근할 수 있게 허용
  @Get() // 'http://주소/' 경로를 처리
  healthCheck(): string {
    return 'OK'; // 로드밸런서에게 200 OK를 던져줌
  }
}
