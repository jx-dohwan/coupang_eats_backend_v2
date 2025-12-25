import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { DataSource } from 'typeorm';
import { OrderRepository } from './repository/order.repository';
import { OrderItemRepository } from './repository/order-item.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { DishRepository } from '../dish/repository/dish.repository';
import { EventsGateway } from '../../events/events.gateway';
import { NotFoundException } from '@nestjs/common';
import { User } from '../../entities/user/user.entity';

describe('OrderService', () => {
  let service: OrderService;
  let dataSource: any;
  let restaurantRepo: any;
  let dishRepo: any;
  let orderRepo: any;
  let orderItemRepo: any;
  let eventsGateway: any;

  // ✅ 소켓 체이닝을 완벽히 지원하는 가짜 서버
  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
  };

  const mockEntityManager = {
    withRepository: jest.fn().mockImplementation((repo) => repo),
    save: jest.fn().mockImplementation((entity, data) => Promise.resolve({ id: 'saved-id', ...data })),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const mockOrderRepo = { save: jest.fn(), findManyWithOmitNotJoinedProps: jest.fn(), findOneWithOmitNotJoinedPropsOrThrow: jest.fn() };
    const mockOrderItemRepo = { save: jest.fn() };
    const mockRestaurantRepo = { findByIdOrThrow: jest.fn() };
    const mockDishRepo = { findManyWithOmitNotJoinedProps: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: OrderRepository, useValue: mockOrderRepo },
        { provide: OrderItemRepository, useValue: mockOrderItemRepo },
        { provide: RestaurantRepository, useValue: mockRestaurantRepo },
        { provide: DishRepository, useValue: mockDishRepo },
        { provide: EventsGateway, useValue: { server: mockServer } },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    dataSource = module.get(DataSource);
    restaurantRepo = module.get(RestaurantRepository);
    dishRepo = module.get(DishRepository);
    orderRepo = module.get(OrderRepository);
    orderItemRepo = module.get(OrderItemRepository);
    eventsGateway = module.get(EventsGateway);

    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('주문이 정상적으로 생성되고 소켓 알림이 전송되어야 한다', async () => {
      const customer = { id: 'user-1' } as User;
      const dto: any = {
        restaurantId: 'rest-1',
        items: [{ dishId: 'dish-1', options: [], toEntity: jest.fn().mockReturnValue({}) }],
        toEntity: jest.fn().mockReturnValue({ id: 'order-1', total: 11000 }),
      };

      restaurantRepo.findByIdOrThrow.mockResolvedValue({ id: 'rest-1', ownerId: 'owner-1', deliveryFee: 1000 });
      dishRepo.findManyWithOmitNotJoinedProps.mockResolvedValue([{ id: 'dish-1', price: 10000 }]);
      orderRepo.save.mockResolvedValue({ id: 'order-1', total: 11000 });

      await service.createOrder(customer, dto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(orderRepo.save).toHaveBeenCalled();
      
      // ✅ 이제 이 부분들이 0 calls 에러 없이 통과됩니다!
      expect(mockServer.to).toHaveBeenCalledWith('Owner:owner-1');
      expect(mockServer.emit).toHaveBeenCalledWith('newPendingOrder', expect.anything());
    });
  });
});