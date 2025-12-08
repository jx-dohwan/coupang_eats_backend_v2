import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DishService } from './dish.service';
import { AccessTokenGuard } from '../../core/guard/accessToken.guard';
import { RolesGuard } from '../../core/guard/roles.guard';
import { Roles } from '../../core/decorator/roles.decorator';
import { Role } from '../../entities/user/user.interface';
import { CurrentUser } from '../../core/decorator/currentUser.decorator';
import { User } from '../../entities/user/user.entity';
import { CreateDishDto } from './dto/create-dish.dto';

@Controller()
export class DishController {
  constructor(private readonly dishService: DishService) {}

  /**
   * 메뉴 생성
   * URL: POST /restaurants/:restaurantId/dishes
   * 점주만 가능하며, Service 내부에서 본인 식당인지 한 번 더 체크함
   */
  @Post('restaurants/:restaurantId/dishes')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.OWNER)
  async createDish(
    @CurrentUser() owner: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() createDishDto: CreateDishDto,
  ) {
    return this.dishService.createDish(owner, restaurantId, createDishDto);
  }

  /**
   * 메뉴 삭제
   * URL: DELETE /dishes/:id
   */
  @Delete('dishes/:id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.OWNER)
  async deleteDish(
    @CurrentUser() owner: User,
    @Param('id', ParseUUIDPipe) dishId: string,
  ) {
    return this.dishService.deleteDish(owner, dishId);
  }
}
