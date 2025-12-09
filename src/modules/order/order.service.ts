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
import { DataSource, In } from 'typeorm';
import { EditOrderDto } from './dto/edit-order.dto';
import { OrderEntity } from '../../entities/order/order.entity';

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
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

    // 성능을 위해 Dish 목록 한번에 조회
    const dishIds = items.map((item) => item.dishId);
    const dishes = await this.dishRepository.findByIds(dishIds);

    // [트랜잭션 시작] 모든 저장 작업은 이 안에서 이루어짐
    return this.dataSource.transaction(async (manager) => {
      let finalTotal = 0;
      const orderItems: OrderItemEntity[] = [];

      for (const itemDto of items) {
        const dish = dishes.find((d) => d.id === itemDto.dishId);
        if (!dish)
          throw new NotFoundException(`Dish not found: ${itemDto.dishId}`);

        let dishTotal = dish.price;

        // [보안 수정] 옵션 가격 계산 로직 변경
        // 클라이언트가 보낸 'extra' 가격을 믿지 않고, DB에 있는 가격을 사용해야 함.
        if (itemDto.options) {
          for (const userOption of itemDto.options) {
            // DB에 저장된 메뉴 옵션 중에서 이름이 일치하는 것을 찾음
            const validOption = dish.options?.find(
              (o) => o.name === userOption.name,
            );

            if (validOption) {
              // ✅ 실제 DB 가격 사용 (보안 강화)
              dishTotal += validOption.extra;
            }
            // (선택사항) 유효하지 않은 옵션이 오면 에러를 던지거나 무시할 수 있음
          }
        }
        finalTotal += dishTotal;

        // 스냅샷 생성 & 저장 (manager 사용)
        // manager.save를 써야 트랜잭션 내에서 처리됨
        const orderItem = await manager.save(OrderItemEntity, {
          dish: dish,
          dishName: dish.name,
          options: itemDto.options, // 스냅샷으로는 유저가 선택한 것을 저장
        });
        orderItems.push(orderItem);
      }

      finalTotal += restaurant.deliveryFee;

      // 주문 저장 (manager 사용)
      const order = await manager.save(OrderEntity, {
        customer,
        restaurant,
        total: finalTotal,
        items: orderItems,
        status: OrderStatus.Pending,
      });

      return order;
    });
    // [트랜잭션 종료] 성공 시 자동 Commit, 에러 시 자동 Rollback
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

  /**
   * 4. 상태 변경
   * @param user 
   * @param orderId 
   * @param param2 
   * @returns 
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
        order.driver = user; // 기사 배정
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
    return this.orderRepository.save(order);
  }
}
