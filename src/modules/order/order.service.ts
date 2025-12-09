import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderItemRepository } from './repository/order-item.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { DishRepository } from '../dish/repository/dish.repository';
import { OrderRepository } from './repository/order.repository';
import { User } from '../../entities/user/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemEntity } from '../../entities/order/order-item.entity';
import { OrderStatus } from '../../common/type/common.interface';
import { Role } from '../../entities/user/user.interface';
import { In } from 'typeorm';
import { EditOrderDto } from './dto/edit-order.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly restaurantRepository: RestaurantRepository,
    private readonly dishRepository: DishRepository,
  ) {}

  /**
   * 1. 주문 생성
   * @param customer
   * @param param1
   * @returns
   */

  async createOrder(customer: User, { restaurantId, items }: CreateOrderDto) {
    const restaurant =
      await this.restaurantRepository.findByIdOrThrow(restaurantId);

    let finalTotal = 0;
    const orderItems: OrderItemEntity[] = [];

    // 성능을 위해 Dish 목록 한번에 조회
    const dishIds = items.map((item) => item.dishId);
    const dishes = await this.dishRepository.findByIds(dishIds);

    for (const itemDto of items) {
      const dish = dishes.find((d) => d.id === itemDto.dishId);
      if (!dish)
        throw new NotFoundException(`Dish not found: ${itemDto.dishId}`);

      let dishTotal = dish.price;

      // 옵션 가격 계산
      if (itemDto.options) {
        for (const option of itemDto.options) {
          dishTotal += option.extra;
        }
      }
      finalTotal += dishTotal;

      // 스냅샷 생성
      const orderItem = await this.orderItemRepository.save(
        this.orderItemRepository.create({
          dish: dish,
          dishName: dish.name,
          options: itemDto.options,
        }),
      );
      orderItems.push(orderItem);
    }

    finalTotal += restaurant.deliveryFee;

    const order = await this.orderRepository.save(
      this.orderRepository.create({
        customer,
        restaurant,
        total: finalTotal,
        items: orderItems,
        status: OrderStatus.Pending,
      }),
    );

    return order;
  }

  /**
   * 2. 주문 목록 조회
   * @param user
   * @returns
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
      // 조리 완료 or 내가 배달 중인 것
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
   * @param user
   * @param orderId
   * @returns
   */
  async getOrderById(user: User, orderId: string) {
    // 1. 주문 정보를 조회할 때, 권한 판단에 필요한 관계(Relation)들을 모두 가져옵니다.
    const order =
      await this.orderRepository.findOneWithOmitNotJoinedPropsOrThrow(
        { id: orderId },
        {
          restaurant: true, // 점주 확인용
          customer: true, // 고객 확인용
          driver: true, // 기사 확인용
          items: true, // 상세 내용
        },
      );

    // 2. 역할(Role)별 소유권/접근권한 검증 로직
    switch (user.role) {
      case Role.CLIENT:
        // 고객은 "자신이 주문한 건"만 볼 수 있음
        if (order.customerId !== user.id) {
          throw new ForbiddenException('You can only see your own orders.');
        }
        break;

      case Role.OWNER:
        // 점주는 "자신의 식당에 들어온 주문"만 볼 수 있음
        if (order.restaurant.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only see orders for your restaurant.',
          );
        }
        break;

      case Role.DELIVERY:
        // 기사는 두 가지 경우에만 볼 수 있음
        // A. 배차 대기 중인 주문 (상태가 Cooked) -> 상세 주소를 보고 배차 수락 여부 결정
        // B. 이미 내가 배차 받은 주문 (driverId 일치)
        const isAvailableForPickup = order.status === OrderStatus.Cooked;
        const isMyDelivery = order.driverId === user.id;

        if (!isAvailableForPickup && !isMyDelivery) {
          throw new ForbiddenException('You cannot access this order.');
        }
        break;

      default:
        // 정의되지 않은 역할은 접근 불가 (방어적 코딩)
        throw new ForbiddenException('Access denied.');
    }

    // 3. 검증 통과 시 데이터 반환
    return order;
  }

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
        order.driver = user; // 기사 배정
      } else if (status === OrderStatus.Delivered) {
        if (order.driver?.id !== user.id) {
          throw new ForbiddenException('Not your delivery');
        }
      } else {
        throw new ForbiddenException(
          'Driver can only update to PickedUp or Deliveryed',
        );
      }
    }

    order.status = status;
    return this.orderRepository.save(order);
  }
}
