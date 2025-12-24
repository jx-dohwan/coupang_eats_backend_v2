import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { ReviewRepository } from './repository/review.repository';
import { OrderRepository } from '../order/repository/order.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { User } from '../../entities/user/user.entity';
import { OrderStatus } from '../../common/type/common.interface';
import { OrderEntity } from '../../entities/order/order.entity';
import { RestaurantEntity } from '../../entities/restaurant/restaurant.entity';
import { ReviewEntity } from '../../entities/review/review.entity';

// 1. Mock Repository 정의
const mockReviewRepository = {
  save: jest.fn(),
  create: jest.fn(),
  findOneByFilters: jest.fn(), // 중복 체크용 추가
  findOneWithOmitNotJoinedPropsOrThrow: jest.fn(), // 조회용 (Update/Delete)
  softDelete: jest.fn(),
};

const mockOrderRepository = {
  // [변경] findByIdOrThrow -> findOneWithOmitNotJoinedPropsOrThrow (Relation 포함)
  findOneWithOmitNotJoinedPropsOrThrow: jest.fn(),
};

const mockRestaurantRepository = {
  // 로직 변경으로 인해 더 이상 서비스에서 직접 호출하지 않음 (Order를 통해 가져옴)
  // 하지만 의존성 주입을 위해 Mock은 유지
  findByIdOrThrow: jest.fn(),
};

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepository: typeof mockReviewRepository;
  let orderRepository: typeof mockOrderRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let restaurantRepository: typeof mockRestaurantRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: ReviewRepository, useValue: mockReviewRepository },
        { provide: OrderRepository, useValue: mockOrderRepository },
        { provide: RestaurantRepository, useValue: mockRestaurantRepository },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    reviewRepository = module.get(ReviewRepository);
    orderRepository = module.get(OrderRepository);
    restaurantRepository = module.get(RestaurantRepository);

    jest.clearAllMocks();
  });

  describe('createReview', () => {
    const user = { id: 'user-1' } as User;
    const orderId = 'order-1';
    const restaurantId = 'res-1';

    const createDto = {
      orderId,
      restaurantId,
      score: 5,
      reviewText: 'Great!',
      toEntity: jest.fn(),
    } as unknown as CreateReviewDto;

    it('모든 조건이 충족되고 중복 리뷰가 없으면 리뷰가 생성되어야 한다', async () => {
      // Arrange
      const restaurant = { id: restaurantId } as RestaurantEntity;
      // [중요] Order 조회 시 Restaurant가 Join 되어야 함
      const order = {
        id: orderId,
        customerId: user.id,
        restaurant: restaurant, // Join된 식당 객체
        status: OrderStatus.Delivered,
      } as OrderEntity;

      const reviewEntity = { id: 'review-1', score: 5 } as ReviewEntity;

      // Mock Setup
      orderRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        order,
      );
      reviewRepository.findOneByFilters.mockResolvedValue(null); // 중복 없음
      (createDto.toEntity as jest.Mock).mockReturnValue(reviewEntity);
      reviewRepository.save.mockResolvedValue(reviewEntity);

      // Act
      const result = await service.createReview(user, createDto);

      // Assert
      // 1. 주문 조회 시 Relations 옵션 확인
      expect(
        orderRepository.findOneWithOmitNotJoinedPropsOrThrow,
      ).toHaveBeenCalledWith({ id: orderId }, { restaurant: true });

      // 2. 중복 체크 호출 확인
      expect(reviewRepository.findOneByFilters).toHaveBeenCalledWith({
        order: { id: orderId },
      });

      // 3. 저장 확인
      expect(createDto.toEntity).toHaveBeenCalledWith(user, restaurant);
      expect(reviewRepository.save).toHaveBeenCalledWith(reviewEntity);
      expect(result).toEqual(reviewEntity);
    });

    it('이미 해당 주문에 대한 리뷰가 존재하면 ConflictException을 던져야 한다', async () => {
      // Arrange
      const order = {
        id: orderId,
        customerId: user.id,
        restaurant: { id: restaurantId },
        status: OrderStatus.Delivered,
      } as OrderEntity;

      // Mock Setup
      orderRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        order,
      );
      // [중요] 이미 리뷰가 있다고 리턴
      reviewRepository.findOneByFilters.mockResolvedValue({
        id: 'existing-review',
      });

      // Act & Assert
      await expect(service.createReview(user, createDto)).rejects.toThrow(
        ConflictException,
      );

      // 저장은 실행되지 않아야 함
      expect(reviewRepository.save).not.toHaveBeenCalled();
    });

    it('본인의 주문이 아니면 BadRequestException을 던져야 한다', async () => {
      const order = {
        id: orderId,
        customerId: 'other-user', // 불일치
        restaurant: { id: restaurantId },
      } as OrderEntity;

      orderRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        order,
      );

      await expect(service.createReview(user, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('주문의 식당과 리뷰하려는 식당이 다르면 BadRequestException을 던져야 한다', async () => {
      const order = {
        id: orderId,
        customerId: user.id,
        restaurant: { id: 'other-res' }, // 불일치
        status: OrderStatus.Delivered,
      } as OrderEntity;

      orderRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        order,
      );

      await expect(service.createReview(user, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateReview', () => {
    const user = { id: 'user-1' } as User;
    const reviewId = 'review-1';
    const updateDto = { score: 1 } as UpdateReviewDto;

    it('본인의 리뷰라면 수정에 성공해야 한다', async () => {
      // Arrange
      const review = {
        id: reviewId,
        client: { id: user.id }, // 작성자 일치
        score: 5,
      } as ReviewEntity;

      const updatedReview = { ...review, score: 1 };

      // Mock Setup
      // [변경] findOne -> findOneWithOmitNotJoinedPropsOrThrow 로직 변경 반영
      reviewRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        review,
      );
      reviewRepository.create.mockReturnValue(updatedReview);
      reviewRepository.save.mockResolvedValue(updatedReview);

      // Act
      const result = await service.updateReview(user, reviewId, updateDto);

      // Assert
      expect(
        reviewRepository.findOneWithOmitNotJoinedPropsOrThrow,
      ).toHaveBeenCalledWith({ id: reviewId }, { client: true });
      expect(reviewRepository.save).toHaveBeenCalledWith(updatedReview);
      expect(result.score).toBe(1);
    });

    it('본인의 리뷰가 아니면 ForbiddenException을 던져야 한다', async () => {
      // Arrange
      const review = {
        id: reviewId,
        client: { id: 'other-user' }, // 불일치
      } as ReviewEntity;

      reviewRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        review,
      );

      // Act & Assert
      await expect(
        service.updateReview(user, reviewId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('리뷰가 존재하지 않으면 NotFoundException이 전파되어야 한다', async () => {
      reviewRepository.findOneWithOmitNotJoinedPropsOrThrow.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        service.updateReview(user, reviewId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteReview', () => {
    const user = { id: 'user-1' } as User;
    const reviewId = 'review-1';

    it('본인의 리뷰라면 삭제(Soft Delete)에 성공해야 한다', async () => {
      const review = {
        id: reviewId,
        client: { id: user.id },
      } as ReviewEntity;

      reviewRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        review,
      );

      await service.deleteReview(user, reviewId);

      expect(
        reviewRepository.findOneWithOmitNotJoinedPropsOrThrow,
      ).toHaveBeenCalledWith({ id: reviewId }, { client: true });
      expect(reviewRepository.softDelete).toHaveBeenCalledWith(reviewId);
    });
  });
});
