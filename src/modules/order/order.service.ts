import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { OrderRepository } from './repository/order.repository';
import { OrderItemRepository } from './repository/order-item.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { DishRepository } from '../dish/repository/dish.repository';
import { User } from '../../entities/user/user.entity';
import { OrderEntity } from '../../entities/order/order.entity';
import { OrderItemEntity } from '../../entities/order/order-item.entity';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { EditOrderDto } from './dto/edit-order.dto';
import { OrderStatus } from '../../common/type/common.interface';
import { Role } from '../../entities/user/user.interface';
import { EventsGateway } from '../../events/events.gateway';
import { DishEntity } from '../../entities/dish/dish.entity';

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly restaurantRepository: RestaurantRepository,
    private readonly dishRepository: DishRepository,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * 1. 주문 생성 (Client)
   * - 트랜잭션 처리
   * - 주문 생성 후 Owner에게 실시간 알림 전송
   */
  async createOrder(customer: User, dto: CreateOrderDto) {
    // 1. 식당 조회
    const restaurant = await this.restaurantRepository.findByIdOrThrow(
      dto.restaurantId,
    );

    // 2. 메뉴 목록 일괄 조회
    const dishIds = dto.items.map((item) => item.dishId);
    const dishes = await this.dishRepository.findByIds(dishIds);

    // [트랜잭션 시작]
    const order = await this.dataSource.transaction(async (manager) => {
      let finalTotal = 0;
      const orderItems: OrderItemEntity[] = [];

      // 3. 주문 아이템 처리 루프
      for (const itemDto of dto.items) {
        const dish = dishes.find((d) => d.id === itemDto.dishId);
        if (!dish)
          throw new NotFoundException(`Dish not found: ${itemDto.dishId}`);

        // [Helper 호출] 가격 계산 및 아이템 엔티티 생성
        const { orderItem, itemPrice } = this.processOrderItem(itemDto, dish);

        // 아이템 저장
        await manager.save(OrderItemEntity, orderItem);

        orderItems.push(orderItem);
        finalTotal += itemPrice;
      }

      // 배달비 추가
      finalTotal += restaurant.deliveryFee;

      // 4. [리팩토링] 최종 주문 객체 생성 (DTO에게 위임)
      const orderEntity = dto.toEntity(
        customer,
        restaurant,
        finalTotal,
        orderItems,
      );

      // 주문 저장
      return manager.save(OrderEntity, orderEntity);
    });
    // [트랜잭션 종료]

    // ✅ [Socket] 실시간 알림: 식당 주인에게 "새 주문 대기중" 알림 발송
    const ownerRoom = `Owner:${restaurant.ownerId}`;
    this.eventsGateway.server.to(ownerRoom).emit('newPendingOrder', {
      orderId: order.id,
      restaurantId: restaurant.id,
      total: order.total,
    });

    return order;
  }

  /**
   * 2. 주문 목록 조회
   */
  async getOrders(user: User) {
    if (user.role === Role.CLIENT) {
      return this.orderRepository.findManyWithOmitNotJoinedProps(
        { customer: { id: user.id } },
        { restaurant: true },
        { createdAt: 'DESC' },
      );
    } else if (user.role === Role.OWNER) {
      const restaurants = await this.restaurantRepository.findMany({
        ownerId: user.id,
      });
      const restaurantIds = restaurants.map((r) => r.id);
      if (restaurantIds.length === 0) return [];

      return this.orderRepository.find({
        where: { restaurant: { id: In(restaurantIds) } },
        relations: ['restaurant', 'customer'],
        order: { createdAt: 'DESC' },
      });
    } else if (user.role === Role.DELIVERY) {
      return this.orderRepository.find({
        where: [
          { status: OrderStatus.Cooked },
          { status: OrderStatus.PickedUp, driver: { id: user.id } },
        ],
        relations: ['restaurant', 'customer'],
        order: { createdAt: 'DESC' },
      });
    }
  }

  /**
   * 3. 주문 상세 조회
   */
  async getOrderById(user: User, orderId: string) {
    const order =
      await this.orderRepository.findOneWithOmitNotJoinedPropsOrThrow(
        { id: orderId },
        {
          restaurant: true,
          customer: true,
          driver: true,
          items: true,
        },
      );

    switch (user.role) {
      case Role.CLIENT:
        if (order.customerId !== user.id) {
          throw new ForbiddenException('You can only see your own orders.');
        }
        break;
      case Role.OWNER:
        if (order.restaurant.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only see orders for your restaurant.',
          );
        }
        break;
      case Role.DELIVERY:
        const isAvailableForPickup = order.status === OrderStatus.Cooked;
        const isMyDelivery = order.driverId === user.id;
        if (!isAvailableForPickup && !isMyDelivery) {
          throw new ForbiddenException('You cannot access this order.');
        }
        break;
      default:
        throw new ForbiddenException('Access denied.');
    }
    return order;
  }

  /**
   * 4. 상태 변경
   */
  async editOrderStatus(user: User, orderId: string, { status }: EditOrderDto) {
    const order =
      await this.orderRepository.findOneWithOmitNotJoinedPropsOrThrow(
        { id: orderId },
        { restaurant: true, driver: true },
      );

    if (user.role === Role.CLIENT) {
      throw new ForbiddenException('Client cannot change order status');
    }

    if (user.role === Role.OWNER) {
      if (order.restaurant.ownerId !== user.id) {
        throw new ForbiddenException('Not your restaurant');
      }
      if (status !== OrderStatus.Cooking && status !== OrderStatus.Cooked) {
        throw new ForbiddenException(
          'Owner can only update to Cooking or Cooked',
        );
      }
    }

    if (user.role === Role.DELIVERY) {
      if (status === OrderStatus.PickedUp) {
        order.driver = user;
      } else if (status === OrderStatus.Delivered) {
        if (order.driver?.id !== user.id) {
          throw new ForbiddenException('Not your delivery');
        }
      } else {
        throw new ForbiddenException(
          'Driver can only update to PickedUp or Delivered',
        );
      }
    }

    order.status = status;
    const savedOrder = await this.orderRepository.save(order);

    const orderRoom = `order:${order.id}`;
    this.eventsGateway.server.to(orderRoom).emit('orderUpdate', {
      orderId: order.id,
      status: status,
      driverId: order.driver?.id,
    });

    if (status === OrderStatus.Cooked) {
      this.eventsGateway.server.emit('newCookedOrder', {
        orderId: order.id,
        restaurantName: order.restaurant.name,
        pickupAddress: order.restaurant.address,
      });
    }

    return savedOrder;
  }

  /**
   * 👇 [Private Helper Method]
   * 주문 아이템 1개에 대한 가격 계산 및 엔티티 생성을 담당합니다.
   */
  private processOrderItem(itemDto: CreateOrderItemDto, dish: DishEntity) {
    let itemPrice = dish.price;

    // 옵션 가격 검증 및 계산
    if (itemDto.options) {
      for (const userOption of itemDto.options) {
        // DB에 있는 옵션인지, 가격은 얼마인지 확인 (보안)
        const validOption = dish.options?.find(
          (o) => o.name === userOption.name,
        );
        if (validOption) {
          itemPrice += validOption.extra;
        }
      }
    }

    // DTO의 toEntity 메서드 호출 (스냅샷 생성)
    const orderItem = itemDto.toEntity(dish);

    return { orderItem, itemPrice };
  }
}