import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

// 1. 타임아웃 설정
jest.setTimeout(30000);

describe('AppController (E2E) - Full Cycle', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // 데이터 공유를 위한 변수들
  let ownerToken: string;
  let clientToken: string;
  let categoryId: string;
  let restaurantId: string;
  let dishId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = app.get(DataSource);

    // DB 초기화 및 동기화
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }
      await dataSource.synchronize(true);
    } catch (e) {
      console.error('DB Connection/Sync Error:', e);
    }
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  // ==========================================
  // [Scenario A] Auth: 회원가입 및 로그인
  // ==========================================
  describe('Auth System', () => {
    it('/auth/sign-up (POST) - 점주(Owner) 회원가입', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          email: 'owner@test.com',
          password: 'password1234!',
          role: 'Owner',
          name: '김점주',
        });

      expect(response.status).toBe(201);
    });

    it('/auth/sign-up (POST) - 고객(Client) 회원가입', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          email: 'client@test.com',
          password: 'password1234!',
          role: 'Client',
          name: '박고객',
        })
        .expect(201);
    });

    it('/auth/sign-in (POST) - 점주 로그인 & 토큰 저장', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: 'owner@test.com',
          password: 'password1234!',
        });

      expect(res.status).toBe(200);

      // ▼▼▼ [수정됨] 응답 구조가 { data: { accessToken: ... } } 인지 확인 ▼▼▼
      console.log(
        '🔍 [DEBUG] Owner Login Body:',
        JSON.stringify(res.body, null, 2),
      );

      if (res.body.data && res.body.data.accessToken) {
        ownerToken = res.body.data.accessToken;
      } else {
        ownerToken = res.body.accessToken;
      }

      expect(ownerToken).toBeDefined();
    });

    it('/auth/sign-in (POST) - 고객 로그인 & 토큰 저장', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: 'client@test.com',
          password: 'password1234!',
        })
        .expect(200);

      // ▼▼▼ [수정됨] 고객 토큰 추출 로직 동일 적용 ▼▼▼
      if (res.body.data && res.body.data.accessToken) {
        clientToken = res.body.data.accessToken;
      } else {
        clientToken = res.body.accessToken;
      }

      expect(clientToken).toBeDefined();
    });
  });

  // ==========================================
  // [Scenario B-1] Provider: 식당 및 메뉴 등록
  // ==========================================
  describe('Provider System (Restaurant & Dish)', () => {
    it('/categories (POST) - 카테고리 생성', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: '치킨',
          coverImg: 'https://image.url/chicken.png',
        })
        .expect(201);

      // 응답이 { data: { id: ... } } 구조일 수 있으므로 체크
      const body = res.body.data ? res.body.data : res.body;
      categoryId = body.id;

      expect(categoryId).toBeDefined();
    });

    it('/restaurants (POST) - 식당 생성', async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'BBQ 서초점',
          coverImg: 'https://img.url/cover.jpg',
          address: '서울시 서초구...',
          categoryId: categoryId, // 위에서 받은 ID 사용
          deliveryFee: 2500,
          minimumPrice: 12000,
        })
        .expect(201);

      const body = res.body.data ? res.body.data : res.body;
      restaurantId = body.id;

      expect(restaurantId).toBeDefined();
    });

    it('/restaurants/:id/dishes (POST) - 메뉴 추가', async () => {
      const res = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/dishes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: '후라이드 치킨',
          price: 18000,
          description: '바삭바삭해요',
          options: [{ name: '치즈 추가', extra: 1000 }],
        })
        .expect(201);

      const body = res.body.data ? res.body.data : res.body;
      dishId = body.id;

      expect(dishId).toBeDefined();
    });
  });

  // ==========================================
  // [Scenario B-2] Consumer: 주문 사이클
  // ==========================================
  describe('Order System', () => {
    it('/orders (POST) - 주문 생성', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          restaurantId: restaurantId,
          items: [
            {
              dishId: dishId,
              options: [{ name: '치즈 추가', extra: 1000 }],
            },
          ],
        })
        .expect(201);

      const body = res.body.data ? res.body.data : res.body;
      orderId = body.id;

      // total 값 검증 (18000 + 1000 = 19000 + 배달비 2500 = 21500)
      expect(body.total).toBe(21500);
    });

    it('/orders (GET) - 내 주문 내역 확인', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      const body = res.body.data ? res.body.data : res.body;

      expect(Array.isArray(body)).toBe(true);
      expect(body[0].id).toBe(orderId);
    });

    it('/orders/:id (GET) - 주문 상세 조회', async () => {
      const res = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${ownerToken}`) // 점주가 조회
        .expect(200);

      const body = res.body.data ? res.body.data : res.body;

      expect(body.id).toBe(orderId);
      expect(body.items[0].dishName).toBe('후라이드 치킨');
    });
  });
});
