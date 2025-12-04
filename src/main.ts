import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setNestApp } from './setNestApp';

async function bootstrap() {
  // 1. Nest.js 애플리케이션 인스턴스 생성(AppModule 로드)
  const app = await NestFactory.create(AppModule);
  // 2. 공통 설정 작용
  setNestApp(app);
  // 3. 서버 포트 리스팅(환경변수 PORT가 없으면 기본값 3000)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
