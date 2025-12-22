import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DishService } from './dish.service';
import { AccessTokenGuard } from '../../core/guard/accessToken.guard';
import { RolesGuard } from '../../core/guard/roles.guard';
import { Roles } from '../../core/decorator/roles.decorator';
import { Role } from '../../entities/user/user.interface';
import { CurrentUser } from '../../core/decorator/currentUser.decorator';
import { User } from '../../entities/user/user.entity';
import { CreateDishDto } from './dto/create-dish.dto';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiDocCreated,
  ApiDocOk,
} from '../../core/decorator/swagger.decorator';
import { DishEntity } from '../../entities/dish/dish.entity';
import { CoreOutput } from '../../common/dto/core.output';
import { AwsS3Service } from '../../core/aws/aws-s3.service';

@ApiTags('Dish (메뉴)')
@Controller()
export class DishController {
  constructor(
    private readonly dishService: DishService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  /**
   * 메뉴 생성
   * URL: POST /restaurants/:restaurantId/dishes
   * 점주만 가능하며, Service 내부에서 본인 식당인지 한 번 더 체크함
   */
  @ApiDocCreated('메뉴 생성', DishEntity)
  @Post('restaurants/:restaurantId/dishes')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.OWNER)
  @UseInterceptors(FileInterceptor('image'))
  async createDish(
    @CurrentUser() owner: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() createDishDto: CreateDishDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const uploadUrl = await this.awsS3Service.uploadImage('dish', file);
      createDishDto.photo = uploadUrl;
    }
    return this.dishService.createDish(owner, restaurantId, createDishDto);
  }

  /**
   * 메뉴 삭제
   * URL: DELETE /dishes/:id
   */
  @ApiDocOk('메뉴 삭제', CoreOutput)
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
