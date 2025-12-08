import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RestaurantRepository } from './repository/restaurant.repository';
import { CategoryRepository } from '../category/repository/category.repository';
import { User } from '../../entities/user/user.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { Role } from '../../entities/user/user.interface';
import { PaginationRequest } from '../../common/pagination/pagination.request';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly restaurantRepository: RestaurantRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  /**
   * 식당 생성 (점주 전용)
   */

  async createRestaurant(owner: User, dto: CreateRestaurantDto) {
    // 1. 권한 확인 (UserRole이 Owner인지)
    if (owner.role !== Role.OWNER) {
      throw new UnauthorizedException('Only owners can create restaurants');
    }

    // 2. 카테고리 존재 여부 확인(없으면 404 에러 자동 발생)
    const category = await this.categoryRepository.findByIdOrThrow(
      dto.categoryId,
    );

    // 3. 식당 객체 생성 및 저장
    // ownerId는 관계 설정을 위해 명시적으로 넣어준다.
    const restaurant = this.restaurantRepository.create({
      ...dto,
      id: owner.id,
      category,
    });

    return this.restaurantRepository.save(restaurant);
  }

  /**
   * 내 식당 목록 조회 (점주 대시보드 용)
   */
  async getMyRestaurants(owner: User) {
    return this.restaurantRepository.findMany({ id: owner.id });
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
