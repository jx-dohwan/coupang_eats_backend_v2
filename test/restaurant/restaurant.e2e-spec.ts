import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, closeTestApp } from '../utils/setup';
import { UserRepository } from '../../src/modules/user/repository/user.repository';
import { Role } from '../../src/entities/user/user.interface';
import { CategoryRepository } from '../../src/modules/category/repository/category.repository';
import { RestaurantRepository } from '../../src/modules/restaurant/repository/restaurant.repository';
import { DishRepository } from '../../src/modules/dish/repository/dish.repository';
import * as bcrypt from 'bcrypt';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { v4 as uuidv4 } from 'uuid';

// [1] 트랜잭션 초기화 (파일 최상단)
initializeTransactionalContext();
jest.setTimeout(60000);

const getBody = (res: request.Response) => {
  return res.body.data ? res.body.data : res.body;
};

describe('Restaurant Module (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let ownerToken: string;
  let clientToken: string;
  let deliveryToken: string;

  let categoryId: string;
  let restaurantId: string;
  let dishId: string;

  beforeAll(async () => {
    // 1. 앱 세팅 (setup.ts에서 DB를 밀고 트랜잭션을 연결해 옴)
    const setup = await createTestApp();
    app = setup.app;
    dataSource = setup.dataSource;

    // 2. [중요] ID 자동 생성이 안 되는 버그를 막기 위해 Subscriber 추가
    dataSource.subscribers.push({
      beforeInsert(event) {
        if (event.entity && !event.entity.id) {
          event.entity.id = uuidv4();
        }
      },
    });

    const userRepo = app.get(UserRepository);
    const password = await bcrypt.hash('1234', 10);

    // 3. 테스트용 유저 생성
    await userRepo.save([
      { email: 'owner@rest.com', password, name: '점주', role: Role.OWNER, verified: true },
      { email: 'client@rest.com', password, name: '손님', role: Role.CLIENT, verified: true },
      { email: 'delivery@rest.com', password, name: '배달', role: Role.DELIVERY, verified: true },
    ]);

    // 4. 로그인하여 토큰 확보
    const login = async (email: string) => {
      const res = await request(app.getHttpServer()).post('/auth/sign-in').send({ email, password: '1234' });
      return getBody(res).accessToken;
    };

    ownerToken = await login('owner@rest.com');
    clientToken = await login('client@rest.com');
    deliveryToken = await login('delivery@rest.com');
  });

  afterAll(async () => {
    await closeTestApp(app, dataSource);
  });

  describe('1. 카테고리 관리', () => {
    it('should create a category', async () => {
      const catRepo = app.get(CategoryRepository);
      const category = await catRepo.save(catRepo.create({ name: '치킨', slug: 'chicken' }));
      categoryId = category.id;
      expect(categoryId).toBeDefined();
    });
  });

  describe('2. 식당 관리', () => {
    it('should create a restaurant', async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'BBQ 서초점',
          coverImg: 'https://img.url',
          address: 'Seoul',
          categoryId: categoryId,
          deliveryFee: 2500,
          minimumPrice: 12000,
        })
        .expect(201);

      restaurantId = getBody(res).id;
      expect(restaurantId).toBeDefined();
    });

    it('should FAIL if user is Delivery (403)', async () => {
      await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${deliveryToken}`)
        .send({ name: 'X', categoryId, coverImg: 'X', address: 'X', deliveryFee: 0, minimumPrice: 0 })
        .expect(403);
    });

    it('should get my restaurants', async () => {
      const res = await request(app.getHttpServer())
        .get('/restaurants/my')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(Array.isArray(getBody(res))).toBe(true);
    });

    it('should get all restaurants', async () => {
      const res = await request(app.getHttpServer()).get('/restaurants').expect(200);
      const list = getBody(res).data || getBody(res);
      expect(Array.isArray(list)).toBe(true);
    });
  });

  describe('3. 메뉴 관리', () => {
    it('should create a dish', async () => {
      const res = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/dishes`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '황금올리브', price: 20000, description: '맛있음' })
        .expect(201);
      dishId = getBody(res).id;
      expect(dishId).toBeDefined();
    });

    it('should get restaurant detail', async () => {
      const res = await request(app.getHttpServer()).get(`/restaurants/${restaurantId}`).expect(200);
      expect(getBody(res).dishes).toBeDefined();
    });

    it('should delete a dish', async () => {
      await request(app.getHttpServer())
        .delete(`/dishes/${dishId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });
  });
});