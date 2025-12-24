import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewRepository } from './repository/review.repository';
import { OrderRepository } from '../order/repository/order.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { User } from '../../entities/user/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrderStatus } from '../../common/type/common.interface';
import { UpdateReviewDto } from './dto/update-review.dto';

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

  /**
   * 리뷰 수정
   */
  async updateReview(user: User, reviewId: string, dto: UpdateReviewDto) {
    // 1. 리뷰 조회
    const review = await this.reviewRepository.findOneByFilters({
      id: reviewId,
    });
    if (!review) throw new NotFoundException('Review not found');

    // 2. 권한 확인(작성자 보인인지)
    // review.client가 로드되어 있지 않을 수 있으므로 clientId 등으로 비교하거나 relation 로드 필요
    // 여기서는 review 엔티티에 clientId 컬럼이 있다고 가정하거나, relation으로 가져와야 함.
    // 보통 TypeORM에서는 relation id를 로드하거나, 조회시 relations:['client'] 사용
    const reviewWithClient =
      await this.reviewRepository.findOneWithOmitNotJoinedPropsOrThrow(
        { id: reviewId },
        { client: true },
      );

    if (reviewWithClient.client.id !== user.id) {
      throw new ForbiddenException('You can only update your own reviews.');
    }

    // 3. 수정
    const updateReview = this.reviewRepository.create({
      ...reviewWithClient,
      ...dto,
    });

    return this.reviewRepository.save(updateReview);
  }

  /**
   * 리뷰 삭제
   */
  async deleteReview(user: User, reviewId: string) {
    const review =
      await this.reviewRepository.findOneWithOmitNotJoinedPropsOrThrow(
        { id: reviewId },
        { client: true },
      );

    if (review.client.id !== user.id) {
      throw new ForbiddenException('You can only delete your own reviews.');
    }

    // Soft Delete (TypeORM의 @DeleteDateColumn이 엔티티에 있어야 함)
    await this.reviewRepository.softDelete(reviewId);

    return { success: true };
  }
}
