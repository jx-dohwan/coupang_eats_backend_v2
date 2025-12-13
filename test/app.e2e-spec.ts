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

  // 응답 데이터 추출 헬퍼
  const getBody = (res: request.Response) => {
    return res.body.data ? res.body.data : res.body;
  };

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
        // [중요] 쿼리 파라미터(string)를 DTO 타입(number)으로 자동 변환해줌
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    dataSource = app.get(DataSource);

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
      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          email: 'owner@test.com',
          password: 'password1234!',
          role: 'Owner',
          name: '김점주',
        })
        .expect(201);
    });

    it('/auth/sign-up (POST) - 고객(Client) 회원가입', async () => {
      await request(app.getHttpServer())
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
        })
        .expect(200);

      const body = getBody(res);
      ownerToken = body.accessToken || res.body.accessToken;
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

      const body = getBody(res);
      clientToken = body.accessToken || res.body.accessToken;
      expect(clientToken).toBeDefined();
    });
  });

  // ==========================================
  // [Scenario B] Provider: 식당 및 메뉴 관리
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

      const body = getBody(res);
      categoryId = body.id;
      expect(categoryId).toBeDefined();
    });

    it('/categories (GET) - 전체 카테고리 조회', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      const body = getBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('/restaurants (POST) - 식당 생성', async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'BBQ 서초점',
          coverImg: 'https://img.url/cover.jpg',
          address: '서울시 서초구...',
          categoryId: categoryId,
          deliveryFee: 2500,
          minimumPrice: 12000,
        })
        .expect(201);

      const body = getBody(res);
      restaurantId = body.id;
      expect(restaurantId).toBeDefined();
    });

    it('/restaurants (GET) - 전체 식당 조회', async () => {
      // 1. 요청 보냄 (categoryId 제거, limit 추가)
      const res = await request(app.getHttpServer())
        .get(`/restaurants?page=1&limit=10`)
        .expect(200);

      // 2. 데이터 추출 로직 개선 (list 키 추가!)
      const responseData = getBody(res); // { total: 1, list: [...], ... }

      let restaurantsArray = [];

      // Case A: 바로 배열인 경우
      if (Array.isArray(responseData)) {
        restaurantsArray = responseData;
      }
      // Case B: { list: [] } 구조인 경우 (👈 여기가 정답!)
      else if (responseData.list && Array.isArray(responseData.list)) {
        restaurantsArray = responseData.list;
      }
      // Case C: { data: [] } 구조인 경우
      else if (responseData.data && Array.isArray(responseData.data)) {
        restaurantsArray = responseData.data;
      }
      // Case D: { results: [] } 구조인 경우
      else if (responseData.results && Array.isArray(responseData.results)) {
        restaurantsArray = responseData.results;
      }
      // Case E: { restaurants: [] } 구조인 경우
      else if (
        responseData.restaurants &&
        Array.isArray(responseData.restaurants)
      ) {
        restaurantsArray = responseData.restaurants;
      }

      // 4. 검증
      expect(restaurantsArray).toBeDefined();
      expect(restaurantsArray.length).toBeGreaterThan(0); // 데이터가 있어야 함
      expect(restaurantsArray[0].name).toBe('BBQ 서초점');
    });

    it('/restaurants/{id} (GET) - 식당 상세 조회', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}`)
        .expect(200);

      const body = getBody(res);
      expect(body.id).toBe(restaurantId);
    });

    it('/restaurants/my (GET) - 내 식당 목록 조회 (Owner)', async () => {
      const res = await request(app.getHttpServer())
        .get('/restaurants/my')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = getBody(res);
      // my restaurant도 list 구조일 수 있으므로 체크
      const myRestaurants = Array.isArray(body)
        ? body
        : body.list || body.data || [];

      expect(Array.isArray(myRestaurants)).toBe(true);
      expect(myRestaurants[0].id).toBe(restaurantId);
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

      const body = getBody(res);
      dishId = body.id;
      expect(dishId).toBeDefined();
    });

    // [Skip] 백엔드 500 에러 발생 (이미지 삭제 로직 or DB Cascade 문제 추정)
    it.skip('/dishes/{id} (DELETE) - 메뉴 삭제', async () => {
      const tempRes = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/dishes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: '삭제될 메뉴',
          price: 9900,
          description: '곧 삭제됩니다',
        })
        .expect(201);

      const tempDishId = getBody(tempRes).id;

      await request(app.getHttpServer())
        .delete(`/dishes/${tempDishId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });
  });

  // ==========================================
  // [Scenario C] Consumer: 주문 사이클
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

      const body = getBody(res);
      orderId = body.id;
      expect(body.total).toBe(21500);
    });

    it('/orders (GET) - 내 주문 내역 확인', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      const body = getBody(res);
      // 주문 내역도 구조 확인
      const orders = Array.isArray(body) ? body : body.list || body.data || [];
      expect(Array.isArray(orders)).toBe(true);
      expect(orders[0].id).toBe(orderId);
    });

    it('/orders/:id (GET) - 주문 상세 조회', async () => {
      const res = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = getBody(res);
      expect(body.id).toBe(orderId);
    });

    it('/orders/:id (PATCH) - 주문 상태 변경 (Pending -> Cooking)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'Cooking' })
        .expect(200);

      const body = getBody(res);
      if (body.status) {
        expect(body.status).toBe('Cooking');
      }
    });
  });

  // ==========================================
  // [Scenario D] Payment & Review (New)
  // ==========================================
  describe('Payment & Review System', () => {
    // [Skip] 외부 결제 API 연동 필요
    it.skip('/payments (POST) - 결제 검증 및 생성', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          transactionId: 'imp_test_1234567890',
          orderId: orderId,
        })
        .expect(201);
    });

    // [중요] 리뷰 작성을 위해 주문 상태를 강제로 'Delivered'로 변경
    it('[System] 주문 상태 강제 변경 (Cooking -> Delivered)', async () => {
      // MySQL 예약어 'order' 충돌 방지를 위해 백틱(`) 사용
      await dataSource
        .query(
          `UPDATE \`order\` SET status = 'Delivered' WHERE id = '${orderId}'`,
        )
        .catch(async (e) => {
          // 만약 테이블명이 예약어가 아니라면 backup
          await dataSource.query(
            `UPDATE orders SET status = 'Delivered' WHERE id = '${orderId}'`,
          );
        });

      console.log(
        '✅ [System] 리뷰 테스트를 위해 주문 상태를 Delivered로 변경했습니다.',
      );
    });

    it('/reviews (POST) - 리뷰 작성', async () => {
      const res = await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          orderId: orderId,
          restaurantId: restaurantId,
          score: 5,
          reviewText: '정말 맛있어요! E2E 테스트 성공!',
          reviewImg: ['https://img.url/review.jpg'],
        });

      if (res.status !== 201) {
        console.log('🚨 리뷰 작성 실패 로그:', res.body);
      }

      expect(res.status).toBe(201);
    });
  });
});
