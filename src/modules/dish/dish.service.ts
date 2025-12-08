import { ForbiddenException, Injectable } from '@nestjs/common';
import { DishRepository } from './repository/dish.repository';
import { RestaurantRepository } from '../restaurant/repository/restaurant.repository';
import { CreateDishDto } from './dto/create-dish.dto';
import { User } from '../../entities/user/user.entity';

@Injectable()
export class DishService {
  constructor(
    private readonly dishRepository: DishRepository,
    private readonly restaurantRepository: RestaurantRepository,
  ) {}

  /**
   * 메뉴 생성
   */
  async createDish(owner: User, restaurantId: string, dto: CreateDishDto) {
    // 1. 식당 찾기 (없으면 에러)
    const restaurant =
      await this.restaurantRepository.findByIdOrThrow(restaurantId);

    // 2. 소유권 확인 (본인 식당인지)
    if (restaurant.ownerId !== owner.id) {
      throw new ForbiddenException('You are not the owner of this restaurant');
    }

    // 3. 메뉴 생성 및 저장
    const dish = this.dishRepository.create({
      ...dto,
      restaurantId,
    });

    return this.dishRepository.save(dish);
  }

  /**
   * 메뉴 삭제
   */
  async deleteDish(owner: User, dishId: string) {
    // 1. 메뉴와 식당 정보를 함께 조회(소유권 확인을 위해)
    const dish = await this.dishRepository.findOneWithOmitNotJoinedPropsOrThrow(
      { id: dishId },
      { restaurant: true },
    );

    // 2. 소유권 확인
    if (dish.restaurant.ownerId !== owner.id) {
      throw new ForbiddenException('You cannot delete this dish');
    }

    // 3. 삭제
    await this.dishRepository.softDelete(dishId);

    return { success: true };
  }
}
