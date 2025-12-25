import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantService } from './restaurant.service';
import { DataSource } from 'typeorm';
import { RestaurantRepository } from './repository/restaurant.repository';
import { CategoryRepository } from '../category/repository/category.repository';
import { User } from '../../entities/user/user.entity';
import { Role } from '../../entities/user/user.interface';
import { UnauthorizedException } from '@nestjs/common';

describe('RestaurantService', () => {
  let service: RestaurantService;
  let dataSource: any;
  let restaurantRepo: any;
  let categoryRepo: any;

  const mockEntityManager = {
    withRepository: jest.fn().mockImplementation((repo) => repo),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(async (cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const mockRestaurantRepo = { save: jest.fn(), findByIdOrThrow: jest.fn() };
    const mockCategoryRepo = { findByIdOrThrow: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: RestaurantRepository, useValue: mockRestaurantRepo },
        { provide: CategoryRepository, useValue: mockCategoryRepo },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
    dataSource = module.get(DataSource);
    restaurantRepo = module.get(RestaurantRepository);
    categoryRepo = module.get(CategoryRepository);
  });

  describe('createRestaurant', () => {
    const owner = { id: 'owner-1', role: Role.OWNER } as User;
    const dto: any = {
      categoryId: 'cat-1',
      toEntity: jest.fn().mockReturnValue({}),
    };

    it('점주가 식당을 생성하면 트랜잭션을 통해 저장되어야 한다', async () => {
      categoryRepo.findByIdOrThrow.mockResolvedValue({ id: 'cat-1' });
      restaurantRepo.save.mockResolvedValue({ id: 'rest-1' });

      await service.createRestaurant(owner, dto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(restaurantRepo.save).toHaveBeenCalled();
    });

    it('점주가 아니면 에러를 던져야 한다', async () => {
      const client = { role: Role.CLIENT } as User;
      await expect(service.createRestaurant(client, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
