import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource, deleteDataSourceByName } from 'typeorm-transactional'; // [추가]
import { AwsSesService } from '../../src/core/aws/aws-ses.service';
import { AwsS3Service } from '../../src/core/aws/aws-s3.service';

export async function createTestApp() {
  try {
    deleteDataSourceByName('default');
  } catch (e) {}

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(AwsSesService).useValue({ sendEmail: jest.fn() })
    .overrideProvider(AwsS3Service).useValue({ uploadImage: jest.fn().mockResolvedValue('https://mock-url.com') })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  
  await app.init();
  const dataSource = app.get(DataSource);

  // ⭐ [근본 해결 1] 테스트용 DataSource를 트랜잭션 매니저에 등록
  // 이 코드가 없어서 그동안 "connection undefined" 에러가 났던 겁니다.
  try {
    addTransactionalDataSource(dataSource);
  } catch (e) {
    // 이미 등록된 경우 무시
  }

  // ⭐ [근본 해결 2] DB 깨끗하게 비우기 (중복 키 방지)
  await dataSource.synchronize(true); 

  return { app, dataSource };
}

export async function closeTestApp(app: INestApplication, dataSource: DataSource) {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
  if (app) {
    await app.close();
  }
}