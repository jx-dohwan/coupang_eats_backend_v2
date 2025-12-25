import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RestaurantRepository } from './repository/restaurant.repository';
import { CategoryRepository } from '../category/repository/category.repository';
import { User } from '../../entities/user/user.entity';
import { Role } from '../../entities/user/user.interface';
import { PaginationRequest } from '../../common/pagination/pagination.request';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { DataSource } from 'typeorm';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly restaurantRepository: RestaurantRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  /**
   * 식당 생성 (점주 전용)
   */
  async createRestaurant(owner: User, dto: CreateRestaurantDto) {
    if (owner.role !== Role.OWNER) {
      throw new UnauthorizedException('Only owners can create restaurants');
    }

    // [2] 트랜잭션 시작
    return await this.dataSource.transaction(async (manager) => {
      // [3] 트랜잭션용 레포지토리 획득 (매우 중요)
      const trCategoryRepo = manager.withRepository(this.categoryRepository);
      const trRestaurantRepo = manager.withRepository(
        this.restaurantRepository,
      );

      const category = await trCategoryRepo.findByIdOrThrow(dto.categoryId);

      const restaurant = dto.toEntity(owner.id);
      restaurant.category = category;

      return await trRestaurantRepo.save(restaurant);
    });
  }

  /**
   * 식당 정보 수정(점주 전용)
   */
  async updateRestaurant(
    owner: User,
    restaurantId: string,
    dto: UpdateRestaurantDto,
  ) {
    // 1. 식당 조회(존재 여부 확인)
    const restaurant =
      await this.restaurantRepository.findByIdOrThrow(restaurantId);

    // 2. 소유권 확인(내 식당이 맞는지)
    if (restaurant.ownerId !== owner.id) {
      throw new ForbiddenException('You are not the owner of this restaurant');
    }

    // 3. 카테고리 변경 시, 실제 존재하는 카테고리인지 검증
    if (dto.categoryId) {
      await this.categoryRepository.findByIdOrThrow(dto.categoryId);
    }

    // 4. 병합 및 저장
    const updateRestaurant = this.restaurantRepository.create({
      ...restaurant,
      ...dto,
    });

    return this.restaurantRepository.save(updateRestaurant);
  }

  /**
   * 내 식당 목록 조회 (점주 대시보드 용)
   */
  async getMyRestaurants(owner: User) {
    return this.restaurantRepository.findMany({ ownerId: owner.id });
  }

  /**
   * 전체 식당 목록 조회 (손님용 - 페이지네이션 & 카테고리 필터)
   */
  async getRestaurants(pagination: PaginationRequest, categoryId?: string) {
    // categoryId가 있으면 필터 조건에 추가, 없으면 빈 객체
    const filter = categoryId ? { categoryId } : {};

    return this.restaurantRepository.paginate(pagination, filter);
  }

  /**
   * 식당 상세 조회 (메뉴 포함)
   */
  async getRestaurantById(id: string) {
    // 메뉴와 카테고리 정보를 Join해서 가져옴
    return this.restaurantRepository.findOneWithOmitNotJoinedPropsOrThrow(
      { id },
      { dishes: true, category: true },
    );
  }
}
