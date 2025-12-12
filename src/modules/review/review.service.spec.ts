import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { ReviewRepository } from './repository/review.repository';
import { OrderRepository } from '../order/repository/order.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { User } from '../../entities/user/user.entity';
import { OrderStatus } from '../../common/type/common.interface';
import { OrderEntity } from '../../entities/order/order.entity';
import { RestaurantEntity } from '../../entities/restaurant/restaurant.entity';
import { ReviewEntity } from '../../entities/review/review.entity';

// 1. Mock Repository 정의
const mockReviewRepository = {
  save: jest.fn(),
  create: jest.fn(),
};
const mockOrderRepository = {
  findByIdOrThrow: jest.fn(),
};
const mockRestaurantRepository = {
  findByIdOrThrow: jest.fn(),
};

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepository: typeof mockReviewRepository;
  let orderRepository: typeof mockOrderRepository;
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
    // 테스트용 데이터
    const user = { id: 'user-1' } as User;
    const orderId = 'order-1';
    const restaurantId = 'res-1';

    // DTO Mocking (toEntity 포함)
    const createDto = {
      orderId,
      restaurantId,
      score: 5,
      reviewText: 'Great!',
      toEntity: jest.fn(),
    } as unknown as CreateReviewDto;

    it('모든 조건이 충족되면 리뷰가 생성되어야 한다', async () => {
      // Arrange
      const order = {
        id: orderId,
        customerId: user.id, // 본인 확인 통과
        restaurantId: restaurantId, // 식당 일치 통과
        status: OrderStatus.Delivered, // 배달 완료 통과
      } as OrderEntity;

      const restaurant = { id: restaurantId } as RestaurantEntity;
      const reviewEntity = { id: 'review-1', score: 5 } as ReviewEntity;

      orderRepository.findByIdOrThrow.mockResolvedValue(order);
      restaurantRepository.findByIdOrThrow.mockResolvedValue(restaurant);
      (createDto.toEntity as jest.Mock).mockReturnValue(reviewEntity);
      reviewRepository.save.mockResolvedValue(reviewEntity);

      // Act
      const result = await service.createReview(user, createDto);

      // Assert
      expect(orderRepository.findByIdOrThrow).toHaveBeenCalledWith(orderId);
      expect(restaurantRepository.findByIdOrThrow).toHaveBeenCalledWith(
        restaurantId,
      );
      expect(createDto.toEntity).toHaveBeenCalledWith(user, restaurant); // toEntity 호출 확인
      expect(reviewRepository.save).toHaveBeenCalledWith(reviewEntity);
      expect(result).toEqual(reviewEntity);
    });

    it('본인의 주문이 아니면 BadRequestException을 던져야 한다', async () => {
      const order = {
        id: orderId,
        customerId: 'other-user', // ❌ 불일치
        restaurantId: restaurantId,
        status: OrderStatus.Delivered,
      } as OrderEntity;

      orderRepository.findByIdOrThrow.mockResolvedValue(order);

      await expect(service.createReview(user, createDto)).rejects.toThrow(
        BadRequestException,
      );
      // 이후 로직 실행 안 됨
      expect(restaurantRepository.findByIdOrThrow).not.toHaveBeenCalled();
    });

    it('주문의 식당과 리뷰하려는 식당이 다르면 BadRequestException을 던져야 한다', async () => {
      const order = {
        id: orderId,
        customerId: user.id,
        restaurantId: 'other-res', // ❌ 불일치
        status: OrderStatus.Delivered,
      } as OrderEntity;

      orderRepository.findByIdOrThrow.mockResolvedValue(order);

      await expect(service.createReview(user, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('배달 완료(Delivered) 상태가 아니면 BadRequestException을 던져야 한다', async () => {
      const order = {
        id: orderId,
        customerId: user.id,
        restaurantId: restaurantId,
        status: OrderStatus.PickedUp, // ❌ 배달 중
      } as OrderEntity;

      orderRepository.findByIdOrThrow.mockResolvedValue(order);

      await expect(service.createReview(user, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('주문이 존재하지 않으면 NotFoundException(Repo에서 발생)이 전파되어야 한다', async () => {
      orderRepository.findByIdOrThrow.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(service.createReview(user, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
