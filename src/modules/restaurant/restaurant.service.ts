import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RestaurantRepository } from './repository/restaurant.repository';
import { CategoryRepository } from '../category/repository/category.repository';
import { User } from '../../entities/user/user.entity';
import { Role } from '../../entities/user/user.interface';
import { PaginationRequest } from '../../common/pagination/pagination.request';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CategoryEntity } from '../../entities/category/category.entity';
import { RestaurantEntity } from '../../entities/restaurant/restaurant.entity';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly restaurantRepository: RestaurantRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  /**
   * 식당 생성 (점주 전용)
   */
  @Transactional()
  async createRestaurant(owner: User, dto: CreateRestaurantDto) {
    if (owner.role !== Role.OWNER) {
      throw new UnauthorizedException('Only owners can create restaurants');
    }

    // 트랜잭션 안에서 그냥 평소처럼 repo 사용
    const category = await this.categoryRepository.findOneByFilters({
      id: dto.categoryId,
    });

    if (!category) {
      throw new NotFoundException(`don't exist ${dto.categoryId}`);
    }

    const restaurant = dto.toEntity(owner.id);
    restaurant.category = category;

    return this.restaurantRepository.save(restaurant);
  }

  /**
   * 식당 정보 수정(점주 전용)
   */
  @Transactional()
  async updateRestaurant(
    owner: User,
    restaurantId: string,
    dto: UpdateRestaurantDto,
  ) {
    const restaurant =
      await this.restaurantRepository.findByIdOrThrow(restaurantId);

    if (restaurant.ownerId !== owner.id) {
      throw new ForbiddenException('You are not the owner of this restaurant');
    }

    if (dto.categoryId) {
      await this.categoryRepository.findByIdOrThrow(dto.categoryId);
    }

    const updated = this.restaurantRepository.create({
      ...restaurant,
      ...dto,
    });

    return this.restaurantRepository.save(updated);
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
