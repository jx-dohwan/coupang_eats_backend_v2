import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RestaurantService } from './restaurant.service';
import { AccessTokenGuard } from '../../core/guard/accessToken.guard';
import { RolesGuard } from '../../core/guard/roles.guard';
import { Role } from '../../entities/user/user.interface';
import { CurrentUser } from '../../core/decorator/currentUser.decorator';
import { User } from '../../entities/user/user.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { Roles } from '../../core/decorator/roles.decorator';
import { Public } from '../../core/decorator/public.decorator';
import { PaginationRequest } from '../../common/pagination/pagination.request';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiDocCreated,
  ApiDocOk,
} from '../../core/decorator/swagger.decorator';
import { RestaurantEntity } from '../../entities/restaurant/restaurant.entity';
import { RestaurantPaginationResponse } from './dto/restaurant-pagination.response';
import { AwsS3Service } from '../../core/aws/aws-s3.service';

@ApiTags('Restaurant (식당)')
@Controller('restaurants')
export class RestaurantController {
  constructor(
    private readonly restaurantService: RestaurantService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  /**
   * 식당 생성 (점주 전용)
   * 1. AccessTokenGuard: 로그인 확인
   * 2. RolesGuard: Owner인지 확인
   */
  
  @ApiDocCreated('식당 생성', RestaurantEntity)
  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.OWNER)
  @UseInterceptors(FileInterceptor('image'))
  async createRestaurant(
    @CurrentUser() owner: User,
    @Body() createRestaurantDto: CreateRestaurantDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const uploadUrl = await this.awsS3Service.uploadImage('restaurant', file);
      createRestaurantDto.coverImg = uploadUrl; // DTO에 URL 주입
    }

    return this.restaurantService.createRestaurant(owner, createRestaurantDto);
  }

  /**
   * 내 식당 목록 조회(점주 전용)
   */
  @ApiDocOk('내 식당 목록 조회', [RestaurantEntity])
  @Get('my')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.OWNER)
  async getMyRestaurants(@CurrentUser() owner: User) {
    return this.restaurantService.getMyRestaurants(owner);
  }

  /**
   * 식당 상세 조회 (메뉴 포함) - 누구나 가능
   */
  @ApiDocOk('식당 상세 조회', RestaurantEntity)
  @Public()
  @Get(':id')
  async getRestaurantById(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantService.getRestaurantById(id);
  }

  /**
   * 전체 식당 조회 (검색 및 필터) - 누구나 가능
   */
  @ApiDocOk('전체 식당 조회 (페이지네이션)', RestaurantPaginationResponse)
  @Public()
  @Get()
  async getRestaurants(
    @Query() pagination: PaginationRequest,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.restaurantService.getRestaurants(pagination, categoryId);
  }
}
