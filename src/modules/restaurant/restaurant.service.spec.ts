import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantService } from './restaurant.service';
import { RestaurantRepository } from './repository/restaurant.repository';
import { CategoryRepository } from '../category/repository/category.repository';
import {
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '../../entities/user/user.entity';
import { Role } from '../../entities/user/user.interface';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantEntity } from '../../entities/restaurant/restaurant.entity';
import { CategoryEntity } from '../../entities/category/category.entity';
import { PaginationRequest } from '../../common/pagination/pagination.request';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

// Mock Repository 정의
const mockRestaurantRepository = {
  save: jest.fn(),
  findMany: jest.fn(),
  paginate: jest.fn(),
  findOneWithOmitNotJoinedPropsOrThrow: jest.fn(),
  // [NEW] updateRestaurant에서 사용됨
  findByIdOrThrow: jest.fn(),
  create: jest.fn(),
};

const mockCategoryRepository = {
  findByIdOrThrow: jest.fn(),
};

describe('RestaurantService', () => {
  let service: RestaurantService;
  let restaurantRepository: typeof mockRestaurantRepository;
  let categoryRepository: typeof mockCategoryRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: RestaurantRepository,
          useValue: mockRestaurantRepository,
        },
        {
          provide: CategoryRepository,
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
    restaurantRepository = module.get(RestaurantRepository);
    categoryRepository = module.get(CategoryRepository);

    // 각 테스트 실행 전 Mock 초기화
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
    const owner = { id: 'user-1', role: Role.OWNER } as User;
    const client = { id: 'user-2', role: Role.CLIENT } as User;

    const createDto = {
      categoryId: 'cat-1',
      toEntity: jest.fn(),
    } as unknown as CreateRestaurantDto;

    it('점주(Owner)가 유효한 정보로 요청하면 식당을 생성해야 한다', async () => {
      const category = { id: 'cat-1' } as CategoryEntity;
      const restaurantEntity = { id: 'res-1' } as RestaurantEntity;

      categoryRepository.findByIdOrThrow.mockResolvedValue(category);
      (createDto.toEntity as jest.Mock).mockReturnValue(restaurantEntity);
      restaurantRepository.save.mockResolvedValue({
        ...restaurantEntity,
        category,
      });

      const result = await service.createRestaurant(owner, createDto);

      expect(categoryRepository.findByIdOrThrow).toHaveBeenCalledWith(
        createDto.categoryId,
      );
      expect(createDto.toEntity).toHaveBeenCalledWith(owner.id);
      expect(restaurantEntity.category).toEqual(category);
      expect(restaurantRepository.save).toHaveBeenCalledWith(restaurantEntity);
      expect(result).toBeDefined();
    });

    it('점주가 아닌 유저가 요청하면 UnauthorizedException을 던져야 한다', async () => {
      await expect(service.createRestaurant(client, createDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(categoryRepository.findByIdOrThrow).not.toHaveBeenCalled();
      expect(restaurantRepository.save).not.toHaveBeenCalled();
    });

    it('존재하지 않는 카테고리 ID라면 실패해야 한다 (NotFoundException)', async () => {
      categoryRepository.findByIdOrThrow.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(service.createRestaurant(owner, createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(restaurantRepository.save).not.toHaveBeenCalled();
    });
  });

  // [NEW] updateRestaurant 테스트 추가
  describe('updateRestaurant', () => {
    const owner = { id: 'owner-1' } as User;
    const otherUser = { id: 'other-1' } as User;
    const restaurantId = 'res-1';
    const updateDto: UpdateRestaurantDto = { name: 'New Name' };

    it('본인의 식당 정보를 수정하면 성공해야 한다', async () => {
      // Arrange
      const restaurant = { id: restaurantId, ownerId: 'owner-1' };
      const updatedRestaurant = { ...restaurant, ...updateDto };

      restaurantRepository.findByIdOrThrow.mockResolvedValue(restaurant);
      restaurantRepository.create.mockReturnValue(updatedRestaurant);
      restaurantRepository.save.mockResolvedValue(updatedRestaurant);

      // Act
      const result = await service.updateRestaurant(
        owner,
        restaurantId,
        updateDto,
      );

      // Assert
      expect(restaurantRepository.findByIdOrThrow).toHaveBeenCalledWith(
        restaurantId,
      );
      expect(restaurantRepository.create).toHaveBeenCalledWith({
        ...restaurant,
        ...updateDto,
      });
      expect(restaurantRepository.save).toHaveBeenCalledWith(updatedRestaurant);
      expect(result.name).toBe('New Name');
    });

    it('카테고리를 변경할 경우 카테고리 존재 여부를 확인해야 한다', async () => {
      // Arrange
      const dtoWithCategory = { categoryId: 'new-cat' };
      const restaurant = { id: restaurantId, ownerId: 'owner-1' };

      restaurantRepository.findByIdOrThrow.mockResolvedValue(restaurant);
      categoryRepository.findByIdOrThrow.mockResolvedValue({
        id: 'new-cat',
      } as any);
      restaurantRepository.create.mockReturnValue({});
      restaurantRepository.save.mockResolvedValue({});

      // Act
      await service.updateRestaurant(owner, restaurantId, dtoWithCategory);

      // Assert
      expect(categoryRepository.findByIdOrThrow).toHaveBeenCalledWith(
        'new-cat',
      );
    });

    it('본인의 식당이 아니면 ForbiddenException을 던져야 한다', async () => {
      const restaurant = { id: restaurantId, ownerId: 'owner-1' };
      restaurantRepository.findByIdOrThrow.mockResolvedValue(restaurant);

      await expect(
        service.updateRestaurant(otherUser, restaurantId, updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(restaurantRepository.save).not.toHaveBeenCalled();
    });

    it('식당이 존재하지 않으면 NotFoundException이 전파되어야 한다', async () => {
      restaurantRepository.findByIdOrThrow.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        service.updateRestaurant(owner, restaurantId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyRestaurants', () => {
    it('내 ID로 등록된 식당 목록을 조회해야 한다', async () => {
      const owner = { id: 'owner-1' } as User;
      const restaurants = [{ id: 'res-1' }];

      restaurantRepository.findMany.mockResolvedValue(restaurants);

      const result = await service.getMyRestaurants(owner);

      expect(restaurantRepository.findMany).toHaveBeenCalledWith({
        ownerId: owner.id,
      });
      expect(result).toEqual(restaurants);
    });
  });

  describe('getRestaurants', () => {
    const pagination = new PaginationRequest();

    it('카테고리 ID가 없으면 빈 필터로 페이지네이션을 호출해야 한다', async () => {
      restaurantRepository.paginate.mockResolvedValue([]);

      await service.getRestaurants(pagination);

      expect(restaurantRepository.paginate).toHaveBeenCalledWith(
        pagination,
        {},
      );
    });

    it('카테고리 ID가 있으면 해당 필터로 페이지네이션을 호출해야 한다', async () => {
      const categoryId = 'cat-1';
      restaurantRepository.paginate.mockResolvedValue([]);

      await service.getRestaurants(pagination, categoryId);

      expect(restaurantRepository.paginate).toHaveBeenCalledWith(pagination, {
        categoryId,
      });
    });
  });

  describe('getRestaurantById', () => {
    it('식당 ID로 상세 정보를 조회해야 한다 (dishes, category 포함)', async () => {
      const restaurantId = 'res-1';
      const restaurant = { id: restaurantId };

      restaurantRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(
        restaurant,
      );

      const result = await service.getRestaurantById(restaurantId);

      expect(
        restaurantRepository.findOneWithOmitNotJoinedPropsOrThrow,
      ).toHaveBeenCalledWith(
        { id: restaurantId },
        { dishes: true, category: true },
      );
      expect(result).toEqual(restaurant);
    });
  });
});
