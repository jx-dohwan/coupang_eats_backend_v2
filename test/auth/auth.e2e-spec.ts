import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, closeTestApp } from '../utils/setup';
import { UserRepository } from '../../src/modules/user/repository/user.repository';
import { Role } from '../../src/entities/user/user.interface';
import { User } from '../../src/entities/user/user.entity';

describe('Auth Module (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: UserRepository;

  // [Helper] 응답 바디 추출 (Interceptor가 { data: ... } 로 감쌀 경우 대비)
  const getBody = (res: request.Response) => {
    return res.body.data ? res.body.data : res.body;
  };

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    dataSource = setup.dataSource;

    try {
      userRepository = app.get(UserRepository);
    } catch (e) {
      console.warn('UserRepository Token not found, fetching via DataSource');
    }
  });

  afterAll(async () => {
    await closeTestApp(app, dataSource);
  });

  describe('1. 회원가입 (POST /auth/sign-up)', () => {
    it('should register a new CLIENT user', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          email: 'client@test.com',
          password: 'password1234!',
          name: '박고객',
          role: 'Client',
        })
        .expect(201);

      const repo = userRepository || dataSource.getRepository(User);
      const user = await repo.findOne({ where: { email: 'client@test.com' } });

      expect(user).toBeDefined();
      expect(user?.role).toBe(Role.CLIENT);
      expect(user?.verified).toBe(false);
    });

    it('should register a new OWNER user', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          email: 'owner@test.com',
          password: 'password1234!',
          name: '김점주',
          role: 'Owner',
        })
        .expect(201);
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          email: 'client@test.com',
          password: 'password1234!',
          name: '박고객2',
          role: 'Client',
        })
        .expect(409);
    });
  });

  describe('2. 로그인 (POST /auth/sign-in)', () => {
    beforeAll(async () => {
      // 이메일 인증 강제 처리
      await dataSource.query(
        `UPDATE user SET verified = 1 WHERE email IN ('client@test.com', 'owner@test.com')`,
      );
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: 'client@test.com',
          password: 'password1234!',
        })
        .expect(200);

      // [핵심 수정] getBody 헬퍼를 사용하여 실제 데이터 추출
      const body = getBody(response);

      // 디버깅용: 만약 실패하면 실제 응답 구조를 확인하기 위함
      if (!body.accessToken) {
        console.error('Login Response Body:', response.body);
      }

      expect(body.accessToken).toBeDefined();

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(
        (cookies as unknown as string[]).some((c: string) =>
          c.includes('refreshToken'),
        ),
      ).toBe(true);
    });

    it('should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: 'client@test.com',
          password: 'wrongpassword!',
        })
        .expect(401);
    });

    it('should fail with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: 'nobody@test.com',
          password: 'password1234!',
        })
        .expect(401);
    });
  });

  describe('3. 로그아웃 (POST /auth/sign-out)', () => {
    let accessToken: string;
    let refreshTokenCookie: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: 'client@test.com',
          password: 'password1234!',
        });

      // [핵심 수정] getBody 헬퍼 사용
      const body = getBody(res);
      accessToken = body.accessToken;

      const cookies = res.headers['set-cookie'];
      if (cookies) {
        refreshTokenCookie =
          (cookies as unknown as string[]).find((c: string) =>
            c.startsWith('refreshToken='),
          ) || '';
      }
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [refreshTokenCookie])
        .expect(200);
    });

    it('should fail logout without token', async () => {
      await request(app.getHttpServer()).post('/auth/sign-out').expect(401);
    });
  });
});
