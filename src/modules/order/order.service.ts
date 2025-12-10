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
import { CreateOrderDto } from './dto/create-order.dto';
import { EditOrderDto } from './dto/edit-order.dto';
import { OrderStatus } from '../../common/type/common.interface';
import { Role } from '../../entities/user/user.interface';
import { EventsGateway } from '../../events/events.gateway';

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
  async createOrder(customer: User, { restaurantId, items }: CreateOrderDto) {
    const restaurant =
      await this.restaurantRepository.findByIdOrThrow(restaurantId);

    // 성능을 위해 Dish 목록 한번에 조회
    const dishIds = items.map((item) => item.dishId);
    const dishes = await this.dishRepository.findByIds(dishIds);

    // [트랜잭션 시작]
    const order = await this.dataSource.transaction(async (manager) => {
      let finalTotal = 0;
      const orderItems: OrderItemEntity[] = [];

      for (const itemDto of items) {
        const dish = dishes.find((d) => d.id === itemDto.dishId);
        if (!dish)
          throw new NotFoundException(`Dish not found: ${itemDto.dishId}`);

        let dishTotal = dish.price;

        // 보안: 옵션 가격 검증 (DB 가격 사용)
        if (itemDto.options) {
          for (const userOption of itemDto.options) {
            const validOption = dish.options?.find(
              (o) => o.name === userOption.name,
            );
            if (validOption) {
              dishTotal += validOption.extra;
            }
          }
        }
        finalTotal += dishTotal;

        // 스냅샷 생성 & 저장
        const orderItem = await manager.save(OrderItemEntity, {
          dish: dish,
          dishName: dish.name,
          options: itemDto.options,
        });
        orderItems.push(orderItem);
      }

      finalTotal += restaurant.deliveryFee;

      // 주문 저장
      const newOrder = await manager.save(OrderEntity, {
        customer,
        restaurant,
        restaurantId: restaurant.id, // 명시적 ID 할당
        total: finalTotal,
        items: orderItems,
        status: OrderStatus.Pending,
      });

      return newOrder;
    });
    // [트랜잭션 종료]

    // ✅ [Socket] 실시간 알림: 식당 주인에게 "새 주문 대기중" 알림 발송
    const ownerRoom = `Owner:${restaurant.ownerId}`;
    this.eventsGateway.server.to(ownerRoom).emit('newPendingOrder', {
      orderId: order.id,
      restaurantId: restaurant.id,
      total: order.total,
      // User 엔티티에 address가 없으므로 제외 (기존 기획 준수)
    });

    return order;
  }

  /**
   * 2. 주문 목록 조회 (기존 유지)
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
   * 3. 주문 상세 조회 (기존 유지 - 권한 체크 포함)
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
   * 4. 상태 변경 (Owner / Delivery)
   * - REST API로 상태 변경 후 Socket으로 전파
   */
  async editOrderStatus(user: User, orderId: string, { status }: EditOrderDto) {
    // 조회 시 restaurant 정보 필요 (Owner 체크용)
    const order =
      await this.orderRepository.findOneWithOmitNotJoinedPropsOrThrow(
        { id: orderId },
        { restaurant: true, driver: true },
      );

    // 권한 체크 로직 (기존 유지)
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
        order.driver = user; // 배달원 배정 (takeOrder 로직 통합)
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

    // 상태 업데이트 및 저장
    order.status = status;
    const savedOrder = await this.orderRepository.save(order);

    // [Socket] 실시간 알림: 주문 상태 변경 (고객, 점주, 배달원 모두에게)
    const orderRoom = `order:${order.id}`;
    this.eventsGateway.server.to(orderRoom).emit('orderUpdate', {
      orderId: order.id,
      status: status,
      driverId: order.driver?.id,
    });

    // [Socket] 실시간 알림: 조리 완료 시 (배달원들에게 알림)
    if (status === OrderStatus.Cooked) {
      // 모든 배달원이 듣는 채널이 있다고 가정, 혹은 근처 배달원 필터링 로직 필요
      // 여기서는 단순화를 위해 전체 배달 알림 채널로 전송 예시
      this.eventsGateway.server.emit('newCookedOrder', {
        orderId: order.id,
        restaurantName: order.restaurant.name,
        pickupAddress: order.restaurant.address, // 기존 DB의 address 사용
      });
    }

    return savedOrder;
  }
}
