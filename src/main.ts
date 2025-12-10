import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setNestApp } from './setNestApp';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // 1. Nest.js 애플리케이션 인스턴스 생성(AppModule 로드)
  const app = await NestFactory.create(AppModule);
  // 2. 공통 설정 작용
  setNestApp(app);

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Coupang Eats API')
    .setDescription('Coupang Eats 클론 코딩 API 문서입니다.')
    .setVersion('1.0')
    // JWT 토큰 인증을 위한 설정 (나중에 자물쇠 버튼이 생깁니다)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token', // @ApiBearerAuth('access-token') 에서 사용할 이름
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 'api-docs' 주소로 접속하면 문서를 볼 수 있게 설정
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침 해도 토큰 유지
    },
  });

  // 3. 서버 포트 리스팅(환경변수 PORT가 없으면 기본값 3000)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
