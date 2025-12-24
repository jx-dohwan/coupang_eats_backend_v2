import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { DataSource, In } from 'typeorm'; // In import 추가
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
  let dataSource: any;
  let restaurantRepo: jest.Mocked<RestaurantRepository>;
  let dishRepo: any; // 타입을 any로 하거나 커스텀 Mock 타입 정의
  let eventsGateway: any;
  let orderRepo: jest.Mocked<OrderRepository>;

  // Mock Manager
  const mockEntityManager = {
    save: jest
      .fn()
      .mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: 'saved-id' }),
      ),
  };

  beforeEach(async () => {
    const mockDataSource = {
      transaction: jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager)),
    };

    const mockEventsGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
    };

    // [변경 포인트 1] dishRepository Mock에 findManyWithOmitNotJoinedProps 추가
    const mockDishRepository = {
      findManyWithOmitNotJoinedProps: jest.fn(),
      findByIds: jest.fn(), // 혹시 다른데서 쓸 수도 있으니 유지하되, createOrder에선 안씀
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: OrderRepository,
          useValue: {
            save: jest.fn(),
            findOneWithOmitNotJoinedPropsOrThrow: jest.fn(),
            findManyWithOmitNotJoinedProps: jest.fn(),
            find: jest.fn(),
          },
        },
        { provide: OrderItemRepository, useValue: {} },
        {
          provide: RestaurantRepository,
          useValue: {
            findByIdOrThrow: jest.fn(),
            findMany: jest.fn(),
          },
        },
        { provide: DishRepository, useValue: mockDishRepository }, // 변경된 Mock 주입
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
        {
          dishId: 'dish-1',
          options: [{ name: 'Spicy', extra: 0 }],
          toEntity: jest.fn().mockReturnValue({}),
        },
      ],
      toEntity: jest.fn(),
    };

    it('주문이 정상적으로 생성되고, 트랜잭션과 알림이 실행되어야 한다', async () => {
      // Arrange
      const restaurant = {
        id: 'rest-1',
        ownerId: 'owner-1',
        deliveryFee: 1000,
      };
      const dish = {
        id: 'dish-1',
        price: 10000,
        options: [{ name: 'Spicy', extra: 500 }],
      };

      restaurantRepo.findByIdOrThrow.mockResolvedValue(restaurant as any);

      // [변경 포인트 2] findByIds -> findManyWithOmitNotJoinedProps 로 변경
      // 이제 옵션 관계 로드({ options: true })를 테스트해야 함
      dishRepo.findManyWithOmitNotJoinedProps.mockResolvedValue([dish] as any);

      createOrderDto.toEntity.mockImplementation(
        (c: any, r: any, total: any, items: any) => ({
          total, // 10000 + 500 + 1000 = 11500 확인
          restaurant: r,
          customer: c,
        }),
      );

      // Act
      await service.createOrder(customer, createOrderDto);

      // Assert
      // [변경 포인트 3] 호출 검증도 변경
      expect(dishRepo.findManyWithOmitNotJoinedProps).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.anything() }), // In(...) 매처가 복잡하므로 구조만 확인
        { options: true }, // ✅ 가장 중요한 수정 사항: 옵션을 가져오는지 확인
      );

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);

      expect(eventsGateway.server.to).toHaveBeenCalledWith(`Owner:owner-1`);
      expect(eventsGateway.server.emit).toHaveBeenCalledWith(
        'newPendingOrder',
        expect.anything(),
      );
    });

    it('존재하지 않는 메뉴가 포함되면 NotFoundException을 던져야 한다', async () => {
      restaurantRepo.findByIdOrThrow.mockResolvedValue({ id: 'rest-1' } as any);

      // [변경 포인트 4] 실패 케이스 Mock 변경
      dishRepo.findManyWithOmitNotJoinedProps.mockResolvedValue([]); // 메뉴 못 찾음

      await expect(
        service.createOrder(customer, createOrderDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('editOrderStatus', () => {
    it('Client는 주문 상태를 변경할 수 없어야 한다 (ForbiddenException)', async () => {
      const user = { id: 'client-1', role: Role.CLIENT } as User;
      orderRepo.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        {} as any,
      );

      await expect(
        service.editOrderStatus(user, 'order-1', {
          status: OrderStatus.Cooking,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Owner는 본인 가게의 주문을 Cooking으로 변경할 수 있어야 한다', async () => {
      // Arrange
      const user = { id: 'owner-1', role: Role.OWNER } as User;
      const order = {
        id: 'order-1',
        status: OrderStatus.Pending,
        restaurant: { ownerId: 'owner-1', name: 'Test Rest' },
      };

      orderRepo.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        order as any,
      );
      orderRepo.save.mockResolvedValue({
        ...order,
        status: OrderStatus.Cooking,
      } as any);

      // Act
      await service.editOrderStatus(user, 'order-1', {
        status: OrderStatus.Cooking,
      });

      // Assert
      expect(orderRepo.save).toHaveBeenCalled();
      expect(eventsGateway.server.emit).toHaveBeenCalledWith(
        'orderUpdate',
        expect.objectContaining({ status: OrderStatus.Cooking }),
      );
    });

    it('Owner가 아닌 다른 사람이 가게 주문을 변경하면 에러가 나야 한다', async () => {
      const user = { id: 'other-owner', role: Role.OWNER } as User;
      const order = { restaurant: { ownerId: 'real-owner' } };
      orderRepo.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        order as any,
      );

      await expect(
        service.editOrderStatus(user, 'id', { status: OrderStatus.Cooking }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
