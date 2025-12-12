import { Test, TestingModule } from '@nestjs/testing';
import { DishService } from './dish.service';
import { DishRepository } from './repository/dish.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateDishDto } from './dto/create-dish.dto';
import { User } from '../../entities/user/user.entity';
import { DishEntity } from '../../entities/dish/dish.entity';

// 1. Repository Mock 정의
const mockDishRepository = {
  save: jest.fn(),
  findOneWithOmitNotJoinedPropsOrThrow: jest.fn(),
  softDelete: jest.fn(),
};

const mockRestaurantRepository = {
  findByIdOrThrow: jest.fn(),
};

describe('DishService', () => {
  let service: DishService;
  let dishRepository: typeof mockDishRepository;
  let restaurantRepository: typeof mockRestaurantRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DishService,
        {
          provide: DishRepository,
          useValue: mockDishRepository,
        },
        {
          provide: RestaurantRepository,
          useValue: mockRestaurantRepository,
        },
      ],
    }).compile();

    service = module.get<DishService>(DishService);
    dishRepository = module.get(DishRepository);
    restaurantRepository = module.get(RestaurantRepository);

    jest.clearAllMocks(); // 각 테스트 격리
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDish', () => {
    const owner = { id: 'owner-1' } as User;
    const otherUser = { id: 'other-1' } as User;
    const restaurantId = 'res-1';

    // DTO Mocking (toEntity 메서드 포함)
    const createDto = {
      name: 'Chicken',
      price: 1000,
      toEntity: jest.fn(),
    } as unknown as CreateDishDto;

    it('본인 식당에 메뉴를 추가하면 성공해야 한다', async () => {
      const restaurant = { id: restaurantId, ownerId: 'owner-1' };
      const dishEntity = { id: 'dish-1', name: 'Chicken' };

      // Mock setup
      restaurantRepository.findByIdOrThrow.mockResolvedValue(restaurant);
      (createDto.toEntity as jest.Mock).mockReturnValue(dishEntity);
      dishRepository.save.mockResolvedValue(dishEntity);

      // Act
      const result = await service.createDish(owner, restaurantId, createDto);

      // Assert
      expect(restaurantRepository.findByIdOrThrow).toHaveBeenCalledWith(
        restaurantId,
      );
      expect(createDto.toEntity).toHaveBeenCalledWith(restaurantId);
      expect(dishRepository.save).toHaveBeenCalledWith(dishEntity);
      expect(result).toEqual(dishEntity);
    });

    it('본인 식당이 아니면 ForbiddenException을 던져야 한다', async () => {
      const restaurant = { id: restaurantId, ownerId: 'owner-1' };

      // Mock setup (조회는 성공하지만 주인이 다름)
      restaurantRepository.findByIdOrThrow.mockResolvedValue(restaurant);

      // Act & Assert
      await expect(
        service.createDish(otherUser, restaurantId, createDto),
      ).rejects.toThrow(ForbiddenException);

      // save는 호출되지 않아야 함
      expect(dishRepository.save).not.toHaveBeenCalled();
    });

    it('식당이 존재하지 않으면 NotFoundException(Repo에서 발생)이 전파되어야 한다', async () => {
      restaurantRepository.findByIdOrThrow.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        service.createDish(owner, restaurantId, createDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDish', () => {
    const owner = { id: 'owner-1' } as User;
    const otherUser = { id: 'other-1' } as User;
    const dishId = 'dish-1';

    it('본인 식당의 메뉴를 삭제하면 성공해야 한다', async () => {
      const dish = {
        id: dishId,
        restaurant: { ownerId: 'owner-1' },
      };

      // Mock setup
      dishRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        dish,
      );
      dishRepository.softDelete.mockResolvedValue({ affected: 1 });

      // Act
      const result = await service.deleteDish(owner, dishId);

      // Assert
      expect(
        dishRepository.findOneWithOmitNotJoinedPropsOrThrow,
      ).toHaveBeenCalledWith(
        { id: dishId },
        { restaurant: true }, // relation load 확인
      );
      expect(dishRepository.softDelete).toHaveBeenCalledWith(dishId);
      expect(result).toEqual({ success: true });
    });

    it('본인 식당의 메뉴가 아니면 ForbiddenException을 던져야 한다', async () => {
      const dish = {
        id: dishId,
        restaurant: { ownerId: 'owner-1' },
      };

      // Mock setup
      dishRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        dish,
      );

      // Act & Assert (다른 유저가 요청)
      await expect(service.deleteDish(otherUser, dishId)).rejects.toThrow(
        ForbiddenException,
      );

      expect(dishRepository.softDelete).not.toHaveBeenCalled();
    });

    it('메뉴가 존재하지 않으면 NotFoundException이 전파되어야 한다', async () => {
      dishRepository.findOneWithOmitNotJoinedPropsOrThrow.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(service.deleteDish(owner, dishId)).rejects.toThrow(
        NotFoundException,
      );

      expect(dishRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
