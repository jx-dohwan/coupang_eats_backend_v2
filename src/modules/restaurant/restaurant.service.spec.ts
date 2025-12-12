import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantService } from './restaurant.service';
import { RestaurantRepository } from './repository/restaurant.repository';
import { CategoryRepository } from '../category/repository/category.repository';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { User } from '../../entities/user/user.entity';
import { Role } from '../../entities/user/user.interface';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantEntity } from '../../entities/restaurant/restaurant.entity';
import { CategoryEntity } from '../../entities/category/category.entity';
import { PaginationRequest } from '../../common/pagination/pagination.request';

// Mock Repository 정의
const mockRestaurantRepository = {
  save: jest.fn(),
  findMany: jest.fn(),
  paginate: jest.fn(),
  findOneWithOmitNotJoinedPropsOrThrow: jest.fn(),
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
    
    // DTO의 toEntity 메서드 Mocking을 위해 객체 리터럴로 생성
    const createDto = {
      categoryId: 'cat-1',
      toEntity: jest.fn(),
    } as unknown as CreateRestaurantDto;

    it('점주(Owner)가 유효한 정보로 요청하면 식당을 생성해야 한다', async () => {
      const category = { id: 'cat-1' } as CategoryEntity;
      const restaurantEntity = { id: 'res-1' } as RestaurantEntity;

      // Mock setup
      categoryRepository.findByIdOrThrow.mockResolvedValue(category);
      // toEntity가 호출되면 restaurantEntity를 반환한다고 가정
      (createDto.toEntity as jest.Mock).mockReturnValue(restaurantEntity);
      restaurantRepository.save.mockResolvedValue({ ...restaurantEntity, category });

      // Execution
      const result = await service.createRestaurant(owner, createDto);

      // Verification
      expect(categoryRepository.findByIdOrThrow).toHaveBeenCalledWith(createDto.categoryId);
      expect(createDto.toEntity).toHaveBeenCalledWith(owner.id);
      expect(restaurantEntity.category).toEqual(category); // 카테고리 주입 확인
      expect(restaurantRepository.save).toHaveBeenCalledWith(restaurantEntity);
      expect(result).toBeDefined();
    });

    it('점주가 아닌 유저가 요청하면 UnauthorizedException을 던져야 한다', async () => {
      await expect(service.createRestaurant(client, createDto)).rejects.toThrow(
        UnauthorizedException,
      );
      // 리포지토리는 호출되지 않아야 함
      expect(categoryRepository.findByIdOrThrow).not.toHaveBeenCalled();
      expect(restaurantRepository.save).not.toHaveBeenCalled();
    });

    it('존재하지 않는 카테고리 ID라면 실패해야 한다 (NotFoundException)', async () => {
      categoryRepository.findByIdOrThrow.mockRejectedValue(new NotFoundException());

      await expect(service.createRestaurant(owner, createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(restaurantRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getMyRestaurants', () => {
    it('내 ID로 등록된 식당 목록을 조회해야 한다', async () => {
      const owner = { id: 'owner-1' } as User;
      const restaurants = [{ id: 'res-1' }];
      
      restaurantRepository.findMany.mockResolvedValue(restaurants);

      const result = await service.getMyRestaurants(owner);

      expect(restaurantRepository.findMany).toHaveBeenCalledWith({ ownerId: owner.id });
      expect(result).toEqual(restaurants);
    });
  });

  describe('getRestaurants', () => {
    const pagination = new PaginationRequest();

    it('카테고리 ID가 없으면 빈 필터로 페이지네이션을 호출해야 한다', async () => {
      restaurantRepository.paginate.mockResolvedValue([]);

      await service.getRestaurants(pagination);

      expect(restaurantRepository.paginate).toHaveBeenCalledWith(pagination, {});
    });

    it('카테고리 ID가 있으면 해당 필터로 페이지네이션을 호출해야 한다', async () => {
      const categoryId = 'cat-1';
      restaurantRepository.paginate.mockResolvedValue([]);

      await service.getRestaurants(pagination, categoryId);

      expect(restaurantRepository.paginate).toHaveBeenCalledWith(pagination, { categoryId });
    });
  });

  describe('getRestaurantById', () => {
    it('식당 ID로 상세 정보를 조회해야 한다 (dishes, category 포함)', async () => {
      const restaurantId = 'res-1';
      const restaurant = { id: restaurantId };

      restaurantRepository.findOneWithOmitNotJoinedPropsOrThrow.mockResolvedValue(restaurant);

      const result = await service.getRestaurantById(restaurantId);

      expect(restaurantRepository.findOneWithOmitNotJoinedPropsOrThrow).toHaveBeenCalledWith(
        { id: restaurantId },
        { dishes: true, category: true },
      );
      expect(result).toEqual(restaurant);
    });
  });
});