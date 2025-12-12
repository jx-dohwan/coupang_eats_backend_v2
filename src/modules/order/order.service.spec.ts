import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { DataSource } from 'typeorm';
import { OrderRepository } from './repository/order.repository';
import { OrderItemRepository } from './repository/order-item.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { DishRepository } from '../dish/repository/dish.repository';
import { EventsGateway } from '../../events/events.gateway';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { User } from '../../entities/user/user.entity';
import { Role } from '../../entities/user/user.interface';
import { OrderStatus } from '../../common/type/common.interface';

describe('OrderService', () => {
  let service: OrderService;
  let dataSource: any; // Mocked DataSource
  let restaurantRepo: jest.Mocked<RestaurantRepository>;
  let dishRepo: jest.Mocked<DishRepository>;
  let eventsGateway: any;
  let orderRepo: jest.Mocked<OrderRepository>;

  // Mock Manager for Transaction
  const mockEntityManager = {
    save: jest.fn().mockImplementation((entity, data) => Promise.resolve({ ...data, id: 'saved-id' })),
  };

  beforeEach(async () => {
    // 1. DataSource Mocking (Transaction Callback 실행)
    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockEntityManager)),
    };

    const mockEventsGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: OrderRepository, useValue: { save: jest.fn(), findOneWithOmitNotJoinedPropsOrThrow: jest.fn() } },
        { provide: OrderItemRepository, useValue: {} },
        { provide: RestaurantRepository, useValue: { findByIdOrThrow: jest.fn() } },
        { provide: DishRepository, useValue: { findByIds: jest.fn() } },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    dataSource = module.get(DataSource);
    restaurantRepo = module.get(RestaurantRepository);
    dishRepo = module.get(DishRepository);
    eventsGateway = module.get(EventsGateway);
    orderRepo = module.get(OrderRepository);
  });

  describe('createOrder', () => {
    const customer = { id: 'user-1' } as User;
    const createOrderDto: any = {
      restaurantId: 'rest-1',
      items: [
        { dishId: 'dish-1', options: [{ name: 'Spicy', extra: 0 }], toEntity: jest.fn().mockReturnValue({}) },
      ],
      toEntity: jest.fn(), // 나중에 구현 정의
    };

    it('주문이 정상적으로 생성되고, 트랜잭션과 알림이 실행되어야 한다', async () => {
      // Arrange
      const restaurant = { id: 'rest-1', ownerId: 'owner-1', deliveryFee: 1000 };
      const dish = { id: 'dish-1', price: 10000, options: [{ name: 'Spicy', extra: 500 }] };
      
      restaurantRepo.findByIdOrThrow.mockResolvedValue(restaurant as any);
      dishRepo.findByIds.mockResolvedValue([dish] as any);
      
      // DTO toEntity Mock: 총액이 맞는지 확인하기 위해 중요
      createOrderDto.toEntity.mockImplementation((c:any, r:any, total:any, items:any) => ({
        total, // 여기서 total 값이 10000(음식) + 500(옵션) + 1000(배달비) = 11500 인지 확인 가능
        restaurant: r,
        customer: c,
      }));

      // Act
      const result = await service.createOrder(customer, createOrderDto);

      // Assert
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2); // OrderItem 저장 + Order 저장
      
      // 소켓 알림 확인
      expect(eventsGateway.server.to).toHaveBeenCalledWith(`Owner:owner-1`);
      expect(eventsGateway.server.emit).toHaveBeenCalledWith('newPendingOrder', expect.anything());
    });

    it('존재하지 않는 메뉴가 포함되면 NotFoundException을 던져야 한다', async () => {
      restaurantRepo.findByIdOrThrow.mockResolvedValue({ id: 'rest-1' } as any);
      dishRepo.findByIds.mockResolvedValue([]); // 메뉴 못 찾음

      await expect(service.createOrder(customer, createOrderDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('editOrderStatus', () => {
    it('Client는 주문 상태를 변경할 수 없어야 한다 (ForbiddenException)', async () => {
      const user = { id: 'client-1', role: Role.CLIENT } as User;
      orderRepo.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue({} as any);

      await expect(service.editOrderStatus(user, 'order-1', { status: OrderStatus.Cooking }))
        .rejects.toThrow(ForbiddenException);
    });

    it('Owner는 본인 가게의 주문을 Cooking으로 변경할 수 있어야 한다', async () => {
      // Arrange
      const user = { id: 'owner-1', role: Role.OWNER } as User;
      const order = { 
        id: 'order-1', 
        status: OrderStatus.Pending, 
        restaurant: { ownerId: 'owner-1', name: 'Test Rest' } 
      };
      
      orderRepo.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(order as any);
      orderRepo.save.mockResolvedValue({ ...order, status: OrderStatus.Cooking } as any);

      // Act
      await service.editOrderStatus(user, 'order-1', { status: OrderStatus.Cooking });

      // Assert
      expect(orderRepo.save).toHaveBeenCalled();
      expect(eventsGateway.server.emit).toHaveBeenCalledWith('orderUpdate', expect.objectContaining({ status: OrderStatus.Cooking }));
    });

    it('Owner가 아닌 다른 사람이 가게 주문을 변경하면 에러가 나야 한다', async () => {
        const user = { id: 'other-owner', role: Role.OWNER } as User;
        const order = { restaurant: { ownerId: 'real-owner' } };
        orderRepo.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(order as any);

        await expect(service.editOrderStatus(user, 'id', { status: OrderStatus.Cooking }))
            .rejects.toThrow(ForbiddenException);
    });
  });
});