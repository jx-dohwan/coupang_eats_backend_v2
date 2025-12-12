import { BadRequestException, Injectable } from '@nestjs/common';
import { ReviewRepository } from './repository/review.repository';
import { OrderRepository } from '../order/repository/order.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { User } from '../../entities/user/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrderStatus } from '../../common/type/common.interface';

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly orderRepository: OrderRepository,
    private readonly restaurantRepository: RestaurantRepository,
  ) {}

  async createReview(user: User, dto: CreateReviewDto) {
    // 1. 주문 조회
    const order = await this.orderRepository.findByIdOrThrow(dto.orderId);

    // 2. 권한 및 상태 검증
    if (order.customerId !== user.id) {
      throw new BadRequestException('You can only review your own orders.');
    }
    if (order.restaurantId !== dto.restaurantId) {
      throw new BadRequestException('Order does not match restaurant.');
    }
    if (order.status !== OrderStatus.Delivered) {
      throw new BadRequestException(
        'You can only review after delivery is complete.',
      );
    }

    // 3. 식당 조회
    const restaurant = await this.restaurantRepository.findByIdOrThrow(
      dto.restaurantId,
    );

    const review = dto.toEntity(user, restaurant);

    return this.reviewRepository.save(review);
  }
}
